import { configureStore } from "@reduxjs/toolkit";
import promptReducer from "./promptSlice";
import chatReducer from "./chatSlice";
import providerReducer from "./providerSlice";
import userReducer from "./userSlice";
import { initializeUserSettings, setupUserSettingsAutoSave } from "./userInit";

export const store = configureStore({
  reducer: {
    prompt: promptReducer,
    chat: chatReducer,
    provider: providerReducer,
    user: userReducer,
  },
});

// Initialize user settings from localStorage
initializeUserSettings(store);

// Setup auto-save for user settings
setupUserSettingsAutoSave(store);
