package mcp

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
)

type MCPManager struct {
	clients    map[string]*MCPClient
	configPath string
	mu         sync.RWMutex
}

func NewMCPManager() *MCPManager {
	return &MCPManager{
		clients: make(map[string]*MCPClient),
	}
}

func NewMCPManagerWithConfig(configPath string) *MCPManager {
	return &MCPManager{
		clients:    make(map[string]*MCPClient),
		configPath: configPath,
	}
}

// RegisterMCP adds a new MCP server configuration and connects to it
func (m *MCPManager) RegisterMCP(name string, config MCPConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Disconnect existing client if it exists
	if existingClient, exists := m.clients[name]; exists {
		existingClient.Disconnect()
	}

	// Create new client
	client := NewMCPClient(name, config)
	m.clients[name] = client

	// Connect to the MCP server
	if err := client.Connect(); err != nil {
		client.connection.Status = "error"
		client.connection.LastError = err.Error()
		return fmt.Errorf("failed to connect to MCP server %s: %w", name, err)
	}

	log.Printf("Successfully registered and connected to MCP server: %s", name)
	
	// Auto-save configuration if path is set
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}
	
	return nil
}

// UpdateMCP updates an existing MCP server configuration
func (m *MCPManager) UpdateMCP(name string, config MCPConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Disconnect existing client if it exists
	if existingClient, exists := m.clients[name]; exists {
		existingClient.Disconnect()
		delete(m.clients, name)
	}

	// Create new client with updated config
	client := NewMCPClient(name, config)
	m.clients[name] = client

	// Connect to the MCP server
	if err := client.Connect(); err != nil {
		client.connection.Status = "error"
		client.connection.LastError = err.Error()
		return fmt.Errorf("failed to connect to updated MCP server %s: %w", name, err)
	}

	log.Printf("Successfully updated and reconnected to MCP server: %s", name)
	
	// Auto-save configuration if path is set
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}
	
	return nil
}

// DeregisterMCP removes an MCP server configuration and disconnects from it
func (m *MCPManager) DeregisterMCP(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, exists := m.clients[name]
	if !exists {
		return fmt.Errorf("MCP server %s not found", name)
	}

	if err := client.Disconnect(); err != nil {
		log.Printf("Error disconnecting from MCP server %s: %v", name, err)
	}

	delete(m.clients, name)
	log.Printf("Successfully deregistered MCP server: %s", name)
	
	// Auto-save configuration if path is set
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}
	
	return nil
}

// GetConnectionStatus returns the current status of all MCP connections
func (m *MCPManager) GetConnectionStatus() *MCPConnectionStatus {
	log.Printf("GetConnectionStatus: acquiring read lock")
	m.mu.RLock()
	defer func() {
		log.Printf("GetConnectionStatus: releasing read lock")
		m.mu.RUnlock()
	}()

	connections := make([]MCPConnection, 0, len(m.clients))
	allTools := make([]Tool, 0)
	allPrompts := make([]Prompt, 0)

	log.Printf("GetConnectionStatus: processing %d clients", len(m.clients))
	for name, client := range m.clients {
		if client == nil {
			log.Printf("Warning: MCP client %s is nil", name)
			continue
		}
		
		conn := client.GetConnection()
		if conn == nil {
			log.Printf("Warning: MCP client %s returned nil connection", name)
			continue
		}
		
		// Make a defensive copy to avoid any pointer issues
		connCopy := *conn
		connections = append(connections, connCopy)
		
		// Aggregate tools and prompts from all connected servers
		if conn.Status == "connected" {
			log.Printf("Aggregating tools and prompts from connected server %s: %d tools, %d prompts", name, len(conn.Tools), len(conn.Prompts))
			// Defensive copy of slices
			for _, tool := range conn.Tools {
				allTools = append(allTools, tool)
			}
			for _, prompt := range conn.Prompts {
				allPrompts = append(allPrompts, prompt)
			}
		} else {
			log.Printf("Server %s not connected (status: %s), skipping tools/prompts. Tools: %d, Prompts: %d", name, conn.Status, len(conn.Tools), len(conn.Prompts))
		}
	}

	result := &MCPConnectionStatus{
		Connections: connections,
		Tools:       allTools,
		Prompts:     allPrompts,
	}
	
	log.Printf("GetConnectionStatus: returning %d connections, %d tools, %d prompts", len(connections), len(allTools), len(allPrompts))
	return result
}

