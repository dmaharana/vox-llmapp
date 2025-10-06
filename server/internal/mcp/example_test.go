package mcp

import (
	"encoding/json"
	"testing"
	"time"
)

// TestMCPTypes tests the basic MCP type serialization
func TestMCPTypes(t *testing.T) {
	// Test MCPConfig serialization
	config := MCPConfig{
		Name:    "test-server",
		Command: "uvx",
		Args:    []string{"test-mcp-server@latest"},
		Env: map[string]string{
			"TEST_ENV": "value",
		},
		Disabled: false,
	}

	data, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("Failed to marshal MCPConfig: %v", err)
	}

	var unmarshaled MCPConfig
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal MCPConfig: %v", err)
	}

	if unmarshaled.Name != config.Name {
		t.Errorf("Expected name %s, got %s", config.Name, unmarshaled.Name)
	}
}

// TestMCPConnection tests the connection status structure
func TestMCPConnection(t *testing.T) {
	conn := MCPConnection{
		Name:   "test-connection",
		Status: "connected",
		Tools: []Tool{
			{
				Name:        "test-tool",
				Description: "A test tool",
				InputSchema: ToolSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": "Test input",
						},
					},
					Required: []string{"input"},
				},
			},
		},
		Prompts: []Prompt{
			{
				Name:        "test-prompt",
				Description: "A test prompt",
				Arguments: []PromptArgument{
					{
						Name:        "arg1",
						Description: "Test argument",
						Required:    true,
					},
				},
			},
		},
		ConnectedAt: time.Now(),
	}

	data, err := json.Marshal(conn)
	if err != nil {
		t.Fatalf("Failed to marshal MCPConnection: %v", err)
	}

	var unmarshaled MCPConnection
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal MCPConnection: %v", err)
	}

	if unmarshaled.Name != conn.Name {
		t.Errorf("Expected name %s, got %s", conn.Name, unmarshaled.Name)
	}

	if len(unmarshaled.Tools) != 1 {
		t.Errorf("Expected 1 tool, got %d", len(unmarshaled.Tools))
	}

	if len(unmarshaled.Prompts) != 1 {
		t.Errorf("Expected 1 prompt, got %d", len(unmarshaled.Prompts))
	}
}

// TestMCPManager tests the basic manager functionality
func TestMCPManager(t *testing.T) {
	manager := NewMCPManager()
	
	if manager == nil {
		t.Fatal("Expected non-nil manager")
	}

	// Note: GetConnectionStatus now requires an *http.Request parameter
	// This test is simplified and doesn't test the full functionality
	// For full testing, use integration tests with actual HTTP requests
	
	if manager.clients == nil {
		t.Error("Expected non-nil clients map")
	}
	
	if manager.userConfigs == nil {
		t.Error("Expected non-nil userConfigs map")
	}
}

// TestJSONRPCTypes tests the JSON-RPC message types
func TestJSONRPCTypes(t *testing.T) {
	// Test request
	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params: InitializeParams{
			ProtocolVersion: "2024-11-05",
			Capabilities: ClientCapabilities{
				Roots: &RootsCapability{
					ListChanged: true,
				},
			},
			ClientInfo: ClientInfo{
				Name:    "test-client",
				Version: "1.0.0",
			},
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal JSONRPCRequest: %v", err)
	}

	var unmarshaled JSONRPCRequest
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal JSONRPCRequest: %v", err)
	}

	if unmarshaled.JSONRPC != "2.0" {
		t.Errorf("Expected JSONRPC 2.0, got %s", unmarshaled.JSONRPC)
	}

	if unmarshaled.Method != "initialize" {
		t.Errorf("Expected method initialize, got %s", unmarshaled.Method)
	}
}