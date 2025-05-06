package llmapp

import (
	"context"
	"crypto/tls"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sync"

	ui "llmserver"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Config struct {
	Mux             *chi.Mux
	WebPort         string
	LlmUrl          string
	PromptsFile     string
	ContextMap      map[string]context.CancelFunc
	TokenToCtxMutex *sync.Mutex
}

const (
	certPath       = "./configs/sslcerts/nginx.crt"
	keyPath        = "./configs/sslcerts/nginx.key"
	buildDir       = "dist"
	sessionDataKey = "sessionData"
)

const (
	genApi  = "/api/generate"
	chatApi = "/api/chat"
	tagApi  = "/api/tags"
	model   = "llama3:latest"
)

func (c *Config) routes() http.Handler {
	mux := chi.NewRouter()
	mux.Use(middleware.RequestID)
	mux.Use(middleware.RealIP)
	mux.Use(middleware.Logger)
	mux.Use(middleware.Recoverer)

	mux.Use(c.sessionMiddleware)

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
	staticFilesSubDir, err := fs.Sub(ui.BuildFS, buildDir)
	if err != nil {
		log.Fatalf("Error creating subdirectory: %v", err)
	} else {
		log.Println("Subdirectory created successfully")
		mux.Handle("/*", http.StripPrefix("/", http.FileServer(http.FS(staticFilesSubDir))))
	}

	mux.Get("/api/prompts", c.GetSystemPrompts)
	mux.Get("/api/models", c.GetOpenAIModels)
	mux.Post("/api/chat", c.ChatResponse)
	mux.Delete("/api/cancel", c.CancelRequest)

	c.Mux = mux
	return mux
}

func (c *Config) sessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Do stuff here
		ctx := context.WithValue(r.Context(), sessionDataKey, c)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (c *Config) StartServer() error {
	cert, err := c.loadPEMCertificate(certPath, keyPath)
	if err != nil {
		log.Println("Error loading PEM certificate and key:", err)
		log.Println("Starting HTTP server...")
		return c.startHTTPServer()
	} else {
		log.Println("Starting HTTPS server...")
		return c.startHTTPSServer(cert)
	}
}

func (c *Config) loadPEMCertificate(certPath, keyPath string) (*tls.Certificate, error) {
	certData, err := os.ReadFile(certPath)
	if err != nil {
		return nil, err
	}

	keyData, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, err
	}

	cert, err := tls.X509KeyPair(certData, keyData)
	if err != nil {
		return nil, err
	}

	return &cert, nil
}

func (c *Config) startHTTPSServer(cert *tls.Certificate) error {
	// Create the HTTPS server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", c.WebPort),
		Handler: c.routes(),
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{*cert},
		},
	}

	// Start the HTTPS server
	log.Printf("Starting HTTPS server on :%s", c.WebPort)
	err := server.ListenAndServeTLS("", "")
	if err != nil {
		log.Println("Error starting HTTPS server:", err)
	}

	return err
}

func (c *Config) startHTTPServer() error {
	// Create the HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", c.WebPort),
		Handler: c.routes(),
	}

	// Start the HTTP server
	log.Printf("Starting HTTP server on :%s", c.WebPort)
	err := server.ListenAndServe()
	if err != nil {
		log.Println("Error starting HTTP server:", err)
	}

	return err
}
