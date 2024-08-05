package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"os"
)

func (c *Config) startServer() error {
	cert, err := loadPEMCertificate(certPath, keyPath)
	if err != nil {
		log.Println("Error loading PEM certificate and key:", err)
		log.Println("Starting HTTP server...")
		return c.startHTTPServer()
	} else {
		log.Println("Starting HTTPS server...")
		return c.startHTTPSServer(cert)
	}

}

func loadPEMCertificate(certPath, keyPath string) (*tls.Certificate, error) {
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
