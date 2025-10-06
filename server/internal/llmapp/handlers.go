package llmapp

import (
	"context"
	"encoding/json"
	"fmt"
	"llmserver/internal/prompts"
	"log"
	"net/http"
	"strings"
	"time"
)

// var (
// 	client = &http.Client{}
// )

const (
	tokenLength    = 32
	qToken         = "token"
	cancelTokenKey = "cancelToken"
	minQueryLength = 20 // Minimum length before we refine the query

	provider_url = "http://localhost:11434/v1"
)

// refineShortQuery enhances short user queries to get better responses
func refineShortQuery(query string) string {
	if len(query) >= minQueryLength {
		return query
	}
	return fmt.Sprintf("Please provide a detailed response to: \"%s\". "+
		"Expand on the topic with relevant information and examples.", query)
}

func (app *Config) ChatResponse(w http.ResponseWriter, r *http.Request) {
	// request payload from client
	var reqPayload RequestPayload
	err := app.readJSON(w, r, &reqPayload)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	log.Printf("Request payload: %+v", reqPayload)

	log.Printf("Received model: %s", reqPayload.Model)
	log.Printf("Original question: %s", reqPayload.Prompt)

	// turn off streaming if tools are used
	if len(reqPayload.Tools) > 0 {
		reqPayload.Stream = false
	}

	// Validate payload
	if reqPayload.Prompt == "" {
		app.errorJSON(w, fmt.Errorf("prompt cannot be empty"))
		return
	}

	// Validate provider
	providerId := strings.ToLower(reqPayload.ProviderName)
	if providerId == "" {
		app.errorJSON(w, fmt.Errorf("provider name cannot be empty"))
		return
	}

	log.Printf("Chat messages: %+v", reqPayload.ChatMessages)
	log.Printf("Payload: %+v", reqPayload)

	// get api key from header
	apiKey := r.Header.Get(AuthorizationHeader)
	if apiKey == "" && providerId != "ollama" {
		app.errorJSON(w, fmt.Errorf("api key not found"))
		return
	}

	// Generate token for cancellation
	token := app.randomString(tokenLength)
	log.Printf("Generated token: %s", token)

	// Create buffered channels for worker communication
	responseChan := make(chan LLMResponse, 100) // Larger buffer for streaming responses
	errorChan := make(chan error, 1)
	cancelChan := make(chan bool, 1)

	// Create request context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	log.Printf("Request received: %+v", reqPayload)
	log.Printf("API Key: %s", apiKey)
	log.Printf("Token: %s", token)
	log.Printf("Response Channel: %+v", responseChan)
	log.Printf("Error Channel: %+v", errorChan)
	log.Printf("Cancel Channel: %+v", cancelChan)
	log.Printf("Cancel Token: %s", token)

	// Create LLM request
	llmRequest := LLMRequest{
		ID:             token,
		RequestPayload: reqPayload,
		APIKey:         apiKey,
		ResponseChan:   responseChan,
		ErrorChan:      errorChan,
		CancelChan:     cancelChan,
		CancelToken:    token,
		MCPManager:     app.MCPManager, // This should not be nil
	}
	log.Printf("Created LLM request with token: %s", token)

	// Submit request to worker pool
	app.WorkerPool.SubmitRequest(llmRequest)

	// Create a channel to track if cancellation has already occurred
	cancelled := make(chan struct{})

	// Store cancellation function that also cancels the worker request
	cancelFunc := func() {
		// Try to close cancelled channel - if already closed, cancellation already happened
		select {
		case <-cancelled:
			return // Already cancelled
		default:
			close(cancelled)
		}

		// Signal the worker to cancel the request if channel is still open
		select {
		case cancelChan <- true:
			log.Printf("Cancellation signal sent for request %s", token)
		default:
			// Channel either full or closed, which is fine as request may be done
			log.Printf("Skipping cancellation signal for request %s (already cancelled or completed)", token)
		}
		cancel()
	}

	app.TokenToCtxMutex.Lock()
	app.ContextMap[token] = cancelFunc
	app.TokenToCtxMutex.Unlock()

	defer func() {
		cancelFunc()
		app.TokenToCtxMutex.Lock()
		delete(app.ContextMap, token)
		app.TokenToCtxMutex.Unlock()
	}()

	// Handle response based on streaming mode
	if reqPayload.Stream {
		app.handleStreamResponse(w, r, responseChan, errorChan, ctx, token)
	} else {
		app.handleNonStreamResponse(w, responseChan, errorChan, ctx, token, reqPayload)
	}
}

