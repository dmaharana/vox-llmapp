package llmapp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"net/http"
	"strings"
	"time"
)

// NewLLMWorkerPool creates a new worker pool
func NewLLMWorkerPool(workers int) *LLMWorkerPool {
	return &LLMWorkerPool{
		RequestChan: make(chan LLMRequest, 100), // Buffered channel for requests
		Workers:     workers,
		QuitChan:    make(chan bool),
	}
}

// Start initializes and starts the worker pool
func (pool *LLMWorkerPool) Start() {
	log.Printf("Starting LLM worker pool with %d workers", pool.Workers)

	for i := range pool.Workers {
		go pool.worker(i)
	}
}

// Stop gracefully shuts down the worker pool
func (pool *LLMWorkerPool) Stop() {
	log.Println("Stopping LLM worker pool")
	// Signal all workers to stop
	close(pool.QuitChan)

	// Wait a moment for workers to finish current requests
	time.Sleep(100 * time.Millisecond)

	// Safely close request channel
	select {
	case <-pool.RequestChan:
		// Drain any remaining requests
	default:
	}
	close(pool.RequestChan)
}

// worker processes LLM requests
func (pool *LLMWorkerPool) worker(id int) {
	log.Printf("Worker %d started", id)

	for {
		select {
		case request, ok := <-pool.RequestChan:
			if !ok {
				log.Printf("Worker %d stopping (request channel closed)", id)
				return
			}
			log.Printf("Worker %d processing request %s", id, request.ID)
			// Process request in a separate goroutine to allow for cancellation
			go func(req LLMRequest) {
				pool.processRequest(req)
			}(request)
		case <-pool.QuitChan:
			log.Printf("Worker %d stopping (quit signal received)", id)
			return
		}
	}
}

// processRequest handles the actual LLM communication
func (pool *LLMWorkerPool) processRequest(request LLMRequest) {
	// Create a context with cancellation for this request
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle cancellation signals
	go func() {
		select {
		case <-request.CancelChan:
			log.Printf("Request %s cancelled, cleaning up", request.ID)
			cancel()
		case <-ctx.Done():
			return
		}
	}()

	reqPayload := request.RequestPayload
	providerId := strings.ToLower(reqPayload.ProviderName)

	client := &http.Client{
		Timeout: 30 * time.Minute, // Increased to 30 minutes for very long conversations
		Transport: &http.Transport{
			ResponseHeaderTimeout: 5 * time.Minute,  // Increased to 5 minutes
			IdleConnTimeout:       10 * time.Minute, // Increased to 10 minutes
			DisableKeepAlives:     false,
			MaxIdleConnsPerHost:   100,
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			TLSHandshakeTimeout:   30 * time.Second,
			ExpectContinueTimeout: 5 * time.Second,
		},
	}

	log.Printf("Processing model: %s with provider: %s", reqPayload.Model, providerId)
	log.Printf("Original question: %s", reqPayload.Prompt)

	// Refine short queries if needed
	if reqPayload.Prompt == "" {
		request.ErrorChan <- fmt.Errorf("prompt cannot be empty")
		return
	}

	if len(reqPayload.ChatMessages) == 0 {
		reqPayload.Prompt = refineShortQuery(reqPayload.Prompt)
		log.Printf("Processed question: %s", reqPayload.Prompt)
	}

	// Build LLM request
	llmRequest := buildLLMRequest(reqPayload)

	log.Printf("LLM Request: %+v", llmRequest)

	jsonData, err := json.Marshal(llmRequest)
	if err != nil {
		select {
		case request.ErrorChan <- err:
		default:
			log.Printf("Error channel closed or blocked for request %s: %v", request.ID, err)
		}
		return
	}

	log.Printf("Sending request: %s", string(jsonData))

	// Get provider URL
	providerBaseUrl := ProviderURLs[providerId]
	if providerBaseUrl == "" {
		request.ErrorChan <- fmt.Errorf("provider %s not found", reqPayload.ProviderName)
		return
	}

	// Build API endpoint
	apiEndpoint := fmt.Sprintf(ProviderGenerateURLs[providerId], providerBaseUrl)
	if reqPayload.IncludeHistory {
		apiEndpoint = fmt.Sprintf(ProviderChatURLs[providerId], providerBaseUrl)
	}
	log.Printf("Sending request to: %s", apiEndpoint)

	// Validate API key
	if request.APIKey == "" && providerId != "ollama" {
		request.ErrorChan <- fmt.Errorf("api key not found")
		return
	}

	// Create HTTP request with context that can be cancelled
	ctx, cancel = context.WithCancel(context.Background())
	defer cancel()

	// Start a goroutine to listen for cancellation
	go func() {
		select {
		case <-request.CancelChan:
			log.Printf("Request %s cancelled during processing", request.ID)
			cancel()
		case <-ctx.Done():
			// Context already cancelled
		}
	}()

	log.Println("Creating request")
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiEndpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		request.ErrorChan <- err
		return
	}

	req.Header.Set("Content-Type", "application/json")
	if request.APIKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", request.APIKey))
	}

	log.Println("Executing request")
	// Execute request with context
	res, err := client.Do(req.WithContext(ctx))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		select {
		case request.ErrorChan <- err:
		default:
			log.Printf("Could not send error on channel for request %s: %v", request.ID, err)
		}
		return
	}
	defer res.Body.Close()

	log.Printf("Status code: %d", res.StatusCode)

	if res.StatusCode != http.StatusOK {
		request.ErrorChan <- fmt.Errorf("(%d) %s: Not able to process request with the selected model", res.StatusCode, http.StatusText(res.StatusCode))
		return
	}

	// Process response based on streaming mode
	if reqPayload.Stream {
		pool.processStreamResponse(res, request)
	} else {
		pool.processNonStreamResponse(res, request)
	}
}

