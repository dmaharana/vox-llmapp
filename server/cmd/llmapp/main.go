package main

import (
	"context"
	"log"
	"sync"

	"llmserver/internal/llmapp"
	appenv "llmserver/internal/llmapp/config"
)

var (
	url     = "http://localhost:11434"
	webPort = "8011"
)

func main() {
	// withUserInput()
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	appEnv, err := appenv.ReadConfig()
	if err == nil {
		url = appEnv.LlmUrl
		webPort = appEnv.AppPort
	}

	c := llmapp.Config{
		WebPort:         webPort,
		LlmUrl:          url,
		ContextMap:      make(map[string]context.CancelFunc),
		TokenToCtxMutex: &sync.Mutex{},
		PromptsFile:     appEnv.PromptsFile,
	}

	err = c.StartServer()
	if err != nil {
		log.Fatal(err)
	}

}
