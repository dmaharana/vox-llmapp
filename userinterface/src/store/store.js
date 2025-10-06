import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";
import providerReducer from "./providerSlice";
import userReducer from "./userSlice";
import promptReducer from "./promptSlice";
import mcpReducer from "./mcpSlice";

console.log('Store configuration - mcpReducer:', mcpReducer);

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    provider: providerReducer,
    user: userReducer,
    prompt: promptReducer,
    mcp: mcpReducer,
  }
});

console.log('Store created with state:', store.getState());
