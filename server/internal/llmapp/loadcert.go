package llmapp

import (
	"crypto/tls"
	"os"
)

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