// processStreamResponse handles streaming responses
func (pool *LLMWorkerPool) processStreamResponse(res *http.Response, request LLMRequest) {
	log.Printf("Entering processStreamResponse for request %s", request.ID)

	reader := bufio.NewReader(res.Body)
	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Handle cancellation in a separate goroutine
	go func() {
		select {
		case <-request.CancelChan:
			log.Printf("Stream cancelled for request %s", request.ID)
			cancel()
		case <-ctx.Done():
			if ctx.Err() == context.DeadlineExceeded {
				log.Printf("Context timeout exceeded for request %s", request.ID)
			}
			return
		}
	}()

	// Create a timer for handling gaps in responses with increased duration
	gapTimer := time.NewTimer(60 * time.Second) // Increased to 60 seconds
	defer gapTimer.Stop()

	noDataCount := 0
	maxEmptyResponses := 8 // Increased to allow more gaps
	retryCount := 0
	maxRetries := 8 // Increased retry attempts
	lastDataTime := time.Now()

	for {
		select {
		case <-ctx.Done():
			log.Printf("Stream processing stopped for request %s: %v", request.ID, ctx.Err())
			return
		case <-gapTimer.C:
			timeSinceLastData := time.Since(lastDataTime)
			log.Printf("Gap timer triggered for request %s. Time since last data: %v, Empty response count: %d/%d",
				request.ID, timeSinceLastData, noDataCount, maxEmptyResponses)

			if noDataCount >= maxEmptyResponses {
				log.Printf("No data received for extended period (%v) for request %s, completing",
					timeSinceLastData, request.ID)
				request.ResponseChan <- LLMResponse{
					ID:         request.ID,
					IsStream:   true,
					IsComplete: true,
				}
				return
			}
			noDataCount++
			gapTimer.Reset(60 * time.Second)
		default:
			// Continue with normal processing
			line, err := reader.ReadBytes('\n')
			if err != nil {
				if err == io.EOF {
					timeSinceLastData := time.Since(lastDataTime)
					log.Printf("EOF received for request %s. Time since last data: %v", request.ID, timeSinceLastData)
					// On EOF, wait longer for more data
					time.Sleep(500 * time.Millisecond)
					continue
				}

				// Handle timeout and network errors more gracefully
				if isTemporaryError(err) && retryCount < maxRetries {
					timeSinceLastData := time.Since(lastDataTime)
					log.Printf("Temporary error for request %s: %v. Time since last data: %v",
						request.ID, err, timeSinceLastData)
					retryCount++
					// Increased backoff time with jitter
					backoffDuration := time.Duration(retryCount*3) * time.Second
					jitter := time.Duration(rand.Int63n(1000)) * time.Millisecond
					backoffDuration += jitter
					log.Printf("Waiting %v before retry attempt %d/%d for request %s",
						backoffDuration, retryCount, maxRetries, request.ID)
					time.Sleep(backoffDuration)
					continue
				}

				log.Printf("Error reading stream for request %s: %v", request.ID, err)
				if retryCount >= maxRetries {
					log.Printf("Max retries (%d) reached for request %s", maxRetries, request.ID)
				}
				request.ErrorChan <- fmt.Errorf("stream error after %d retries: %v", retryCount, err)
				return
			}

			// Reset counters on successful read
			lastDataTime = time.Now()
			retryCount = 0
			gapTimer.Reset(60 * time.Second)
			noDataCount = 0

			if string(line) == "data: [DONE]\n" {
				log.Printf("Received intermediate DONE signal for request %s, waiting for potential additional streams...", request.ID)
				// Instead of exiting, reset the gap timer and continue waiting
				gapTimer.Reset(60 * time.Second)
				noDataCount = 0
				lastDataTime = time.Now()

				// Send a completion signal but don't exit
				request.ResponseChan <- LLMResponse{
					ID:         request.ID,
					IsStream:   true,
					IsComplete: true,
				}
				continue // Continue listening for more data
			}

			// Check if line contains "data:" prefix
			if bytes.HasPrefix(line, []byte("data: ")) {
				// Split at "data:" and take the second portion as content
				line = bytes.TrimPrefix(line, []byte("data: "))
			} else {
				continue
			}

			var llmRes ResponseData
			var sResp StreamChatCompletionResponse
			err = json.Unmarshal(line, &sResp)
			if err != nil {
				log.Printf("Error parsing response for request %s: %v", request.ID, err)
				// If we get an error after DONE, it might be a new stream starting
				if strings.Contains(err.Error(), "unexpected end of JSON input") {
					log.Printf("Possible new stream starting for request %s, continuing...", request.ID)
					continue
				}
				request.ErrorChan <- err
				return
			}

			llmRes.Model = sResp.Model
			llmRes.Response = sResp.Choices[0].Delta.Content
			llmRes.CancelToken = request.CancelToken

			// Send response chunk through channel with safety check
			select {
			case request.ResponseChan <- LLMResponse{
				ID:         request.ID,
				Data:       llmRes,
				IsStream:   true,
				IsComplete: false, // Never mark as complete here to keep stream open
			}:
				log.Printf("Successfully sent chunk for request %s", request.ID)
			default:
				log.Printf("Response channel closed or blocked for request %s", request.ID)
				return
			}

			// Don't exit on llmRes.Done, keep listening for more streams
			if llmRes.Done {
				log.Printf("Stream segment completed for request %s, waiting for potential additional streams...", request.ID)
				continue
			}
		}
	}
}

