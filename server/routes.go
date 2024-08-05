package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

const (
	certPath = "./sslcerts/nginx.crt"
	keyPath  = "./sslcerts/nginx.key"
	buildDir = "dist"
	// buildDir = "build"
	// buildDir = "static/ui/dist"
)

//go:embed dist
var buildFS embed.FS

func (c *Config) routes() http.Handler {
	mux := chi.NewRouter()
	mux.Use(middleware.RequestID)
	mux.Use(middleware.RealIP)
	mux.Use(middleware.Logger)
	mux.Use(middleware.Recoverer)

	// specify who is allowed to connect to our API service
	mux.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	mux.Use(middleware.Heartbeat("/ping"))

	// create a subdirectory to serve the embedded files
	staticFilesSubDir, err := fs.Sub(buildFS, buildDir)
	if err != nil {
		log.Fatalf("Error creating subdirectory: %v", err)
	} else {
		log.Println("Subdirectory created successfully")
		mux.Handle("/*", http.StripPrefix("/", http.FileServer(http.FS(staticFilesSubDir))))
	}

	mux.Post("/api/chat", c.ChatResponse)
	mux.Get("/api/models", c.GetModels)

	c.Mux = mux
	return mux
}