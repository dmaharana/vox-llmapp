package mcp

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type MCPClient struct {
	name         string
	config       MCPConfig
	cmd          *exec.Cmd
	stdin        io.WriteCloser
	stdout       io.ReadCloser
	stderr       io.ReadCloser
	httpClient   *http.Client
	sessionID    string
	connection   *MCPConnection
	requestID    int64
	pendingReqs  map[int64]chan JSONRPCResponse
	mu           sync.RWMutex
	ctx          context.Context
	cancel       context.CancelFunc
	isConnected  bool
}

func NewMCPClient(name string, config MCPConfig) *MCPClient {
	ctx, cancel := context.WithCancel(context.Background())
	
	// Set default type if not specified
	if config.Type == "" {
		config.Type = "stdio"
	}
	
	client := &MCPClient{
		name:        name,
		config:      config,
		pendingReqs: make(map[int64]chan JSONRPCResponse),
		ctx:         ctx,
		cancel:      cancel,
		connection: &MCPConnection{
			Name:     name,
			Type:     config.Type,
			Command:  config.Command,
			Args:     config.Args,
			Env:      config.Env,
			URL:      config.URL,
			Headers:  config.Headers,
			Disabled: config.Disabled,
			Status:   "disconnected",
			Tools:    []Tool{},
			Prompts:  []Prompt{},
		},
	}
	
	// Initialize HTTP client and session ID if needed
	if config.Type == "http" {
		client.httpClient = &http.Client{
			Timeout: 30 * time.Second,
		}
		client.sessionID = generateSessionID()
	}
	
	return client
}

// generateSessionID creates a unique session ID for HTTP MCP connections
func generateSessionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based ID if random generation fails
		return fmt.Sprintf("session-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)
}

func (c *MCPClient) Connect() error {
	if c.config.Disabled {
		return fmt.Errorf("MCP server %s is disabled", c.name)
	}

	switch c.config.Type {
	case "stdio":
		return c.connectStdio()
	case "http":
		return c.connectHTTP()
	default:
		return fmt.Errorf("unsupported MCP server type: %s", c.config.Type)
	}
}

func (c *MCPClient) connectStdio() error {
	// Check if command exists
	if _, err := exec.LookPath(c.config.Command); err != nil {
		return fmt.Errorf("MCP server command not found: %s: %w", c.config.Command, err)
	}
	
	log.Printf("Starting MCP server: %s %v", c.config.Command, c.config.Args)
	
	// Start the MCP server process
	c.cmd = exec.CommandContext(c.ctx, c.config.Command, c.config.Args...)
	
	// Set environment variables
	c.cmd.Env = os.Environ()
	for key, value := range c.config.Env {
		c.cmd.Env = append(c.cmd.Env, fmt.Sprintf("%s=%s", key, value))
	}

	var err error
	c.stdin, err = c.cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	c.stdout, err = c.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	c.stderr, err = c.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start MCP server: %w", err)
	}
	
	log.Printf("MCP server %s started with PID: %d", c.name, c.cmd.Process.Pid)

	// Start reading responses immediately after starting the process
	// This ensures the reader is ready before we send any requests
	go c.readResponses()
	go c.readErrors()

	// Give the reader goroutine a moment to start
	runtime.Gosched()

	// Initialize the connection
	if err := c.initialize(); err != nil {
		c.Disconnect()
		return fmt.Errorf("failed to initialize MCP connection: %w", err)
	}

	c.isConnected = true
	c.connection.Status = "connected"
	c.connection.ConnectedAt = time.Now()
	log.Printf("MCP client %s status set to connected", c.name)

	// Get tools and prompts (synchronous for registration)
	if err := c.refreshCapabilities(); err != nil {
		log.Printf("Warning: failed to refresh capabilities for %s: %v", c.name, err)
		// Don't fail registration for capability refresh errors
	}

	return nil
}

func (c *MCPClient) connectHTTP() error {
	if c.config.URL == "" {
		return fmt.Errorf("HTTP MCP server requires URL")
	}

	// Test connection with a simple HTTP request
	req, err := http.NewRequestWithContext(c.ctx, "POST", c.config.URL, nil)
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Add custom headers
	for key, value := range c.config.Headers {
		req.Header.Set(key, value)
	}
	req.Header.Set("Content-Type", "application/json")

	// Initialize the connection
	if err := c.initialize(); err != nil {
		return fmt.Errorf("failed to initialize MCP connection: %w", err)
	}

	c.isConnected = true
	c.connection.Status = "connected"
	c.connection.ConnectedAt = time.Now()

	// Get tools and prompts
	if err := c.refreshCapabilities(); err != nil {
		log.Printf("Warning: failed to refresh capabilities for %s: %v", c.name, err)
	}

	return nil
}

func (c *MCPClient) Disconnect() error {
	c.cancel()
	c.isConnected = false
	c.connection.Status = "disconnected"

	if c.stdin != nil {
		c.stdin.Close()
	}
	if c.stdout != nil {
		c.stdout.Close()
	}
	if c.stderr != nil {
		c.stderr.Close()
	}

	if c.cmd != nil && c.cmd.Process != nil {
		c.cmd.Process.Kill()
		c.cmd.Wait()
	}

	return nil
}

