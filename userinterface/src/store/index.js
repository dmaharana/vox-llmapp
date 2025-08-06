import { configureStore } from "@reduxjs/toolkit";
import promptReducer from "./promptSlice";
import chatReducer from "./chatSlice";
import providerReducer from "./providerSlice";
import userReducer from "./userSlice";
import { initializeUserSettings, setupUserSettingsAutoSave } from "./userInit";
import { initializeProviders } from "./providerInit";

export const store = configureStore({
  reducer: {
    prompt: promptReducer,
    chat: chatReducer,
    provider: providerReducer,
    user: userReducer,
  },
});

// Initialize user settings from localStorage
try {
  initializeUserSettings(store);
} catch (error) {
  console.error("Failed to initialize user settings:", error);
}

// Initialize providers
try {
  initializeProviders(store);
} catch (error) {
  console.error("Failed to initialize providers:", error);
}

// Setup auto-save for user settings
try {
  setupUserSettingsAutoSave(store);
} catch (error) {
  console.error("Failed to setup user settings auto-save:", error);
}
