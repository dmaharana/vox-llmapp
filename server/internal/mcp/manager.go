package mcp

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type MCPManager struct {
	clients    map[string]*MCPClient
	configPath string
	userConfigs map[string]map[string]*MCPConfig  // sessionID -> map of configs
	mu         sync.RWMutex
}

func NewMCPManager() *MCPManager {
	return &MCPManager{
		clients:     make(map[string]*MCPClient),
		userConfigs: make(map[string]map[string]*MCPConfig),
	}
}

func NewMCPManagerWithConfig(configPath string) *MCPManager {
	return &MCPManager{
		clients:     make(map[string]*MCPClient),
		configPath:  configPath,
		userConfigs: make(map[string]map[string]*MCPConfig),
	}
}

// registerMCPInternal adds a new MCP server configuration and connects to it (internal use without session)
func (m *MCPManager) registerMCPInternal(name string, config MCPConfig) error {
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
	
	// Save configuration if path is set (global save)
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}
	
	return nil
}

// RegisterMCP adds a new MCP server configuration and connects to it for a specific user
func (m *MCPManager) RegisterMCP(r *http.Request, name string, config MCPConfig) error {
	sessionID := m.extractSessionID(r)
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
	
	// Save user-specific configuration if path is set
	if m.configPath != "" {
		// Load existing user configs, add new one, then save
		userConfigs, _ := m.loadUserConfig(sessionID)
		userConfigs[name] = &config
		m.setUserConfigs(sessionID, userConfigs)
		if err := m.saveUserConfig(sessionID); err != nil {
			log.Printf("Warning: Failed to save user MCP configuration: %v", err)
		}
	}
	
	return nil
}

// updateMCPInternal updates an existing MCP server configuration (internal use without session)
func (m *MCPManager) updateMCPInternal(name string, config MCPConfig) error {
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
	
	// Auto-save configuration if path is set (global save)
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}

	return nil
}

// UpdateMCP updates an existing MCP server configuration for a specific user
func (m *MCPManager) UpdateMCP(r *http.Request, name string, config MCPConfig) error {
	sessionID := m.extractSessionID(r)
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
	
	// Update user-specific configuration if path is set
	if m.configPath != "" {
		// Load existing user configs, update the one, then save
		userConfigs, _ := m.loadUserConfig(sessionID)
		userConfigs[name] = &config
		m.setUserConfigs(sessionID, userConfigs)
		if err := m.saveUserConfig(sessionID); err != nil {
			log.Printf("Warning: Failed to save updated user MCP configuration: %v", err)
		}
	}
	
	return nil
}

// deregisterMCPInternal removes an MCP server configuration and disconnects from it (internal use without session)
func (m *MCPManager) deregisterMCPInternal(name string) error {
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
	
	// Auto-save configuration if path is set (global save)
	if m.configPath != "" {
		if err := m.saveConfig(); err != nil {
			log.Printf("Warning: Failed to save MCP configuration: %v", err)
		}
	}
	
	return nil
}

// DeregisterMCP removes an MCP server configuration and disconnects from it for a specific user
func (m *MCPManager) DeregisterMCP(r *http.Request, name string) error {
	sessionID := m.extractSessionID(r)
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
	
	// Update user-specific configuration if path is set
	if m.configPath != "" {
		// Remove from user configs and save
		userConfigs, _ := m.loadUserConfig(sessionID)
		delete(userConfigs, name)
		m.setUserConfigs(sessionID, userConfigs)
		if err := m.saveUserConfig(sessionID); err != nil {
			log.Printf("Warning: Failed to save updated user MCP configuration: %v", err)
		}
	}
	
	return nil
}

