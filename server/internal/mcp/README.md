# MCP (Model Context Protocol) Client Implementation

This package implements a Go client for the Model Context Protocol (MCP) as specified in the MCP documentation.

## Overview

The MCP client allows the LLM server to connect to and interact with MCP servers, enabling access to external tools and prompts. The implementation follows the flow diagram provided and supports the complete MCP lifecycle.

## Architecture

### Core Components

1. **MCPClient** (`client.go`): Individual client for connecting to a single MCP server
2. **MCPManager** (`manager.go`): Manages multiple MCP connections and provides unified access
3. **MCPHandlers** (`handlers.go`): HTTP handlers for the REST API endpoints
4. **Types** (`types.go`): All MCP protocol types and data structures

### Flow Implementation

The implementation follows this flow:

1. **Register MCP** (`POST /run/mcp-config`):
   - Takes JSON configuration and connects to MCP server
   - Initializes connection with protocol handshake
   - Gets tools and prompts list
   - Returns connection status with available tools/prompts

2. **Update MCP** (`PUT /run/mcp-config`):
   - Deregisters existing connection
   - Registers with new configuration
   - Refreshes tools and prompts

3. **Delete MCP** (`DELETE /run/mcp-config/{name}`):
   - Removes MCP server from registry
   - Disconnects and cleans up resources

4. **Get All** (`GET /run/mcp-configs`):
   - Returns status of all MCP connections
   - Includes aggregated tools and prompts

## API Endpoints

### Configuration Management

- `POST /run/mcp-config` - Register new MCP server
- `PUT /run/mcp-config` - Update existing MCP server
- `DELETE /run/mcp-config/{name}` - Remove MCP server
- `GET /run/mcp-configs` - Get all MCP server statuses

### Tool and Prompt Access

- `POST /run/mcp-tool` - Call a tool on any connected MCP server
- `POST /run/mcp-prompt` - Get a prompt from any connected MCP server
- `GET /run/mcp-tools` - List all available tools
- `GET /run/mcp-prompts` - List all available prompts

### Connection Management

- `POST /run/mcp-refresh` - Refresh all connections and capabilities

## Usage Examples

### Register an MCP Server

```bash
curl -X POST http://localhost:8080/run/mcp-config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "name": "filesystem",
      "command": "uvx",
      "args": ["mcp-server-filesystem", "/path/to/allowed/files"],
      "env": {
        "PYTHONPATH": "/usr/local/lib/python3.9/site-packages"
      },
      "disabled": false
    }
  }'
```

### Call a Tool

```bash
curl -X POST http://localhost:8080/run/mcp-tool \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "read_file",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  }'
```

### Get a Prompt

```bash
curl -X POST http://localhost:8080/run/mcp-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "promptName": "analyze_code",
    "arguments": {
      "language": "python",
      "complexity": "high"
    }
  }'
```

## Configuration Format

MCP servers are configured using this JSON structure:

```json
{
  "config": {
    "name": "server-name",
    "command": "command-to-run",
    "args": ["arg1", "arg2"],
    "env": {
      "ENV_VAR": "value"
    },
    "disabled": false
  }
}
```

## Protocol Support

This implementation supports MCP protocol version `2024-11-05` and includes:

- ✅ Connection initialization and handshake
- ✅ Tools listing and calling
- ✅ Prompts listing and retrieval
- ✅ Error handling and connection management
- ✅ Graceful shutdown and cleanup
- ✅ Multiple concurrent MCP server connections

## Error Handling

The implementation includes comprehensive error handling:

- Connection failures are logged and reported in status
- Tool/prompt calls include error responses
- Automatic reconnection attempts on connection loss
- Graceful degradation when servers are unavailable

## Testing

Run the tests with:

```bash
go test ./internal/mcp/...
```

The test suite includes:
- Type serialization/deserialization
- Manager functionality
- JSON-RPC message handling
- Connection status tracking

## Integration

The MCP functionality is integrated into the main LLM server through:

1. **Routes**: MCP endpoints are added to the Chi router
2. **Lifecycle**: MCP connections are managed during server startup/shutdown
3. **Configuration**: MCP manager is initialized with the main server config

## Dependencies

- Standard Go libraries for JSON-RPC and process management
- Chi router for HTTP endpoints
- No external MCP-specific dependencies required