// HandleToolCallResponse handles user confirmation/declination of tool calls
func (app *Config) HandleToolCallResponse(w http.ResponseWriter, r *http.Request) {
	var toolCallResponse struct {
		CancelToken string     `json:"cancelToken"`
		Confirmed   bool       `json:"confirmed"`
		ToolCalls   []ToolCall `json:"toolCalls"`
	}

	err := app.readJSON(w, r, &toolCallResponse)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	if toolCallResponse.CancelToken == "" {
		app.errorJSON(w, fmt.Errorf("cancel token is required"))
		return
	}

	log.Printf("Received tool call response for token %s: confirmed=%v, toolCalls=%+v",
		toolCallResponse.CancelToken, toolCallResponse.Confirmed, toolCallResponse.ToolCalls)

	// Look up the original request context
	app.TokenToCtxMutex.Lock()
	cancelFunc, exists := app.ContextMap[toolCallResponse.CancelToken]
	app.TokenToCtxMutex.Unlock()

	if !exists {
		app.errorJSON(w, fmt.Errorf("invalid cancel token"))
		return
	}

	if toolCallResponse.Confirmed {
		// Execute the tool calls
		app.executeToolCalls(w, toolCallResponse.CancelToken, toolCallResponse.ToolCalls)
	} else {
		// User declined - send cancellation
		cancelFunc()
		app.writeJSON(w, http.StatusOK, map[string]string{"status": "declined"})
	}
}

// handleStreamResponse processes streaming responses from worker
func (app *Config) handleStreamResponse(w http.ResponseWriter, r *http.Request, responseChan chan LLMResponse, errorChan chan error, ctx context.Context, token string) {
	log.Printf("Handling stream response")

	flusher, ok := w.(http.Flusher)
	if !ok {
		app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "streaming_not_supported", "Streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable buffering in Nginx

	// Send cancel token as the first event
	cancelTokenData, _ := json.Marshal(map[string]string{"cancelToken": token})
	fmt.Fprintf(w, "data: %s\n\n", string(cancelTokenData))
	flusher.Flush()

	for {
		select {
		case response, ok := <-responseChan:
			if !ok {
				log.Printf("Response channel closed unexpectedly")
				app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "channel_closed", "Response channel closed unexpectedly")
				return
			}

			log.Printf("Response: %+v", response)
			if response.Error != nil {
				log.Printf("Error: %+v", response.Error)
				// Send error response with proper structure
				app.sendErrorResponse(w, http.StatusBadRequest, response.Error.Type, response.Error.Code, response.Error.Message)
				flusher.Flush()
				return
			}

			// Send response chunk to client in SSE format
			// Check if the client has disconnected
			select {
			case <-ctx.Done():
				log.Printf("Client disconnected, stopping stream")
				return
			default:
			}
			jsonData, err := json.Marshal(response.Data)
			if err != nil {
				log.Printf("Error marshaling response: %v", err)
				return
			}

			// Write in SSE format
			fmt.Fprintf(w, "data: %s\n\n", string(jsonData))
			flusher.Flush()

			log.Printf("Sent SSE data: %s", string(jsonData))

			if response.IsComplete {
				log.Printf("Stream completed successfully")
				// Send completion signal in SSE format
				fmt.Fprintf(w, "data: [DONE]\n\n")
				flusher.Flush()
				return
			}

		case err := <-errorChan:
			if err != nil {
				log.Printf("Error from worker: %v", err)
				app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "worker_error", err.Error())
				flusher.Flush()
			}
			return

		case <-ctx.Done():
			log.Printf("Stream cancelled by context: %v", ctx.Err())
			app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "request_cancelled", "Request cancelled or timed out")
			flusher.Flush()
			return
		}
	}
}

// handleNonStreamResponse processes non-streaming responses from worker
func (app *Config) handleNonStreamResponse(w http.ResponseWriter, responseChan chan LLMResponse, errorChan chan error, ctx context.Context, token string, reqPayload RequestPayload) {
	log.Printf("Handling non-stream response")

	// Add timeout for non-streaming responses
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	select {
	case response, ok := <-responseChan:
		if !ok {
			app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "channel_closed", "Response channel closed unexpectedly")
			return
		}

		if response.Error != nil {
			// Send error response with proper structure
			app.sendErrorResponse(w, http.StatusBadRequest, response.Error.Type, response.Error.Code, response.Error.Message)
			return
		}

		log.Printf("Writing response data: %+v", response.Data)
		// For non-streaming responses, include the cancel token in the response
		response.Data.CancelToken = token
	if err := app.writeJSON(w, http.StatusOK, response.Data); err != nil {
			log.Printf("Error writing response: %v", err)
			app.sendErrorResponse(w, http.StatusInternalServerError, "server_error", "write_error", fmt.Sprintf("Failed to write response: %v", err))
			return
		}

	case err := <-errorChan:
		if err != nil {
			log.Printf("Error from worker: %v", err)
			app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "worker_error", err.Error())
			return
		}

	case <-timeoutCtx.Done():
		log.Printf("Request timed out")
		app.sendErrorResponse(w, http.StatusGatewayTimeout, "server_error", "timeout", "Request timed out after 30 seconds")

	case <-ctx.Done():
		log.Printf("Request cancelled by client: %v", ctx.Err())
		app.sendErrorResponse(w, http.StatusBadRequest, "server_error", "request_cancelled", "Request cancelled by client")
	}
}

