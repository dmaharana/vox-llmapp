# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands for Development

### Build Commands
- **Full build**: `just build` or `make build` - Builds both UI and server components
- **UI only**: `just buildui` or `make buildui` - Builds React frontend using bun
- **Server only**: `just buildserver` or `make buildserver` - Builds Go backend for Linux and Windows
- **Clean build**: `just clean` or `make clean` - Removes build artifacts

### Development Commands
- **Start backend dev server**: `cd server && air` - Uses Air for hot reloading Go server
- **Start frontend dev server**: `cd userinterface && bun run dev` - Vite dev server with HMR
- **Run backend**: `cd server && go run ./cmd/llmapp/main.go`
- **Test HTTP endpoints**: Use `httpTests/vox.http` with REST client

### Release Commands
- **Create archives**: `just createarchive` or `make createarchive` - Creates zip and tar.gz
- **Full release**: `just release` or `make release` - Builds and packages for distribution

### Dependencies
- **Backend**: Go 1.22.0+, modules in `server/go.mod`
- **Frontend**: Node.js with Bun package manager, dependencies in `userinterface/package.json`
- **Build tools**: `just` (preferred) or `make`, `air` for Go hot reloading

## Architecture Overview

### Project Structure
- **Monorepo** with separate backend (`server/`) and frontend (`userinterface/`) directories
- **Backend**: Go HTTP server using Chi router, serves embedded React SPA
- **Frontend**: React SPA with Redux state management, Vite for bundling
- **Build Process**: Frontend builds into `server/dist/`, then embedded into Go binary

### Backend Architecture (Go)
- **Entry Point**: `server/cmd/llmapp/main.go` - Main application with graceful shutdown
- **Core Server**: `server/internal/llmapp/routes.go` - HTTP routes, middleware, server lifecycle
- **API Layer**: `server/internal/llmapp/handlers.go` - HTTP handlers for chat and model APIs
- **Worker Pool**: `server/internal/llmapp/worker.go` - Concurrent request processing system
- **MCP Integration**: `server/internal/mcp/` - Model Context Protocol implementation

### Key Backend Components
- **Config System**: Environment-based configuration with `.env` file support
- **Worker Pool**: 5-worker pool for handling LLM requests concurrently
- **MCP Manager**: Manages multiple MCP server connections with JSON-RPC communication
- **Provider Support**: Multi-provider LLM support (Ollama, OpenRouter, Groq, Gemini)
- **SSL Support**: Optional HTTPS with certificate loading from `configs/sslcerts/`

### Frontend Architecture (React)
- **State Management**: Redux Toolkit for global state
- **UI Framework**: Chakra UI with React Bootstrap components
- **Build Tool**: Vite with React plugin
- **Development**: Proxy configuration for API calls to backend

### MCP (Model Context Protocol) Implementation
- **Purpose**: Connects to external MCP servers for tool and prompt capabilities
- **Backend**: Full JSON-RPC 2.0 client with connection management
- **Frontend**: React interface for MCP server configuration and monitoring
- **API Endpoints**: Complete REST API under `/run/mcp-*` routes
- **Status**: Production-ready with comprehensive error handling

## Configuration

### Environment Variables
Set in `server/.env`:
- `LLM_URL`: Ollama server URL (default: http://localhost:11434)
- `APP_PORT`: Application server port (default: 8011)  
- `PROMPTS_FILE`: Path to system prompts JSON file

### SSL Certificates
- Generate with: `make sslcert` or `openssl req -x509 -newkey rsa:4096 -keyout ./sslcerts/nginx.key -out ./sslcerts/nginx.crt -days 365 -nodes`
- Certificates expected in `server/configs/sslcerts/`
- Server falls back to HTTP if certificates not found

### MCP Configuration
- Configuration file: `server/mcp-config.json`
- Frontend interface available in Settings → MCP tab
- Supports stdio-based MCP servers (filesystem, git, etc.)

## Testing and Development

### Running Tests
- **Go tests**: `cd server && go test ./...`
- **HTTP tests**: Use `httpTests/vox.http` with REST client extensions
- **Frontend linting**: `cd userinterface && bun run lint`

### Development Workflow
1. Start backend: `cd server && air` (or `go run ./cmd/llmapp/main.go`)
2. Start frontend: `cd userinterface && bun run dev`
3. Access app at `http://localhost:5173` (dev) or `http://localhost:8011` (built)

### Key Development Patterns
- **Graceful Shutdown**: Server handles SIGINT/SIGTERM with 30-second timeout
- **Worker Pool Pattern**: Concurrent request processing with channel-based communication
- **Embedded Assets**: Frontend built and embedded into Go binary using `embed.go`
- **Provider Abstraction**: Unified interface for multiple LLM providers

## API Structure

### Core Endpoints
- `GET /api/prompts` - System prompts
- `GET /api/models` - Available models from provider
- `POST /api/chat` - Chat completions (streaming)
- `DELETE /api/cancel` - Cancel ongoing request

### MCP Endpoints
- `POST /run/mcp-config` - Register MCP server
- `GET /run/mcp-configs` - List all MCP server statuses
- `POST /run/mcp-tool` - Execute MCP tool
- `GET /run/mcp-tools` - List available tools

### Worker Pool System
- Requests processed through channel-based worker pool
- 5 concurrent workers by default
- Request cancellation support via cancel tokens
- Status monitoring endpoint at `/api/worker-status`

