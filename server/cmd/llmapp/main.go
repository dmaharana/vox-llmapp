package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"llmserver/internal/llmapp"
	appenv "llmserver/internal/llmapp/config"
)

var (
	url     = "http://localhost:11434"
	webPort = "8011"
)

func main() {
	// Set up logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Read configuration
	appEnv, err := appenv.ReadConfig()
	if err == nil {
		url = appEnv.LlmUrl
		webPort = appEnv.AppPort
	}

	// Create config with worker pool
	c := llmapp.NewConfig(webPort, url, appEnv.PromptsFile)

	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)

	// Create error channel for server
	errChan := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		if err := c.StartServer(); err != nil {
			errChan <- err
		}
	}()

	// Wait for shutdown signal or error
	select {
	case err := <-errChan:
		log.Printf("Server error: %v", err)
	case sig := <-sigChan:
		log.Printf("Received signal: %v", sig)
	}

	log.Println("Initiating graceful shutdown...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Close server's shutdown channel to initiate graceful shutdown
	close(c.GetShutdownChan())

	// Wait for shutdown to complete or timeout
	select {
	case <-ctx.Done():
		log.Println("Shutdown timed out")
	case <-time.After(100 * time.Millisecond):
		log.Println("Server stopped gracefully")
	}
}