// handle model list get
func (app *Config) GetModels(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	// call the tag list endpoint
	res, err := http.Get(provider_url + tagApi)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	defer res.Body.Close()
	var models Models
	err = json.NewDecoder(res.Body).Decode(&models)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	jsonresp.Data = models

	app.writeJSON(w, http.StatusOK, jsonresp)
}

// handle get openai complaint model list
func (app *Config) GetOpenAIModels(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	client := &http.Client{}

	// get provider from path
	provider := r.URL.Query().Get("provider")
	log.Printf("Provider: %s", provider)

	// get query parameter provider_url
	providerUrl := r.URL.Query().Get("provider_url")

	// if providerUrl empty, then get from llmapp ProviderURL
	if providerUrl == "" {
		_, ok := ProviderURLs[provider]
		if !ok {
			app.errorJSON(w, fmt.Errorf("provider %s not found", provider))
			return
		}

		providerUrl = ProviderURLs[provider]
	}

	// modelURL
	_, ok := ProviderModelURLs[provider]
	if !ok {
		app.errorJSON(w, fmt.Errorf("provider %s not found", provider))
		return
	}

	// get provider base url, extract from providerUrl
	providerBaseUrl, err := getBaseURL(providerUrl)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	modelURL := fmt.Sprintf(ProviderModelURLs[provider], providerBaseUrl)

	// get bearer token
	bearerToken := r.Header.Get(AuthorizationHeader)
	if bearerToken == "" && provider != "ollama" {
		app.errorJSON(w, fmt.Errorf("bearer token not found"))
		return
	}

	// call the tag list endpoint
	req, err := http.NewRequest("GET", modelURL, nil)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", bearerToken))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	defer res.Body.Close()
	var models OpenAIModels
	err = json.NewDecoder(res.Body).Decode(&models)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	providerModels := []string{}
	for _, model := range models.Data {
		modelID := model.ID
		// Remove "model/" prefix for gemini provider
		if provider == "gemini" && strings.HasPrefix(modelID, "models/") {
			modelID = strings.TrimPrefix(modelID, "models/")
		}
		providerModels = append(providerModels, modelID)
	}

	log.Printf("Models: %+v", providerModels)

	jsonresp.Data = providerModels

	app.writeJSON(w, http.StatusOK, jsonresp)
}

func (app *Config) GetSystemPrompts(w http.ResponseWriter, r *http.Request) {
	var prompt struct {
		Prompts []prompts.Prompt `json:"prompts"`
	}

	log.Println("Prompts file:", app.PromptsFile)
	data := prompts.GetPrompts(app.PromptsFile)
	prompt.Prompts = data

	app.writeJSON(w, http.StatusOK, prompt)
}

func createMessages(payload RequestPayload) []Message {
	log.Printf("Creating messages: %+v", payload)
	var messages []Message

	// skip if system prompt is empty
	if payload.SystemPrompt != "" {
		messages = append(messages, Message{
			Role:    "system",
			Content: payload.SystemPrompt,
		})
	}

	for _, c := range payload.ChatMessages {
		if c.Prompt == "" || c.Response == "" {
			continue
		}
		messages = append(messages, Message{
			Role:    "user",
			Content: c.Prompt,
		})
		messages = append(messages, Message{
			Role:    "assistant",
			Content: c.Response,
		})
	}

	messages = append(messages, Message{
		Role:    "user",
		Content: payload.Prompt,
	})

	return messages
}

// handle cancel request
func (app *Config) CancelRequest(w http.ResponseWriter, r *http.Request) {
	log.Println("Received cancel request")

	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	token := r.URL.Query().Get(qToken)
	log.Printf("Cancel token: %s", token)

	if token == "" {
		jsonresp.Error = true
		jsonresp.Message = "token not provided"
		app.writeJSON(w, http.StatusBadRequest, jsonresp)
		return
	}

	app.TokenToCtxMutex.Lock()
	cancelFunc := app.ContextMap[token]
	app.TokenToCtxMutex.Unlock()

	if cancelFunc != nil {
		log.Printf("Canceling request for token: %s", token)
		cancelFunc() // This will trigger both context cancellation and worker cancellation

		jsonresp.Message = "request cancelled successfully"
		app.writeJSON(w, http.StatusOK, jsonresp)
	} else {
		log.Printf("No active request found for token: %s", token)
		jsonresp.Error = true
		jsonresp.Message = "request not found or already completed"
		app.writeJSON(w, http.StatusNotFound, jsonresp)
	}
}

