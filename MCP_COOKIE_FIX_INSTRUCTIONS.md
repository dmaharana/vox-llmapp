# MCP Cookie Fix - Action Required

## Problem Identified

The backend logs show **two different session IDs** being used:
- Registration request: `f6e8045ba1ec1ce532f7c6d0d8423b7d`
- Status request: `12e6b7d7629524343ae4e488bcb1dabd`

This confirms that cookies are not being properly sent between requests.

## Root Cause

1. **Vite proxy** was not configured to properly handle cookies
2. **Axios** was not configured globally to send credentials
3. **Backend cookie** was using `SameSite=Strict` which blocks cookies in proxy scenarios

## Changes Made

### 1. Frontend - Axios Configuration (`/userinterface/src/main.jsx`)
- Added `axios.defaults.withCredentials = true` to send cookies with all requests

### 2. Frontend - Vite Proxy (`/userinterface/vite.config.js`)
- Updated proxy configuration to use object format with `changeOrigin: true`
- This ensures cookies are properly forwarded through the proxy

### 3. Backend - Cookie Settings (`/server/internal/mcp/manager.go`)
- Changed `SameSite` from `Strict` to `Lax` mode
- Changed `HttpOnly` to `false` temporarily for debugging
- Added logging when cookie is set

### 4. Frontend - API Logging (`/userinterface/src/api/mcpApi.js` and `/userinterface/src/store/mcpSlice.js`)
- Added extensive logging to track cookie behavior
- Added `withCredentials: true` to individual requests (now redundant with global config)

## **REQUIRED ACTIONS**

### Step 1: Restart Frontend Dev Server
The Vite proxy configuration changes require a restart:

```bash
# In the userinterface directory
# Stop the current "bun run dev" process (Ctrl+C)
# Then restart it:
bun run dev
```

### Step 2: Verify Backend Reloaded
The backend should have auto-reloaded with `air`. Check the backend terminal for:
- Build messages from air
- No compilation errors

If unsure, manually restart the backend.

### Step 3: Clear Browser State
1. Open browser DevTools (F12)
2. Go to Application tab → Cookies
3. Delete all cookies for localhost
4. Refresh the page

### Step 4: Test MCP Server Addition
1. Try adding an MCP server
2. Check browser console for new detailed logs:
   - "Current cookies: ..."
   - "Cookies after response: ..."
   - "addMCPServer thunk - received result: ..."

3. Check backend logs for:
   - "Set session cookie for session XXX"
   - Same session ID in both registration and status requests

## Expected Behavior After Fix

### Browser Console Should Show:
```
Registering MCP server with config: {...}
Current cookies: (empty or previous session)
MCP server registration response: {...}
Cookies after response: mcp_session_id=XXX
addMCPServer thunk - received result: {connections: [...], tools: [...], prompts: [...]}
```

### Backend Logs Should Show:
```
RegisterMCPHandler called
Set session cookie for session XXX
Successfully registered and connected to MCP server: mem0
GetConnectionStatus for session XXX  <-- SAME SESSION ID
Registration response for mem0: 1 connections, 4 tools, 0 prompts
```

## Verification

After restarting the frontend:
1. The session IDs in backend logs should match
2. The frontend should receive connections in the response
3. The MCP server should appear immediately in the UI
4. No more "Loading MCP configurations" spinner

## Troubleshooting

If it still doesn't work:

1. **Check cookies in browser DevTools**:
   - Application → Cookies → localhost
   - Should see `mcp_session_id` cookie

2. **Check backend logs**:
   - Look for "Set session cookie for session XXX"
   - Verify same session ID in subsequent requests

3. **Check network tab**:
   - Request headers should include `Cookie: mcp_session_id=XXX`
   - Response headers should include `Set-Cookie: mcp_session_id=XXX`

4. **Verify proxy is working**:
   - Network tab should show requests to `http://localhost:5173/run/mcp-config`
   - Not `http://localhost:8011/run/mcp-config`
