package llmapp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// NewLLMWorkerPool creates a new worker pool
func NewLLMWorkerPool(workers int) *LLMWorkerPool {
	return &LLMWorkerPool{
		Workers:     workers,
		RequestChan: make(chan LLMRequest, 100),
		QuitChan:    make(chan bool),
		workers:     make([]*LLMWorker, workers),
		wg:          &sync.WaitGroup{},
	}
}

// Start initializes and starts the worker pool
func (pool *LLMWorkerPool) Start() {
	log.Printf("Starting LLM worker pool with %d workers", pool.Workers)

	for i := 0; i < pool.Workers; i++ {
		worker := &LLMWorker{
			ID:       i,
			requests: make(chan LLMRequest, 10),
			quit:     make(chan bool),
			wg:       pool.wg,
		}
		pool.workers[i] = worker
		pool.wg.Add(1)
		go worker.start()
	}

	// Start dispatcher
	go pool.dispatch()
}

// Stop gracefully shuts down the worker pool
func (pool *LLMWorkerPool) Stop() {
	log.Println("Stopping LLM worker pool")
	
	// Signal dispatcher to stop
	close(pool.QuitChan)
	
	// Stop all workers
	for _, worker := range pool.workers {
		close(worker.quit)
	}
	
	// Wait for all workers to finish
	pool.wg.Wait()
	log.Println("All workers stopped")
}

// dispatch distributes requests to available workers
func (pool *LLMWorkerPool) dispatch() {
	for {
		select {
		case request := <-pool.RequestChan:
			log.Printf("Dispatching request %s", request.ID)
			// Find an available worker
			go pool.assignToWorker(request)
		case <-pool.QuitChan:
			log.Println("Dispatcher stopping")
			return
		}
	}
}

// assignToWorker assigns a request to an available worker
func (pool *LLMWorkerPool) assignToWorker(request LLMRequest) {
	// Try to assign to any available worker
	for _, worker := range pool.workers {
		select {
		case worker.requests <- request:
			log.Printf("Request %s assigned to worker %d", request.ID, worker.ID)
			return
		default:
			// Worker is busy, try next one
			continue
		}
	}
	
	// If no worker is available, handle the request directly
	log.Printf("All workers busy, handling request %s directly", request.ID)
	go pool.processRequest(request)
}

// start begins the worker's processing loop
func (worker *LLMWorker) start() {
	defer worker.wg.Done()
	log.Printf("Worker %d started", worker.ID)

	for {
		select {
		case request := <-worker.requests:
			log.Printf("Worker %d processing request %s", worker.ID, request.ID)
			pool := &LLMWorkerPool{} // Create a temporary pool instance for method access
			pool.processRequest(request)
		case <-worker.quit:
			log.Printf("Worker %d stopping", worker.ID)
			return
		}
	}
}

// processRequest handles the actual LLM communication
func (pool *LLMWorkerPool) processRequest(request LLMRequest) {
	log.Printf("Processing request %s", request.ID)

	// Defer closing the channels to ensure they are closed when the worker is done
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered in processRequest: %v", r)
		}
		close(request.ResponseChan)
		close(request.ErrorChan)
	}()
	
	// Create context with cancellation
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Handle cancellation
	go func() {
		select {
		case <-request.CancelChan:
			log.Printf("Request %s cancelled", request.ID)
			cancel()
		case <-ctx.Done():
			return
		}
	}()

	reqPayload := request.RequestPayload
	
	// Validate request
	if reqPayload.Prompt == "" {
		pool.sendError(request, "prompt cannot be empty", "validation_error", "empty_prompt")
		return
	}

	if reqPayload.Model == "" {
		pool.sendError(request, "model cannot be empty", "validation_error", "empty_model")
		return
	}

	providerId := strings.ToLower(reqPayload.ProviderName)
	log.Printf("Using provider: %s, model: %s", providerId, reqPayload.Model)

	// Get provider URL
	providerBaseUrl, exists := ProviderURLs[providerId]
	if !exists {
		pool.sendError(request, fmt.Sprintf("provider %s not supported", providerId), "validation_error", "unsupported_provider")
		return
	}

	// Build API endpoint
	apiEndpoint := fmt.Sprintf(ProviderChatURLs[providerId], providerBaseUrl)
	log.Printf("API endpoint: %s", apiEndpoint)

	// Build request payload
	llmRequest := pool.buildRequest(reqPayload)
	jsonData, err := json.Marshal(llmRequest)
	if err != nil {
		pool.sendError(request, fmt.Sprintf("failed to marshal request: %v", err), "server_error", "marshal_error")
		return
	}

	log.Printf("Request payload: %s", string(jsonData))

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiEndpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		pool.sendError(request, fmt.Sprintf("failed to create HTTP request: %v", err), "server_error", "http_error")
		return
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	if request.APIKey != "" && providerId != "ollama" {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", request.APIKey))
	}

	// Make HTTP request
	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(httpReq)
	if err != nil {
		pool.sendError(request, fmt.Sprintf("HTTP request failed: %v", err), "network_error", "request_failed")
		return
	}
	defer resp.Body.Close()

	log.Printf("HTTP response status: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		pool.sendError(request, fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(body)), "service_error", fmt.Sprintf("http_%d", resp.StatusCode))
		return
	}

	// Process response
	if reqPayload.Stream {
		pool.handleStreamResponse(ctx, resp, request)
	} else {
		pool.handleNonStreamResponse(resp, request)
	}
}