// GetConnectionStatus returns the current status of all MCP connections for a specific user
func (m *MCPManager) GetConnectionStatus(r *http.Request) *MCPConnectionStatus {
	sessionID := m.extractSessionID(r)
	log.Printf("GetConnectionStatus for session %s: acquiring read lock", sessionID)
	m.mu.RLock()
	defer func() {
		log.Printf("GetConnectionStatus for session %s: releasing read lock", sessionID)
		m.mu.RUnlock()
	}()

	connections := make([]MCPConnection, 0)
	allTools := make([]Tool, 0)
	allPrompts := make([]Prompt, 0)

	log.Printf("GetConnectionStatus for session %s: processing %d clients", sessionID, len(m.clients))
	
	userConfigs := m.getUserConfigs(sessionID)
	
	for name, client := range m.clients {
		if client == nil {
			log.Printf("Warning: MCP client %s is nil", name)
			continue
		}
		
		// Only include connections that this user owns
		if _, userOwns := userConfigs[name]; !userOwns {
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

	// Handle prefixed tool name (serverName: toolName)
	var actualToolName string
	var targetServerName string
	
	if parts := strings.SplitN(toolName, ": ", 2); len(parts) == 2 {
		targetServerName = parts[0]
		actualToolName = parts[1]
	} else {
		// Fallback to original behavior for backward compatibility
		actualToolName = toolName
	}

	// Find which server has this tool
	for serverName, client := range m.clients {
		if client.connection.Status != "connected" {
			continue
		}

		// If we have a target server, only check that server
		if targetServerName != "" && serverName != targetServerName {
			continue
		}

		for _, tool := range client.connection.Tools {
			if tool.Name == actualToolName {
				return client.CallTool(actualToolName, arguments)
			}
		}
	}

	return nil, fmt.Errorf("tool %s not found in any connected MCP server", toolName)
}

// GetPrompt gets a prompt from the appropriate MCP server
func (m *MCPManager) GetPrompt(promptName string, arguments map[string]interface{}) (*GetPromptResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Handle prefixed prompt name (serverName: promptName)
	var actualPromptName string
	var targetServerName string
	
	if parts := strings.SplitN(promptName, ": ", 2); len(parts) == 2 {
		targetServerName = parts[0]
		actualPromptName = parts[1]
	} else {
		// Fallback to original behavior for backward compatibility
		actualPromptName = promptName
	}

	// Find which server has this prompt
	for serverName, client := range m.clients {
		if client.connection.Status != "connected" {
			continue
		}

		// If we have a target server, only check that server
		if targetServerName != "" && serverName != targetServerName {
			continue
		}

		for _, prompt := range client.connection.Prompts {
			if prompt.Name == actualPromptName {
				return client.GetPrompt(actualPromptName, arguments)
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

// GetAllTools returns tools from connected MCP servers for a specific user
func (m *MCPManager) GetAllTools(r *http.Request) []Tool {
	sessionID := m.extractSessionID(r)
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allTools []Tool
	userConfigs := m.getUserConfigs(sessionID)
	
	log.Printf("GetAllTools - sessionID: %s, userConfigs: %+v, total clients: %d", sessionID, userConfigs, len(m.clients))
	
	for name, client := range m.clients {
		log.Printf("GetAllTools - Checking client %s, status: %s, tools count: %d", name, client.connection.Status, len(client.connection.Tools))
		if client.connection.Status == "connected" {
			// Only include tools from servers this user owns
			if _, userOwns := userConfigs[name]; userOwns {
				log.Printf("GetAllTools - User owns %s, adding %d tools", name, len(client.connection.Tools))
				// Add server name prefix to each tool name
				for _, tool := range client.connection.Tools {
					toolCopy := tool
					toolCopy.Name = fmt.Sprintf("%s: %s", name, tool.Name)
					log.Printf("GetAllTools - Adding tool: %s (original: %s)", toolCopy.Name, tool.Name)
					allTools = append(allTools, toolCopy)
				}
			} else {
				log.Printf("GetAllTools - User does not own %s", name)
			}
		}
	}

	log.Printf("GetAllTools - Returning %d tools total", len(allTools))
	return allTools
}

// GetAllPrompts returns prompts from connected MCP servers for a specific user
func (m *MCPManager) GetAllPrompts(r *http.Request) []Prompt {
	sessionID := m.extractSessionID(r)
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allPrompts []Prompt
	userConfigs := m.getUserConfigs(sessionID)
	
	log.Printf("GetAllPrompts - sessionID: %s, userConfigs: %+v, total clients: %d", sessionID, userConfigs, len(m.clients))
	
	for name, client := range m.clients {
		log.Printf("GetAllPrompts - Checking client %s, status: %s, prompts count: %d", name, client.connection.Status, len(client.connection.Prompts))
		if client.connection.Status == "connected" {
			// Only include prompts from servers this user owns
			if _, userOwns := userConfigs[name]; userOwns {
				log.Printf("GetAllPrompts - User owns %s, adding %d prompts", name, len(client.connection.Prompts))
				// Add server name prefix to each prompt name
				for _, prompt := range client.connection.Prompts {
					promptCopy := prompt
					promptCopy.Name = fmt.Sprintf("%s: %s", name, prompt.Name)
					log.Printf("GetAllPrompts - Adding prompt: %s (original: %s)", promptCopy.Name, prompt.Name)
					allPrompts = append(allPrompts, promptCopy)
				}
			} else {
				log.Printf("GetAllPrompts - User does not own %s", name)
			}
		}
	}

	log.Printf("GetAllPrompts - Returning %d prompts total", len(allPrompts))
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
		if err := m.registerMCPInternal(name, mcpConfig); err != nil {
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

// extractSessionID extracts session ID from request headers or generates one
func (m *MCPManager) extractSessionID(r *http.Request) string {
	// Try to get session ID from cookie first
	if cookie, err := r.Cookie("mcp_session_id"); err == nil && cookie.Value != "" {
		return cookie.Value
	}
	
	// Try to get session ID from header as fallback
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		// Generate a more consistent hash based on user agent and remote address for session isolation
		userAgent := r.Header.Get("User-Agent")
		remoteAddr := r.RemoteAddr
		
		// Extract just IP from remoteAddr (remove port)
		if idx := strings.Index(remoteAddr, ":"); idx != -1 {
			remoteAddr = remoteAddr[:idx]
		}
		
		if remoteAddr == "" {
			remoteAddr = "unknown"
		}
		if userAgent == "" {
			userAgent = "unknown"
		}
		
		// Use a more stable hash
		hash := sha256.Sum256([]byte(remoteAddr + "|" + userAgent))
		sessionID = hex.EncodeToString(hash[:16])
	}
	return sessionID
}

// setSessionCookie sets the session cookie for consistent session management
func (m *MCPManager) setSessionCookie(w http.ResponseWriter, sessionID string) {
	cookie := &http.Cookie{
		Name:     "mcp_session_id",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: false,   // Allow JavaScript access for debugging (set to true in production)
		Secure:   false,   // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode, // Lax mode for cross-origin requests via proxy
	}
	http.SetCookie(w, cookie)
	log.Printf("Set session cookie for session %s", sessionID)
}

// getUserConfigs gets user-specific configurations (must be called with lock held)
func (m *MCPManager) getUserConfigs(sessionID string) map[string]*MCPConfig {
	configs, exists := m.userConfigs[sessionID]
	if !exists {
		return make(map[string]*MCPConfig)
	}
	return configs
}

// setUserConfigs sets user-specific configurations (must be called with lock held)
func (m *MCPManager) setUserConfigs(sessionID string, configs map[string]*MCPConfig) {
	m.userConfigs[sessionID] = configs
}

// loadUserConfig loads user-specific configuration from file
func (m *MCPManager) loadUserConfig(sessionID string) (map[string]*MCPConfig, error) {
	if m.configPath == "" {
		return make(map[string]*MCPConfig), nil
	}
	
	// Create user-specific config file path
	userConfigPath := m.getUserConfigPath(sessionID)
	
	// Check if user config file exists
	if _, err := os.Stat(userConfigPath); os.IsNotExist(err) {
		return make(map[string]*MCPConfig), nil
	}
	
	// Load user config
	data, err := os.ReadFile(userConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read user config file: %w", err)
	}
	
	var config struct {
		MCPServers map[string]*MCPConfig `json:"mcpServers"`
	}
	
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user config: %w", err)
	}
	
	if config.MCPServers == nil {
		return make(map[string]*MCPConfig), nil
	}
	
	return config.MCPServers, nil
}

// saveUserConfig saves user-specific configuration to file
func (m *MCPManager) saveUserConfig(sessionID string) error {
	if m.configPath == "" {
		return nil
	}
	
	userConfigs := m.getUserConfigs(sessionID)
	if len(userConfigs) == 0 {
		return nil
	}
	
	config := struct {
		MCPServers map[string]*MCPConfig `json:"mcpServers"`
	}{MCPServers: userConfigs}
	
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal user config: %w", err)
	}
	
	userConfigPath := m.getUserConfigPath(sessionID)
	if err := os.MkdirAll(filepath.Dir(userConfigPath), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}
	
	if err := os.WriteFile(userConfigPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write user config file: %w", err)
	}
	
	return nil
}

// getUserConfigPath returns the path for user-specific config file
func (m *MCPManager) getUserConfigPath(sessionID string) string {
	if m.configPath == "" {
		return ""
	}
	
	// Create user-specific config in a subdirectory
	configDir := filepath.Dir(m.configPath)
	userDir := filepath.Join(configDir, "users")
	return filepath.Join(userDir, fmt.Sprintf("user_%s.json", sessionID))
}