func (c *MCPClient) initialize() error {
	log.Printf("Initializing MCP client %s with command: %s %v", c.name, c.config.Command, c.config.Args)
	params := InitializeParams{
		ProtocolVersion: "2025-06-18", // Use the server's protocol version
		Capabilities: ClientCapabilities{
			Roots: &RootsCapability{
				ListChanged: true,
			},
			Sampling: &SamplingCapability{},
		},
		ClientInfo: ClientInfo{
			Name:    "llmserver-mcp-client",
			Version: "1.0.0",
		},
	}

	log.Printf("Sending initialize request to MCP server %s", c.name)
	
	// Debug: log what we're sending
	requestData, _ := json.Marshal(params)
	log.Printf("Initialize request data: %s", string(requestData))
	
	response, err := c.sendRequest("initialize", params)
	if err != nil {
		log.Printf("Failed to send initialize request to %s: %v", c.name, err)
		return err
	}
	log.Printf("Received initialize response from MCP server %s", c.name)
	log.Printf("Initialize response: %+v", response)

	var result InitializeResult
	if len(response.Result) > 0 {
		log.Printf("Initialize result data: %s", string(response.Result))
		if err := json.Unmarshal(response.Result, &result); err != nil {
			return fmt.Errorf("failed to parse initialize response: %w", err)
		}
	}

	c.connection.Capabilities = result.Capabilities
	c.connection.ServerInfo = result.ServerInfo

	// Send initialized notification
	return c.sendNotification("notifications/initialized", nil)
}

func (c *MCPClient) refreshCapabilities() error {
	// Get tools list
	if c.connection.Capabilities.Tools != nil {
		toolsResponse, err := c.sendRequest("tools/list", nil)
		if err != nil {
			return fmt.Errorf("failed to get tools list: %w", err)
		}

		var toolsResult ListToolsResult
		if len(toolsResponse.Result) > 0 {
			if err := json.Unmarshal(toolsResponse.Result, &toolsResult); err != nil {
				return fmt.Errorf("failed to parse tools list: %w", err)
			}
		}
		c.connection.Tools = toolsResult.Tools
	}

	// Get prompts list
	if c.connection.Capabilities.Prompts != nil {
		promptsResponse, err := c.sendRequest("prompts/list", nil)
		if err != nil {
			return fmt.Errorf("failed to get prompts list: %w", err)
		}

		var promptsResult ListPromptsResult
		if len(promptsResponse.Result) > 0 {
			if err := json.Unmarshal(promptsResponse.Result, &promptsResult); err != nil {
				return fmt.Errorf("failed to parse prompts list: %w", err)
			}
		}
		c.connection.Prompts = promptsResult.Prompts
	}

	return nil
}

func (c *MCPClient) CallTool(name string, arguments map[string]interface{}) (*CallToolResult, error) {
	if !c.isConnected {
		return nil, fmt.Errorf("MCP client %s is not connected", c.name)
	}

	params := CallToolParams{
		Name:      name,
		Arguments: arguments,
	}

	response, err := c.sendRequest("tools/call", params)
	if err != nil {
		return nil, err
	}

	var result CallToolResult
	if len(response.Result) > 0 {
		if err := json.Unmarshal(response.Result, &result); err != nil {
			return nil, fmt.Errorf("failed to parse tool call response: %w", err)
		}
	}

	return &result, nil
}

func (c *MCPClient) GetPrompt(name string, arguments map[string]interface{}) (*GetPromptResult, error) {
	if !c.isConnected {
		return nil, fmt.Errorf("MCP client %s is not connected", c.name)
	}

	params := GetPromptParams{
		Name:      name,
		Arguments: arguments,
	}

	response, err := c.sendRequest("prompts/get", params)
	if err != nil {
		return nil, err
	}

	var result GetPromptResult
	if len(response.Result) > 0 {
		if err := json.Unmarshal(response.Result, &result); err != nil {
			return nil, fmt.Errorf("failed to parse prompt response: %w", err)
		}
	}

	return &result, nil
}

func (c *MCPClient) GetConnection() *MCPConnection {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	// Return a copy to avoid race conditions
	conn := *c.connection
	return &conn
}

func (c *MCPClient) sendRequest(method string, params interface{}) (*JSONRPCResponse, error) {
	id := atomic.AddInt64(&c.requestID, 1)
	log.Printf("sendRequest: using ID %d for method %s", id, method)
	
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	switch c.config.Type {
	case "stdio":
		return c.sendStdioRequest(id, data)
	case "http":
		return c.sendHTTPRequest(data)
	default:
		return nil, fmt.Errorf("unsupported server type: %s", c.config.Type)
	}
}

