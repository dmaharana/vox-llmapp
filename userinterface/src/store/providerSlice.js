import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  providers: [],
};

const providerSlice = createSlice({
  name: "provider",
  initialState,
  reducers: {
    setProviders: (state, action) => {
      state.providers = action.payload;
    },
    addProvider: (state, action) => {
      state.providers.push(action.payload);
    },
    editProvider: (state, action) => {
      const { id, name, config } = action.payload;
      const providerIndex = state.providers.findIndex((p) => p.id === id);
      if (providerIndex !== -1) {
        state.providers[providerIndex] = {
          ...state.providers[providerIndex],
          name,
          config,
        };
      }
    },
    deleteProvider: (state, action) => {
      state.providers = state.providers.filter((p) => p.id !== action.payload);
    },
  },
});

export const { setProviders, addProvider, editProvider, deleteProvider } =
  providerSlice.actions;

export default providerSlice.reducer;