// isTemporaryError checks if an error is temporary/retriable
func isTemporaryError(err error) bool {
	if err == nil {
		return false
	}

	// Check for timeout errors
	if err.Error() == "context deadline exceeded" {
		return true
	}

	// Check for network errors that may be temporary
	if netErr, ok := err.(net.Error); ok {
		return netErr.Temporary()
	}

	// Check for specific error strings that indicate temporary issues
	errStr := err.Error()
	temporaryErrors := []string{
		"connection reset by peer",
		"broken pipe",
		"i/o timeout",
		"read: connection reset",
		"use of closed network connection",
	}

	for _, tempErr := range temporaryErrors {
		if strings.Contains(strings.ToLower(errStr), tempErr) {
			return true
		}
	}

	return false
}

// processNonStreamResponse handles non-streaming responses
func (pool *LLMWorkerPool) processNonStreamResponse(res *http.Response, request LLMRequest) {
	body, err := io.ReadAll(res.Body)
	if err != nil {
		request.ErrorChan <- err
		return
	}

	log.Printf("Body: %s", string(body))

	var resData ResponseData
	err = json.Unmarshal(body, &resData)
	if err != nil {
		request.ErrorChan <- err
		return
	}

	resData.CancelToken = request.CancelToken

	log.Printf("Response data: %+vresData", resData)

	// if chat then choices will have the value
	if len(resData.Choices) > 0 {
		resData.Response = resData.Choices[0].Message.Content
	}

	// Send complete response through channel with safety check
	select {
	case request.ResponseChan <- LLMResponse{
		ID:         request.ID,
		Data:       resData,
		IsStream:   false,
		IsComplete: true,
	}:
	default:
		log.Printf("Response channel closed or blocked for request %s", request.ID)
		return
	}
}

