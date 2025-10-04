import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchMCPConfigs,
  registerMCPServer,
  updateMCPServer,
  deleteMCPServer,
  fetchMCPTools,
  fetchMCPPrompts,
  refreshMCPConnections
} from '../api/mcpApi';

// Async thunks
export const loadMCPConfigs = createAsyncThunk(
  'mcp/loadConfigs',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMCPConfigs();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const addMCPServer = createAsyncThunk(
  'mcp/addServer',
  async (config, { rejectWithValue }) => {
    try {
      console.log('addMCPServer thunk - calling registerMCPServer with:', config);
      const result = await registerMCPServer(config);
      console.log('addMCPServer thunk - received result:', result);
      console.log('addMCPServer thunk - result type:', typeof result);
      console.log('addMCPServer thunk - result.connections:', result?.connections);
      return result;
    } catch (error) {
      console.error('addMCPServer thunk - error:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const editMCPServer = createAsyncThunk(
  'mcp/editServer',
  async (config, { rejectWithValue }) => {
    try {
      return await updateMCPServer(config);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const removeMCPServer = createAsyncThunk(
  'mcp/removeServer',
  async (name, { rejectWithValue }) => {
    try {
      return await deleteMCPServer(name);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const loadMCPTools = createAsyncThunk(
  'mcp/loadTools',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMCPTools();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const loadMCPPrompts = createAsyncThunk(
  'mcp/loadPrompts',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMCPPrompts();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const refreshConnections = createAsyncThunk(
  'mcp/refreshConnections',
  async (_, { rejectWithValue }) => {
    try {
      return await refreshMCPConnections();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  connections: [],
  tools: [],
  prompts: [],
  loading: false,
  error: null,
  lastUpdated: null,
  enabledTools: {},
  enabledPrompts: {}
};

const mcpSlice = createSlice({
  name: 'mcp',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    toggleTool: (state, action) => {
      const toolName = action.payload;
      state.enabledTools[toolName] = !state.enabledTools[toolName];
    },
    togglePrompt: (state, action) => {
      const promptName = action.payload;
      state.enabledPrompts[promptName] = !state.enabledPrompts[promptName];
    },
    setToolEnabled: (state, action) => {
      const { toolName, enabled } = action.payload;
      state.enabledTools[toolName] = enabled;
    },
    setPromptEnabled: (state, action) => {
      const { promptName, enabled } = action.payload;
      state.enabledPrompts[promptName] = enabled;
    },
    resetMCPState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // Load configs
      .addCase(loadMCPConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMCPConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload.connections || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(loadMCPTools.fulfilled, (state, action) => {
        state.tools = action.payload;
        action.payload?.forEach(tool => {
          if (!(tool.name in state.enabledTools)) {
            state.enabledTools[tool.name] = true;
          }
        });
      })
      .addCase(loadMCPPrompts.fulfilled, (state, action) => {
        state.prompts = action.payload;
        action.payload?.forEach(prompt => {
          if (!(prompt.name in state.enabledPrompts)) {
            state.enabledPrompts[prompt.name] = true;
          }
        });
      })
      .addCase(loadMCPConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add server
      .addCase(addMCPServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMCPServer.fulfilled, (state, action) => {
        console.log('addMCPServer.fulfilled - action.payload:', action.payload);
        console.log('addMCPServer.fulfilled - payload type:', typeof action.payload);
        console.log('addMCPServer.fulfilled - payload.connections:', action.payload?.connections);
        state.loading = false;
        // Handle both single connection and status object responses
        const payload = action.payload;
        if (payload && payload.connections) {
          console.log('addMCPServer.fulfilled - Using new format (connections)');
          // Status object response (new format)
          state.connections = payload.connections || [];
          state.tools = payload.tools || [];
          state.prompts = payload.prompts || [];
        } else if (payload && payload.name) {
          console.log('addMCPServer.fulfilled - Using legacy format (single connection)');
          // Single connection response (legacy format)
          const newConnection = payload;
          const existingConnection = state.connections.find(c => c.name === newConnection.name);
          if (existingConnection) {
            Object.assign(existingConnection, newConnection);
          } else {
            state.connections.push(newConnection);
          }
        } else {
          console.error('addMCPServer.fulfilled - Unexpected payload format:', payload);
        }
        state.lastUpdated = new Date().toISOString();
        console.log('addMCPServer.fulfilled - Updated state.connections:', state.connections);
      })
      .addCase(addMCPServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Edit server
      .addCase(editMCPServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editMCPServer.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload.connections || [];
        state.tools = action.payload.tools || [];
        state.prompts = action.payload.prompts || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(editMCPServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove server
      .addCase(removeMCPServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMCPServer.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload.connections || [];
        state.tools = action.payload.tools || [];
        state.prompts = action.payload.prompts || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(removeMCPServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Refresh connections
      .addCase(refreshConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload.connections || [];
        state.tools = action.payload.tools || [];
        state.prompts = action.payload.prompts || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(refreshConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  toggleTool,
  togglePrompt,
  setToolEnabled,
  setPromptEnabled,
  resetMCPState
} = mcpSlice.actions;

export default mcpSlice.reducer;