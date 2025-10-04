import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchSupportedProviders, fetchProviders } from "../api/providerApi";

const initialState = {
  providers: [],
  supportedProviders: [],
  loading: false,
  error: null,
  providersLoading: false,
  providersError: null,
  defaultProvider: null,
  activeProvider: null,
};

const providerSlice = createSlice({
  name: "provider",
  initialState,
  reducers: {
    setProviders: (state, action) => {
      state.providers = action.payload;
      if (state.activeProvider) {
        const updatedActiveProvider = action.payload.find(p => p.id === state.activeProvider.id);
        if (updatedActiveProvider) {
          state.activeProvider = updatedActiveProvider;
        }
      }
    },
    addProvider: (state, action) => {
      state.providers.push(action.payload);
    },
    editProvider: (state, action) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = action.payload;
        if (state.activeProvider && state.activeProvider.id === action.payload.id) {
          state.activeProvider = action.payload;
        }
      }
    },
    deleteProvider: (state, action) => {
      state.providers = state.providers.filter((p) => p.id !== action.payload);
      if (state.activeProvider && state.activeProvider.id === action.payload) {
        state.activeProvider = null;
      }
    },
    setActiveProvider: (state, action) => {
      state.activeProvider = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSupportedProviders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSupportedProviders.fulfilled, (state, action) => {
        state.loading = false;
        state.supportedProviders = action.payload;
      })
      .addCase(getSupportedProviders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getProviders.pending, (state) => {
        state.providersLoading = true;
        state.providersError = null;
      })
      .addCase(getProviders.fulfilled, (state, action) => {
        state.providersLoading = false;
        const { providers, defaultProvider } = action.payload;
        state.providers = providers.map(provider => ({
          ...provider,
          id: provider.id || generateUUID()
        }));
        if (defaultProvider && (!state.providers || state.providers.length === 0)) {
          state.providers = [{
            ...defaultProvider,
            id: defaultProvider.id || generateUUID()
          }];
        }
      })
      .addCase(getProviders.rejected, (state, action) => {
        state.providersLoading = false;
        state.providersError = action.error.message;
      });
  },
});

export const getSupportedProviders = createAsyncThunk(
  "provider/getSupportedProviders",
  async () => {
    return await fetchSupportedProviders();
  }
);

export const getProviders = createAsyncThunk(
  "provider/getProviders",
  async () => {
    return await fetchProviders();
  }
);

export const { setProviders, addProvider, editProvider, deleteProvider, setActiveProvider } =
  providerSlice.actions;

export default providerSlice.reducer;


function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