func (app *Config) GetSupportedProviders(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	jsonresp.Data = SupportedProviders

	app.writeJSON(w, http.StatusOK, jsonresp)
}

func (app *Config) GetDefaultProvider(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	defaultProvider := SupportedProvider{}
	for _, provider := range SupportedProviders {
		if provider.ProviderId == DefaultProvider {
			defaultProvider = provider
			break
		}
	}

	jsonresp.Data = defaultProvider

	app.writeJSON(w, http.StatusOK, jsonresp)
}

// GetWorkerPoolStatus returns the current status of the worker pool
func (app *Config) GetWorkerPoolStatus(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	status := map[string]any{
		"workers":        app.WorkerPool.Workers,
		"queueSize":      app.WorkerPool.GetQueueSize(),
		"activeRequests": len(app.ContextMap),
	}

	jsonresp.Data = status

	app.writeJSON(w, http.StatusOK, jsonresp)
}

// TestChatResponse is a simple test endpoint to verify worker functionality
func (app *Config) TestChatResponse(w http.ResponseWriter, r *http.Request) {
	log.Printf("Test chat endpoint called")

	// Simple test request
	testRequest := RequestPayload{
		Model:        "qwen3:0.6b",
		Prompt:       "Hello, this is a test",
		Stream:       true,
		ProviderName: "ollama",
		SystemPrompt: "You are a helpful assistant.",
	}

	// Generate token
	token := app.randomString(32)

	// Create channels
	responseChan := make(chan LLMResponse, 100)
	errorChan := make(chan error, 1)
	cancelChan := make(chan bool, 1)

	// Create LLM request
	llmRequest := LLMRequest{
		ID:             token,
		RequestPayload: testRequest,
		APIKey:         "",
		ResponseChan:   responseChan,
		ErrorChan:      errorChan,
		CancelChan:     cancelChan,
		CancelToken:    token,
		MCPManager:     app.MCPManager, // Should not be nil
	}

	log.Printf("Submitting test request to worker pool")
	app.WorkerPool.SubmitRequest(llmRequest)

	// Set up streaming response
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Process responses
	for {
		select {
		case response, ok := <-responseChan:
			if !ok {
				log.Printf("Response channel closed")
				return
			}

			log.Printf("Test response received: %+v", response)

			if response.Error != nil {
				log.Printf("Test error: %+v", response.Error)
				fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", response.Error.Message)
				flusher.Flush()
				return
			}

			if response.Data.Response != "" {
				fmt.Fprintf(w, "data: {\"response\": \"%s\"}\n\n", response.Data.Response)
				flusher.Flush()
			}

			if response.IsComplete {
				log.Printf("Test stream completed")
				fmt.Fprintf(w, "data: [DONE]\n\n")
				flusher.Flush()
				return
			}

		case err := <-errorChan:
			log.Printf("Test error from worker: %v", err)
			fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", err.Error())
			flusher.Flush()
			return

		case <-time.After(30 * time.Second):
			log.Printf("Test timeout")
			fmt.Fprintf(w, "data: {\"error\": \"timeout\"}\n\n")
			flusher.Flush()
			return
		}
	}
}

// executeToolCalls executes the confirmed tool calls and returns the results
func (app *Config) executeToolCalls(w http.ResponseWriter, cancelToken string, toolCalls []ToolCall) {
	log.Printf("Executing tool calls for token %s: %+v", cancelToken, toolCalls)

	// Execute each tool call
	var toolResults []string
	for _, toolCall := range toolCalls {
		if app.MCPManager != nil {
			// Find the first connected MCP client that has this tool
			connectedClients := app.MCPManager.GetConnectedClients()
			for _, client := range connectedClients {
				// Call the tool
				args, ok := toolCall.Function.Arguments.(map[string]interface{})
				if !ok {
					log.Printf("Error: toolCall.Function.Arguments is not a map[string]interface{}")
					toolResults = append(toolResults, fmt.Sprintf("Error: invalid arguments for tool %s", toolCall.Function.Name))
					continue
				}
				result, err := client.CallTool(toolCall.Function.Name, args)
				if err != nil {
					log.Printf("Error calling tool %s: %v", toolCall.Function.Name, err)
					toolResults = append(toolResults, fmt.Sprintf("Error with tool %s: %v", toolCall.Function.Name, err))
					continue
				}

				// Process the tool result
				for _, content := range result.Content {
					toolResults = append(toolResults, content.Text)
				}
			}
		}
	}

	// Send the tool results back to the LLM
	combinedResult := strings.Join(toolResults, "\n")
	app.writeJSON(w, http.StatusOK, map[string]string{
		"status": "executed",
		"result": combinedResult,
	})
}
