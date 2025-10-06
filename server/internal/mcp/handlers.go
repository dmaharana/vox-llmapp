package mcp

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type MCPHandlers struct {
	manager *MCPManager
}

func NewMCPHandlers(manager *MCPManager) *MCPHandlers {
	return &MCPHandlers{
		manager: manager,
	}
}

// RegisterMCPHandler handles POST /run/mcp-config
func (h *MCPHandlers) RegisterMCPHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("RegisterMCPHandler called")
	var req MCPConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	log.Printf("Registering MCP server: %+v", req.Config)

	if req.Config.Name == "" {
		http.Error(w, "MCP server name is required", http.StatusBadRequest)
		return
	}

	// Validate based on server type
	if req.Config.Type == "stdio" {
		if req.Config.Command == "" {
			http.Error(w, "MCP server command is required for stdio servers", http.StatusBadRequest)
			return
		}
	} else if req.Config.Type == "http" {
		if req.Config.URL == "" {
			http.Error(w, "MCP server URL is required for HTTP servers", http.StatusBadRequest)
			return
		}
	} else {
		http.Error(w, "MCP server type must be 'stdio' or 'http'", http.StatusBadRequest)
		return
	}

	// Set session cookie BEFORE registration to ensure consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)
	
	// Register the MCP server
	if err := h.manager.RegisterMCP(r, req.Config.Name, req.Config); err != nil {
		log.Printf("Failed to register MCP server %s: %v", req.Config.Name, err)
		http.Error(w, fmt.Sprintf("Failed to register MCP server: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the connection status to return
	log.Printf("Getting connection status after registering %s", req.Config.Name)
	
	// Use a simple timeout approach
	done := make(chan struct{})
	var status *MCPConnectionStatus
	
	go func() {
		status = h.manager.GetConnectionStatus(r)
		close(done)
	}()
	
	select {
	case <-done:
		log.Printf("Got connection status for %s", req.Config.Name)
	case <-time.After(2 * time.Second):
		log.Printf("Timeout getting connection status for %s", req.Config.Name)
		// Return minimal status on timeout
		status = &MCPConnectionStatus{
			Connections: []MCPConnection{},
			Tools:       []Tool{},
			Prompts:     []Prompt{},
		}
	}
	
	// Double-check that status is not nil
	if status == nil {
		log.Printf("GetConnectionStatus returned nil after registering %s", req.Config.Name)
		status = &MCPConnectionStatus{
			Connections: []MCPConnection{},
			Tools:       []Tool{},
			Prompts:     []Prompt{},
		}
	}
	
	log.Printf("Registration response for %s: %d connections, %d tools, %d prompts", req.Config.Name, len(status.Connections), len(status.Tools), len(status.Prompts))
	
	// Debug: log the full response
	statusData, err := json.Marshal(status)
	if err != nil {
		log.Printf("Failed to marshal status for %s: %v", req.Config.Name, err)
		http.Error(w, fmt.Sprintf("Failed to marshal response: %v", err), http.StatusInternalServerError)
		return
	}
	log.Printf("Registration response data for %s: %s", req.Config.Name, string(statusData))
	
	// Set headers before writing response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	// Write the response
	if _, err := w.Write(statusData); err != nil {
		log.Printf("Failed to write status response after registering %s: %v", req.Config.Name, err)
		return
	}
	
	log.Printf("RegisterMCPHandler completed successfully for %s", req.Config.Name)
}

// UpdateMCPHandler handles PUT /run/mcp-config
func (h *MCPHandlers) UpdateMCPHandler(w http.ResponseWriter, r *http.Request) {
	var req MCPConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if req.Config.Name == "" {
		http.Error(w, "MCP server name is required", http.StatusBadRequest)
		return
	}

	// Set session cookie BEFORE operations to ensure consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	// Update the MCP server
	if err := h.manager.UpdateMCP(r, req.Config.Name, req.Config); err != nil {
		http.Error(w, fmt.Sprintf("Failed to update MCP server: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the connection status to return
	status := h.manager.GetConnectionStatus(r)
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// DeleteMCPHandler handles DELETE /run/mcp-config
func (h *MCPHandlers) DeleteMCPHandler(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		http.Error(w, "MCP server name is required", http.StatusBadRequest)
		return
	}

	// Set session cookie BEFORE operations to ensure consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	// Deregister the MCP server
	if err := h.manager.DeregisterMCP(r, name); err != nil {
		http.Error(w, fmt.Sprintf("Failed to deregister MCP server: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the connection status to return
	status := h.manager.GetConnectionStatus(r)
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// GetAllMCPHandler handles GET /run/mcp-configs
func (h *MCPHandlers) GetAllMCPHandler(w http.ResponseWriter, r *http.Request) {
	var status *MCPConnectionStatus
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in GetAllMCPHandler: %v", r)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}()
	
	status = h.manager.GetConnectionStatus(r)
	
	// Set session cookie for consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)
	
	// Double-check that status is not nil
	if status == nil {
		log.Printf("GetConnectionStatus returned nil")
		status = &MCPConnectionStatus{
			Connections: []MCPConnection{},
			Tools:       []Tool{},
			Prompts:     []Prompt{},
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		log.Printf("Failed to encode MCP status response: %v", err)
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// CallToolHandler handles POST /run/mcp-tool
func (h *MCPHandlers) CallToolHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ToolName  string                 `json:"toolName"`
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if req.ToolName == "" {
		http.Error(w, "Tool name is required", http.StatusBadRequest)
		return
	}

	// Call the tool
	result, err := h.manager.CallTool(req.ToolName, req.Arguments)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to call tool: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// GetPromptHandler handles POST /run/mcp-prompt
func (h *MCPHandlers) GetPromptHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PromptName string                 `json:"promptName"`
		Arguments  map[string]interface{} `json:"arguments"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if req.PromptName == "" {
		http.Error(w, "Prompt name is required", http.StatusBadRequest)
		return
	}

	// Get the prompt
	result, err := h.manager.GetPrompt(req.PromptName, req.Arguments)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get prompt: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// RefreshConnectionsHandler handles POST /run/mcp-refresh
func (h *MCPHandlers) RefreshConnectionsHandler(w http.ResponseWriter, r *http.Request) {
	// Set session cookie BEFORE operations to ensure consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	if err := h.manager.RefreshConnections(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to refresh connections: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the updated connection status
	status := h.manager.GetConnectionStatus(r)
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// GetToolsHandler handles GET /run/mcp-tools
func (h *MCPHandlers) GetToolsHandler(w http.ResponseWriter, r *http.Request) {
	// Set session cookie for consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	tools := h.manager.GetAllTools(r)
	
	response := struct {
		Tools []Tool `json:"tools"`
	}{
		Tools: tools,
	}
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// GetPromptsHandler handles GET /run/mcp-prompts
func (h *MCPHandlers) GetPromptsHandler(w http.ResponseWriter, r *http.Request) {
	// Set session cookie for consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	prompts := h.manager.GetAllPrompts(r)
	
	response := struct {
		Prompts []Prompt `json:"prompts"`
	}{
		Prompts: prompts,
	}
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

// ExportMCPConfigsHandler handles GET /run/mcp-configs/export
func (h *MCPHandlers) ExportMCPConfigsHandler(w http.ResponseWriter, r *http.Request) {
	// Set session cookie for consistency
	sessionID := h.manager.extractSessionID(r)
	h.manager.setSessionCookie(w, sessionID)

	status := h.manager.GetConnectionStatus(r)

	// Double-check that status is not nil
	if status == nil {
		status = &MCPConnectionStatus{
			Connections: []MCPConnection{},
			Tools:       []Tool{},
			Prompts:     []Prompt{},
		}
	}

	// Convert MCPConnection to export format
	exportData := make(map[string]MCPConfig)
	for _, conn := range status.Connections {
		exportData[conn.Name] = MCPConfig{
			Name:     conn.Name,
			Type:     conn.Type,
			Command:  conn.Command,
			Args:     conn.Args,
			Env:      conn.Env,
			URL:      conn.URL,
			Headers:  conn.Headers,
			Disabled: conn.Disabled,
		}
	}

	response := struct {
		McpServers map[string]MCPConfig `json:"mcpServers"`
	}{
		McpServers: exportData,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=vox-mcp-config.json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode export response: %v", err)
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}