func (c *MCPClient) sendStdioRequest(id int64, data []byte) (*JSONRPCResponse, error) {
	log.Printf("sendStdioRequest: setting up channel for request %d", id)
	responseChan := make(chan JSONRPCResponse, 1)
	
	// Set up pending request BEFORE writing to avoid race condition
	c.mu.Lock()
	c.pendingReqs[id] = responseChan
	c.mu.Unlock()
	
	defer func() {
		c.mu.Lock()
		delete(c.pendingReqs, id)
		c.mu.Unlock()
	}()

	log.Printf("sendStdioRequest: writing request %d to stdin", id)
	if _, err := c.stdin.Write(append(data, '\n')); err != nil {
		return nil, fmt.Errorf("failed to write request: %w", err)
	}

	// Wait for response with timeout
	select {
	case response := <-responseChan:
		log.Printf("sendStdioRequest: received response for request %d", id)
		if response.Error != nil {
			return nil, fmt.Errorf("MCP error: %s", response.Error.Message)
		}
		return &response, nil
	case <-time.After(30 * time.Second):
		log.Printf("sendStdioRequest: timeout for request %d", id)
		return nil, fmt.Errorf("timeout waiting for response from MCP server")
	case <-c.ctx.Done():
		log.Printf("sendStdioRequest: context done for request %d", id)
		return nil, fmt.Errorf("client disconnected")
	}
}

func (c *MCPClient) sendHTTPRequest(data []byte) (*JSONRPCResponse, error) {
	req, err := http.NewRequestWithContext(c.ctx, "POST", c.config.URL, bytes.NewBuffer(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Add required MCP session ID header
	req.Header.Set("Mcp-Session-Id", c.sessionID)
	
	// Add custom headers
	for key, value := range c.config.Headers {
		req.Header.Set(key, value)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP request failed with status: %d", resp.StatusCode)
	}

	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read HTTP response: %w", err)
	}

	var response JSONRPCResponse
	if err := json.Unmarshal(responseData, &response); err != nil {
		return nil, fmt.Errorf("failed to parse HTTP response: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("MCP error: %s", response.Error.Message)
	}

	return &response, nil
}

func (c *MCPClient) sendNotification(method string, params interface{}) error {
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	switch c.config.Type {
	case "stdio":
		if _, err := c.stdin.Write(append(data, '\n')); err != nil {
			return fmt.Errorf("failed to write notification: %w", err)
		}
	case "http":
		// For HTTP, notifications can be sent as regular requests without expecting a response
		req, err := http.NewRequestWithContext(c.ctx, "POST", c.config.URL, bytes.NewBuffer(data))
		if err != nil {
			return fmt.Errorf("failed to create HTTP notification request: %w", err)
		}

		// Add required MCP session ID header
		req.Header.Set("Mcp-Session-Id", c.sessionID)
		
		// Add custom headers
		for key, value := range c.config.Headers {
			req.Header.Set(key, value)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send HTTP notification: %w", err)
		}
		resp.Body.Close()
	}

	return nil
}

func (c *MCPClient) readResponses() {
	scanner := bufio.NewScanner(c.stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		log.Printf("Received raw response from MCP server %s: %s", c.name, line)

		var response JSONRPCResponse
		if err := json.Unmarshal([]byte(line), &response); err != nil {
			log.Printf("Failed to parse MCP response from %s: %v (raw: %s)", c.name, err, line)
			continue
		}

		log.Printf("Parsed MCP response from %s: ID=%v, HasError=%v", c.name, response.ID, response.Error != nil)

		c.mu.RLock()
		var responseChan chan JSONRPCResponse
		var exists bool
		
		// Handle different ID types that might come from JSON parsing
		switch id := response.ID.(type) {
		case float64:
			responseChan, exists = c.pendingReqs[int64(id)]
		case int64:
			responseChan, exists = c.pendingReqs[id]
		case int:
			responseChan, exists = c.pendingReqs[int64(id)]
		case string:
			// If it's a string, we can't match to our int64 keys
			log.Printf("Response has string ID '%s', but we use int64 keys", id)
			exists = false
		default:
			log.Printf("Response has unexpected ID type %T: %v", id, id)
			exists = false
		}
		c.mu.RUnlock()

		if exists {
			select {
			case responseChan <- response:
				log.Printf("Sent response to channel for request %v from %s", response.ID, c.name)
			default:
				log.Printf("Response channel full for request %v from %s", response.ID, c.name)
			}
		} else {
			// Check if this is an early response (before we set up the pending request)
			// This can happen if the server responds very quickly
			if response.ID == c.requestID {
				log.Printf("Response ID %v matches current request but no channel found - possible race condition from %s", response.ID, c.name)
			} else {
				log.Printf("No pending request found for response ID %v from %s", response.ID, c.name)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Error reading from MCP server %s: %v", c.name, err)
		c.connection.Status = "error"
		c.connection.LastError = err.Error()
	}
}

func (c *MCPClient) readErrors() {
	scanner := bufio.NewScanner(c.stderr)
	for scanner.Scan() {
		line := scanner.Text()
		log.Printf("MCP server %s stderr: %s", c.name, line)
	}
}