// CallTool calls a tool on the appropriate MCP server
func (m *MCPManager) CallTool(toolName string, arguments map[string]interface{}) (*CallToolResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Find which server has this tool
	for _, client := range m.clients {
		if client.connection.Status != "connected" {
			continue
		}

		for _, tool := range client.connection.Tools {
			if tool.Name == toolName {
				return client.CallTool(toolName, arguments)
			}
		}
	}

	return nil, fmt.Errorf("tool %s not found in any connected MCP server", toolName)
}

// GetPrompt gets a prompt from the appropriate MCP server
func (m *MCPManager) GetPrompt(promptName string, arguments map[string]interface{}) (*GetPromptResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Find which server has this prompt
	for _, client := range m.clients {
		if client.connection.Status != "connected" {
			continue
		}

		for _, prompt := range client.connection.Prompts {
			if prompt.Name == promptName {
				return client.GetPrompt(promptName, arguments)
			}
		}
	}

	return nil, fmt.Errorf("prompt %s not found in any connected MCP server", promptName)
}

// RefreshConnections refreshes the capabilities of all connected MCP servers
func (m *MCPManager) RefreshConnections() error {
	m.mu.RLock()
	clients := make([]*MCPClient, 0, len(m.clients))
	for _, client := range m.clients {
		clients = append(clients, client)
	}
	m.mu.RUnlock()

	var errors []string
	for _, client := range clients {
		if client.connection.Status == "connected" {
			if err := client.refreshCapabilities(); err != nil {
				errors = append(errors, fmt.Sprintf("%s: %v", client.name, err))
			}
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors refreshing connections: %v", errors)
	}

	return nil
}

// GetAllTools returns all tools from all connected MCP servers
func (m *MCPManager) GetAllTools() []Tool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allTools []Tool
	for _, client := range m.clients {
		if client.connection.Status == "connected" {
			allTools = append(allTools, client.connection.Tools...)
		}
	}

	return allTools
}

// GetAllPrompts returns all prompts from all connected MCP servers
func (m *MCPManager) GetAllPrompts() []Prompt {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allPrompts []Prompt
	for _, client := range m.clients {
		if client.connection.Status == "connected" {
			allPrompts = append(allPrompts, client.connection.Prompts...)
		}
	}

	return allPrompts
}

// Shutdown gracefully shuts down all MCP connections
func (m *MCPManager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for name, client := range m.clients {
		if err := client.Disconnect(); err != nil {
			log.Printf("Error disconnecting from MCP server %s: %v", name, err)
		}
	}

	m.clients = make(map[string]*MCPClient)
	log.Println("All MCP connections shut down")
}

// LoadFromConfig loads MCP configurations from a JSON configuration
func (m *MCPManager) LoadFromConfig(configData []byte) error {
	var config struct {
		MCPServers map[string]MCPConfig `json:"mcpServers"`
	}

	if err := json.Unmarshal(configData, &config); err != nil {
		return fmt.Errorf("failed to parse MCP configuration: %w", err)
	}

	var errors []string
	for name, mcpConfig := range config.MCPServers {
		if err := m.RegisterMCP(name, mcpConfig); err != nil {
			errors = append(errors, fmt.Sprintf("%s: %v", name, err))
			log.Printf("Failed to register MCP server %s: %v", name, err)
		}
	}

	if len(errors) > 0 {
		log.Printf("Some MCP servers failed to register: %v", errors)
	}

	return nil
}

// LoadFromFile loads MCP configurations from a JSON file
func (m *MCPManager) LoadFromFile(filePath string) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read MCP config file: %w", err)
	}

	return m.LoadFromConfig(data)
}

// SaveToFile saves current MCP configurations to a JSON file
func (m *MCPManager) SaveToFile(filePath string) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.saveToFileUnlocked(filePath)
}

// saveToFileUnlocked saves configuration without acquiring locks (internal use only)
func (m *MCPManager) saveToFileUnlocked(filePath string) error {
	// Create the config structure
	config := struct {
		MCPServers map[string]MCPConfig `json:"mcpServers"`
	}{
		MCPServers: make(map[string]MCPConfig),
	}

	// Extract configurations from clients
	for name, client := range m.clients {
		config.MCPServers[name] = client.config
	}

	// Marshal to JSON
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal MCP configuration: %w", err)
	}

	// Write to file
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write MCP config file: %w", err)
	}

	return nil
}

// saveConfig is a private method to save configuration to the configured path
// This is called from within locked contexts, so it uses the unlocked version
func (m *MCPManager) saveConfig() error {
	if m.configPath == "" {
		return nil
	}
	return m.saveToFileUnlocked(m.configPath)
}