// buildLLMRequest constructs the LLM request from the payload
func buildLLMRequest(reqPayload RequestPayload) RequestData {
	var llmRequest RequestData
	llmRequest.Model = reqPayload.Model

	// Set request options
	var requestOptions RequestOptions
	if reqPayload.Temperature != 0 {
		requestOptions.Temperature = reqPayload.Temperature
	} else {
		requestOptions.Temperature = defaultTemperature
	}

	// if reqPayload.NumContext != 0 {
	// 	requestOptions.NumContext = reqPayload.NumContext
	// } else {
	// 	requestOptions.NumContext = defaultNumContext
	// }

	if reqPayload.Stream {
		llmRequest.Stream = reqPayload.Stream
		providerId := strings.ToLower(reqPayload.ProviderName)
		if providerId == "openrouter" {
			llmRequest.Stream = false
		}
	}

	// if reqPayload.Raw {
	// 	llmRequest.Raw = reqPayload.Raw
	// }

	llmRequest.Raw = true

	// Set default values
	requestOptions.NumKeep = defaultNumKeep
	requestOptions.Seed = defaultSeed
	llmRequest.Options = requestOptions

	// Set messages or prompt
	if reqPayload.IncludeHistory {
		llmRequest.Messages = createMessages(reqPayload)
	} else {
		llmRequest.Prompt = reqPayload.Prompt
		if reqPayload.SystemPrompt != "" {
			llmRequest.Prompt = reqPayload.SystemPrompt + "\n" + reqPayload.Prompt
		}
	}

	return llmRequest
}

// SubmitRequest submits a request to the worker pool
func (pool *LLMWorkerPool) SubmitRequest(request LLMRequest) {
	// Try to submit the request with a timeout
	select {
	case pool.RequestChan <- request:
		log.Printf("Request %s submitted to worker pool", request.ID)
		return
	case <-time.After(5 * time.Second):
		log.Printf("Request %s timed out while submitting to worker pool", request.ID)
	}

	// If we get here, submission failed - send error if possible
	select {
	case request.ErrorChan <- fmt.Errorf("worker pool is busy, please try again later"):
		log.Printf("Request %s rejected due to timeout", request.ID)
	default:
		log.Printf("Failed to send error for request %s (error channel closed or full)", request.ID)
	}
}

// GetQueueSize returns the current queue size
func (pool *LLMWorkerPool) GetQueueSize() int {
	return len(pool.RequestChan)
}

// CancelRequest cancels a specific request by ID
func (pool *LLMWorkerPool) CancelRequest(requestID string, cancelChan chan bool) {
	select {
	case cancelChan <- true:
		log.Printf("Cancellation signal sent for request %s", requestID)
	default:
		log.Printf("Failed to send cancellation signal for request %s (channel full or closed)", requestID)
	}
}
