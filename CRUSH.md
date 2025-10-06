# CRUSH.md - Development Guidelines for vox-llmapp

## Build Commands

### Server (Go)
- `cd server && go mod tidy` - Clean up dependencies
- `cd server && go build cmd/llmapp/main.go` - Build server binary
- `cd server && go test ./...` - Run all Go tests
- `cd server && go test ./internal/mcp -v` - Run specific package tests with verbose output
- `cd server && go test ./internal/mcp/example_test.go -v` - Run single test file

### UI (React/Bun)
- `cd userinterface && bun install` - Install dependencies
- `cd userinterface && bun run dev` - Start development server
- `cd userinterface && bun run build` - Build for production
- `cd userinterface && bun run lint` - Run ESLint

### Full Project (Makefile)
- `make buildui` (or `make u`) - Build UI only
- `make buildserver` (or `make s`) - Build server only
- `make build` (or `make b`) - Build both UI and server
- `make clean` (or `make c`) - Clean build artifacts

## Code Style Guidelines

### Go (Server)
- **Imports**: Group and sort imports (standard library, third-party, local)
- **Formatting**: Use `go fmt` - 4-space indentation
- **Naming**: 
  - CamelCase for types and functions
  - snake_case for JSON tags
  - Exported items: CamelCase, unexported: camelCase
- **Error Handling**: Check all errors, use `fmt.Errorf` for wrapping
- **Testing**: Table-driven tests preferred, use `t.Helper()` for test helpers
- **Comments**: Use // for single-line, /* */ for documentation

### JavaScript/JSX (UI)
- **Imports**: Group by type (libraries, components, local)
- **Formatting**: 2-space indentation, ESLint enforces rules
- **Naming**: 
  - PascalCase for components
  - camelCase for variables/functions
  - kebab-case for CSS classes
- **State**: Prefer React hooks (useState, useEffect)
- **Redux**: Use toolkit slices for state management
- **TypeScript**: Not used, plain JavaScript only

### General
- **Git**: Commit messages should be descriptive
- **Files**: Keep files focused and reasonably sized
- **Comments**: Explain complex logic, not obvious code
- **Dependencies**: Add to package.json/go.mod when needed

## Project Structure
- `server/` - Go backend with MCP server implementation
- `userinterface/` - React frontend with Chakra UI
- `config_data/` - Static configuration files
- `screen-captures/` - Documentation images

## Testing
- Go tests in same package directory with `_test.go` suffix
- UI tests: Not currently implemented
- Use `go test -v` for verbose test output
- Run specific test: `go test -run TestFunctionName`

## Common Commands for Agents
- `make build` - Full build before testing
- `cd server && go test ./... -v` - Comprehensive test run
- `cd userinterface && bun run lint` - Lint before commits