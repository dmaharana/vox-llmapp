package main

import (
	"context"
	"llmserver/appenv"
	"log"
	"sync"

	"github.com/go-chi/chi/v5"
)

const (
	genApi  = "/api/generate"
	chatApi = "/api/chat"
	tagApi  = "/api/tags"
	model   = "llama3:latest"
)

var (
	url     = "http://localhost:11434"
	webPort = "8011"
)

type Config struct {
	Mux             *chi.Mux
	WebPort         string
	LlmUrl          string
	ContextMap      map[string]context.CancelFunc
	TokenToCtxMutex *sync.Mutex
}

func main() {
	// withUserInput()
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	appEnv, err := appenv.ReadConfig()
	if err == nil {
		url = appEnv.LlmUrl
		webPort = appEnv.AppPort
	}

	c := Config{
		WebPort:         webPort,
		LlmUrl:          url,
		ContextMap:      make(map[string]context.CancelFunc),
		TokenToCtxMutex: &sync.Mutex{},
	}

	err = c.startServer()
	if err != nil {
		log.Fatal(err)
	}

}
