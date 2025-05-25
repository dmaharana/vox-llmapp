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

	log.Printf("Received model: %s", reqPayload.Model)
	log.Printf("Original question: %s", reqPayload.Prompt)

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
	log.Printf("Token: %s", token)

	// Create buffered channels for worker communication
	responseChan := make(chan LLMResponse, 100) // Larger buffer for streaming responses
	errorChan := make(chan error, 1)
	cancelChan := make(chan bool, 1)

	// Ensure channels are properly closed when handler exits
	defer func() {
		close(responseChan)
		close(errorChan)
		// cancelChan is closed by the worker
	}()

	// Create request context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	// Create LLM request
	llmRequest := LLMRequest{
		ID:             token,
		RequestPayload: reqPayload,
		APIKey:         apiKey,
		ResponseChan:   responseChan,
		ErrorChan:      errorChan,
		CancelChan:     cancelChan,
		CancelToken:    token,
	}

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
		app.handleStreamResponse(w, responseChan, errorChan, ctx)
	} else {
		app.handleNonStreamResponse(w, responseChan, errorChan, ctx)
	}
}

// handleStreamResponse processes streaming responses from worker
func (app *Config) handleStreamResponse(w http.ResponseWriter, responseChan chan LLMResponse, errorChan chan error, ctx context.Context) {
	log.Printf("Handling stream response")

	flusher, ok := w.(http.Flusher)
	if !ok {
		select {
		case errorChan <- fmt.Errorf("streaming not supported"):
		default:
			log.Printf("Error channel closed or blocked while sending streaming error")
		}
		app.errorJSON(w, fmt.Errorf("streaming not supported"))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable buffering in Nginx

	// Create error channel for goroutine communication
	streamErrChan := make(chan error, 1)
	defer close(streamErrChan)

	// Start response processing in a goroutine
	go func() {
		for {
			select {
			case response, ok := <-responseChan:
				if !ok {
					log.Printf("Response channel closed")
					select {
					case streamErrChan <- fmt.Errorf("response channel closed unexpectedly"):
					default:
						log.Printf("Stream error channel closed or blocked")
					}
					return
				}

				if response.Error != nil {
					select {
					case streamErrChan <- response.Error:
					default:
						log.Printf("Stream error channel closed or blocked")
					}
					return
				}

				// Send response chunk to client
				err := app.writeJSON(w, http.StatusOK, response.Data)
				if err != nil {
					streamErrChan <- err
					return
				}
				flusher.Flush()

				if response.IsComplete {
					log.Printf("Stream completed successfully")
					select {
					case streamErrChan <- err:
					default:
						log.Printf("Stream error channel closed or blocked")
					}
					return
				}

			case err := <-errorChan:
				if err != nil {
					select {
					case streamErrChan <- err:
					default:
						log.Printf("Stream error channel closed or blocked")
					}
				}
				return

			case <-ctx.Done():
				log.Printf("Stream cancelled by context")
				streamErrChan <- ctx.Err()
				return
			}
		}
	}()

	// Wait for completion or error
	select {
	case err := <-streamErrChan:
		if err != nil && err != context.Canceled {
			app.errorJSON(w, err)
		}
	case <-ctx.Done():
		log.Printf("Stream context cancelled")
	}
}

// handleNonStreamResponse processes non-streaming responses from worker
func (app *Config) handleNonStreamResponse(w http.ResponseWriter, responseChan chan LLMResponse, errorChan chan error, ctx context.Context) {
	log.Printf("Handling non-stream response")

	// Add timeout for non-streaming responses
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Create error channel for internal errors
	internalErrChan := make(chan error, 1)
	defer close(internalErrChan)

	select {
	case response, ok := <-responseChan:
		if !ok {
			err := fmt.Errorf("response channel closed unexpectedly")
			log.Printf("Response error: %v", err)
			app.errorJSON(w, err)
			return
		}

		if response.Error != nil {
			log.Printf("Response error: %v", response.Error)
			app.errorJSON(w, response.Error)
			return
		}

		if err := app.writeJSON(w, http.StatusOK, response.Data); err != nil {
			log.Printf("Error writing response: %v", err)
			app.errorJSON(w, fmt.Errorf("error writing response: %v", err))
			return
		}

	case err := <-errorChan:
		if err != nil {
			log.Printf("Error from worker: %v", err)
			app.errorJSON(w, err)
			return
		}

	case <-timeoutCtx.Done():
		log.Printf("Request timed out")
		app.errorJSON(w, fmt.Errorf("request timed out after 30 seconds"))

	case <-ctx.Done():
		log.Printf("Request cancelled by client")
		app.errorJSON(w, fmt.Errorf("request cancelled by client"))
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