// handleStreamResponse processes streaming responses
func (pool *LLMWorkerPool) handleStreamResponse(ctx context.Context, resp *http.Response, request LLMRequest) {
	log.Printf("Processing stream response for request %s", request.ID)
	
	scanner := bufio.NewScanner(resp.Body)
	
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			log.Printf("Stream cancelled for request %s", request.ID)
			return
		default:
		}
		
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		log.Printf("Stream line: %s", line)

		// Handle completion
		if strings.Contains(line, "[DONE]") {
			log.Printf("Stream completed for request %s", request.ID)
			pool.sendCompletion(request)
			return
		}

		// Process data lines
		if strings.HasPrefix(line, "data: ") {
			jsonStr := strings.TrimPrefix(line, "data: ")
			jsonStr = strings.TrimSpace(jsonStr)
			
			if jsonStr == "" || jsonStr == "[DONE]" {
				continue
			}

			var streamResp StreamChatCompletionResponse
			if err := json.Unmarshal([]byte(jsonStr), &streamResp); err != nil {
				log.Printf("Failed to parse stream JSON: %v, data: %s", err, jsonStr)
				continue
			}

			// Extract content
			var content string
			if len(streamResp.Choices) > 0 {
				content = streamResp.Choices[0].Delta.Content
			}

			if content != "" {
				log.Printf("Sending content: %s", content)
				pool.sendContent(request, content, streamResp.Model)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Scanner error: %v", err)
		pool.sendError(request, fmt.Sprintf("stream error: %v", err), "stream_error", "scanner_error")
		return
	}

	// Send completion if not already sent
	pool.sendCompletion(request)
}

// handleNonStreamResponse processes non-streaming responses
func (pool *LLMWorkerPool) handleNonStreamResponse(resp *http.Response, request LLMRequest) {
	log.Printf("Processing non-stream response for request %s", request.ID)
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		pool.sendError(request, fmt.Sprintf("failed to read response: %v", err), "server_error", "read_error")
		return
	}

	log.Printf("Response body: %s", string(body))

	var chatResp ChatCompletionResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		pool.sendError(request, fmt.Sprintf("failed to parse response: %v", err), "server_error", "parse_error")
		return
	}

	// Extract content
	var content string
	if len(chatResp.Choices) > 0 {
		content = chatResp.Choices[0].Message.Content
	}

	if content != "" {
		pool.sendContent(request, content, chatResp.Model)
	}
	
	pool.sendCompletion(request)
}

// buildRequest creates the LLM request payload
func (pool *LLMWorkerPool) buildRequest(payload RequestPayload) RequestData {
	messages := []Message{}
	
	// Add system message if provided
	if payload.SystemPrompt != "" {
		messages = append(messages, Message{
			Role:    "system",
			Content: payload.SystemPrompt,
		})
	}

	// Add conversation history
	for _, msg := range payload.ChatMessages {
		if msg.Prompt != "" {
			messages = append(messages, Message{
				Role:    "user",
				Content: msg.Prompt,
			})
		}
		if msg.Response != "" {
			messages = append(messages, Message{
				Role:    "assistant",
				Content: msg.Response,
			})
		}
	}

	// Add current user message
	messages = append(messages, Message{
		Role:    "user",
		Content: payload.Prompt,
	})

	return RequestData{
		Model:       payload.Model,
		Messages:    messages,
		Stream:      payload.Stream,
		Temperature: 0.7,
	}
}

// Helper methods for sending responses
func (pool *LLMWorkerPool) sendError(request LLMRequest, message, errorType, code string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered in sendError: %v", r)
		}
	}()

	select {
	case request.ResponseChan <- LLMResponse{
		ID: request.ID,
		Error: &LLMError{
			Message: message,
			Type:    errorType,
			Code:    code,
		},
	}:
		log.Printf("Error sent for request %s: %s", request.ID, message)
	default:
		log.Printf("Failed to send error for request %s", request.ID)
	}
}

func (pool *LLMWorkerPool) sendContent(request LLMRequest, content, model string) {
	select {
	case request.ResponseChan <- LLMResponse{
		ID: request.ID,
		Data: ResponseData{
			Response:    content,
			Model:       model,
			CancelToken: request.CancelToken,
		},
		IsStream:   request.RequestPayload.Stream,
		IsComplete: false,
	}:
		log.Printf("Content sent for request %s", request.ID)
	default:
		log.Printf("Failed to send content for request %s", request.ID)
	}
}

func (pool *LLMWorkerPool) sendCompletion(request LLMRequest) {
	select {
	case request.ResponseChan <- LLMResponse{
		ID:         request.ID,
		IsStream:   request.RequestPayload.Stream,
		IsComplete: true,
	}:
		log.Printf("Completion sent for request %s", request.ID)
	default:
		log.Printf("Failed to send completion for request %s", request.ID)
	}
}

// SubmitRequest submits a request to the worker pool
func (pool *LLMWorkerPool) SubmitRequest(request LLMRequest) {
	select {
	case pool.RequestChan <- request:
		log.Printf("Request %s submitted to worker pool", request.ID)
	case <-time.After(1 * time.Second):
		log.Printf("Request %s submission timeout", request.ID)
		pool.sendError(request, "worker pool is busy", "server_error", "pool_busy")
	}
}

// GetQueueSize returns the current queue size
func (pool *LLMWorkerPool) GetQueueSize() int {
	return len(pool.RequestChan)
}
