package llmapp

import (
	"crypto/tls"
	"errors"
	"fmt"
	"os"
)

func loadPEMCertificate(certPath, keyPath string) (*tls.Certificate, error) {
	if certPath == "" || keyPath == "" {
		return nil, errors.New("certificate or key path is empty")
	}

	certData, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate file: %w", err)
	}

	keyData, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key file: %w", err)
	}

	cert, err := tls.X509KeyPair(certData, keyData)
	if err != nil {
		return nil, fmt.Errorf("failed to load certificate: %w", err)
	}

	return &cert, nil
}
