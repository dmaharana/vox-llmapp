package llmapp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"llmserver/internal/prompts"
	"log"
	"net/http"
)

var (
	client = &http.Client{}
)

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

	// Refine short queries
	if reqPayload.Prompt == "" {
		app.errorJSON(w, err)
		return
	}

	if len(reqPayload.ChatMessages) > 0 {
		reqPayload.Prompt = refineShortQuery(reqPayload.Prompt)
		log.Printf("Processed question: %s", reqPayload.Prompt)
	}

	log.Printf("Payload: %+v", reqPayload)

	// responses := []string{}

	// ollama request body
	var llmRequest RequestData
	llmRequest.Model = reqPayload.Model

	// ollama request options
	var requestOptions RequestOptions
	// if request payload has temperature, stream, and numcontext, then set them
	if reqPayload.Temperature != 0 {
		requestOptions.Temperature = reqPayload.Temperature
	} else {
		requestOptions.Temperature = defaultTemperature
	}
	if reqPayload.Stream {
		llmRequest.Stream = reqPayload.Stream
	}
	if reqPayload.NumContext != 0 {
		requestOptions.NumContext = reqPayload.NumContext
	} else {
		requestOptions.NumContext = defaultNumContext
	}
	if reqPayload.Raw {
		llmRequest.Raw = reqPayload.Raw
	}

	// set default values for rest of the options
	requestOptions.NumKeep = defaultNumKeep
	requestOptions.Seed = defaultSeed

	// set options
	llmRequest.Options = requestOptions

	// if includehistory is true, then set messages
	if reqPayload.IncludeHistory {
		llmRequest.Messages = createMessages(reqPayload)
	} else {
		llmRequest.Prompt = reqPayload.Prompt
	}

	// if includehistory is false and systemprompt is not empty, then prepend it to the prompt
	if !reqPayload.IncludeHistory && reqPayload.SystemPrompt != "" {
		llmRequest.Prompt = reqPayload.SystemPrompt + "\n" + reqPayload.Prompt
	}

	jsonData, err := json.Marshal(llmRequest)
	if err != nil {
		app.errorJSON(w, err)
		return
	}

	log.Printf("Sending request: %s", string(jsonData))

	apiEndpoint := provider_url + genApi
	if reqPayload.IncludeHistory {
		apiEndpoint = provider_url + chatApi
	}
	log.Printf("Sending request to: %s", apiEndpoint)

	// Create a context with a cancellation option
	token := app.randomString(tokenLength)
	ctx, cancel := context.WithCancel(r.Context())

	app.TokenToCtxMutex.Lock()
	app.ContextMap[token] = cancel
	app.TokenToCtxMutex.Unlock()

	defer cancel()

	log.Printf("Token: %s", token)
	log.Printf("Context map: %+v", app.ContextMap)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiEndpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	defer res.Body.Close()

	log.Printf("Status code: %d", res.StatusCode)

	if res.StatusCode != http.StatusOK {
		app.errorJSON(w, fmt.Errorf("(%d) %s: Not able to process request with the selected model", res.StatusCode, http.StatusText(res.StatusCode)))
		return
	}

	// read response
	if reqPayload.Stream {
		app.readStream(w, res, token, reqPayload)
	} else {
		app.readPostResponse(w, res)
	}

	// Delete the context from the map
	app.TokenToCtxMutex.Lock()
	delete(app.ContextMap, token)
	app.TokenToCtxMutex.Unlock()
}

// read streaming response
func (app *Config) readStream(w http.ResponseWriter, res *http.Response, token string, reqPayload RequestPayload) {
	log.Printf("Reading stream")

	ws := w.(http.Flusher)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	reader := bufio.NewReader(res.Body)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			app.errorJSON(w, err)
			return
		}

		var llmRes ResponseData
		err = json.Unmarshal(line, &llmRes)
		if err != nil {
			app.errorJSON(w, err)
			return
		}

		if reqPayload.IncludeHistory {
			llmRes.Response = llmRes.Message.Content
		}

		// log.Printf("Response: %s", llmRes.Response)

		llmRes.CancelToken = token
		app.writeJSON(w, http.StatusOK, llmRes)

		ws.Flush()
	}
}

// read POST response
func (app *Config) readPostResponse(w http.ResponseWriter, res *http.Response) {
	log.Printf("Reading post response")
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	log.Printf("Body: %s", string(body))

	// read into json
	resData := ResponseData{}
	err = json.Unmarshal(body, &resData)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	app.writeJSON(w, http.StatusOK, resData)
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

	// get provider from path
	provider := r.URL.Query().Get("provider")
	log.Printf("Provider: %s", provider)

	// get query parameter provider_url
	providerUrl := r.URL.Query().Get("provider_url")
	log.Printf("Provider URL: %s", providerUrl)

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
	log.Printf("Provider Base URL: %s", providerBaseUrl)
	modelURL := fmt.Sprintf(ProviderModelURLs[provider], providerBaseUrl)
	log.Printf("Model URL: %s", modelURL)

	// get bearer token
	bearerToken := r.Header.Get(AuthorizationHeader)
	if bearerToken == "" && provider != "ollama" {
		app.errorJSON(w, fmt.Errorf("bearer token not found"))
		return
	}

	log.Printf("Bearer token: %s", bearerToken)

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
		providerModels = append(providerModels, model.ID)
	}

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
	messages = append(messages, Message{
		Role:    "system",
		Content: payload.SystemPrompt,
	})

	for _, c := range payload.ChatMessages {
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

	// get session data
	// sessionData := r.Context().Value(sessionDataKey).(*Config)
	// log.Printf("Session data: %+v", sessionData)

	app.TokenToCtxMutex.Lock()
	defer app.TokenToCtxMutex.Unlock()

	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	log.Printf("Cancel token: %s", r.URL.Query().Get(qToken))

	if r.URL.Query().Get(qToken) == "" {
		jsonresp.Error = true
		jsonresp.Message = "request not found"
		app.writeJSON(w, http.StatusOK, jsonresp)
		return
	}

	log.Printf("Context map: %+v", app.ContextMap)

	// token := chi.URLParam(r, "token")
	token := r.URL.Query().Get(qToken)
	log.Printf("Token: %s", token)
	cancel := app.ContextMap[token]
	if cancel != nil {
		log.Printf("Canceling context for token: %s", token)
		cancel()
		delete(app.ContextMap, token)

		jsonresp.Message = "request cancelled"
		app.writeJSON(w, http.StatusOK, jsonresp)
	} else {
		log.Printf("No context found for token: %s", token)
		jsonresp.Error = true
		jsonresp.Message = "request not found"
		app.writeJSON(w, http.StatusOK, jsonresp)
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