package llmapp

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

const randomStringSource = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0987654321_+"

// jsonResponse is the type used for sending JSON around
type jsonResponse struct {
	Error   bool   `json:"error"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// readJSON tries to read the body of a request and converts it into JSON
func (app *Config) readJSON(w http.ResponseWriter, r *http.Request, data any) error {
	maxBytes := 1048576 // one megabyte
	r.Body = http.MaxBytesReader(w, r.Body, int64(maxBytes))

	dec := json.NewDecoder(r.Body)
	err := dec.Decode(data)
	if err != nil {
		return err
	}

	err = dec.Decode(&struct{}{})
	if err != io.EOF {
		return errors.New("body must have only a single json value")
	}

	return nil
}

// writeJSON takes a response status code and arbitrary data and writes a json response to the client
func (app *Config) writeJSON(w http.ResponseWriter, status int, data any, headers ...http.Header) error {
	out, err := json.Marshal(data)
	if err != nil {
		return err
	}

	if len(headers) > 0 {
		for key, value := range headers[0] {
			w.Header()[key] = value
		}
	}

	// if w doesn't have content type, set it to json
	// if it already has content type, leave it
	if ct := w.Header().Get("Content-Type"); len(ct) == 0 {
		w.Header().Set("Content-Type", "application/json")
	}
	// w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, err = w.Write(out)
	if err != nil {
		return err
	}

	return nil
}

// errorJSON takes an error, and optionally a response status code, and generates and sends
// a json error response
func (app *Config) errorJSON(w http.ResponseWriter, err error, status ...int) error {
	statusCode := http.StatusBadRequest

	if len(status) > 0 {
		statusCode = status[0]
	}

	var payload jsonResponse
	payload.Error = true
	payload.Message = err.Error()

	return app.writeJSON(w, statusCode, payload)
}

// randomString returns a random string of letters of length n
func (app *Config) randomString(n int) string {
	s, r := make([]rune, n), []rune(randomStringSource)
	for i := range s {
		p, _ := rand.Prime(rand.Reader, len(r))
		x, y := p.Uint64(), uint64(len(r))
		s[i] = r[x%y]
	}
	return string(s)
}

func getBaseURL(rawurl string) (string, error) {
	u, err := url.Parse(rawurl)
	if err != nil {
		return "", err
	}
	if u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("invalid URL: missing scheme or host in %s", rawurl)
	}
	// Combine scheme and host to get the base URL
	baseURL := fmt.Sprintf("%s://%s", u.Scheme, u.Host)
	return baseURL, nil
}

// sendErrorResponse standardizes error response handling and logging
func (app *Config) sendErrorResponse(w http.ResponseWriter, statusCode int, errType string, errCode string, message string) {
	// Log the error with all details
	log.Printf("Error Response - Status: %d, Type: %s, Code: %s, Message: %s",
		statusCode, errType, errCode, message)

	// Create and send the error response
	response := jsonResponse{
		Error:   true,
		Message: message,
		Data: map[string]string{
			"type": errType,
			"code": errCode,
		},
	}

	if err := app.writeJSON(w, statusCode, response); err != nil {
		log.Printf("Failed to write error response: %v", err)
	}
}
