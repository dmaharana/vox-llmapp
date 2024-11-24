package main

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
)

var (
	client = &http.Client{}
)

const (
	tokenLength    = 32
	qToken         = "token"
	cancelTokenKey = "cancelToken"
)

func (app *Config) ChatResponse(w http.ResponseWriter, r *http.Request) {
	var reqPayload RequestPayload
	err := app.readJSON(w, r, &reqPayload)
	if err != nil {
		app.errorJSON(w, err)
		return
	}
	var finalRes ResponseData
	finalRes.Response = reqPayload.Prompt

	log.Printf("Received model: %s", reqPayload.Model)
	log.Printf("Received question: %s", reqPayload.Prompt)
	log.Printf("Payload: %+v", reqPayload)

	responses := []string{}

	var llmRequest RequestData
	llmRequest.Model = reqPayload.Model

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

	apiEndpoint := url + genApi
	if reqPayload.IncludeHistory {
		apiEndpoint = url + chatApi
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
			responses = append(responses, llmRes.Message.Content)
			llmRes.Response = llmRes.Message.Content
		} else {
			responses = append(responses, llmRes.Response)
		}

		finalRes.Response = strings.Join(responses, "")

		// log.Printf("Response: %s", llmRes.Response)

		llmRes.CancelToken = token
		app.writeJSON(w, http.StatusOK, llmRes)

		ws.Flush()
	}

	// Delete the context from the map
	app.TokenToCtxMutex.Lock()
	delete(app.ContextMap, token)
	app.TokenToCtxMutex.Unlock()
}

// handle model list get
func (app *Config) GetModels(w http.ResponseWriter, r *http.Request) {
	jsonresp := jsonResponse{
		Error:   false,
		Message: "success",
	}

	// call the tag list endpoint
	res, err := http.Get(url + tagApi)
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
		jsonresp.Error = true
		jsonresp.Message = "request not found"
		app.writeJSON(w, http.StatusOK, jsonresp)
	}

}
