// userInit.js - Initializes user settings from localStorage
import { setUserSettings } from "./userSlice";

export const initializeUserSettings = (store) => {
  // Load saved user settings from localStorage
  const savedUserName = localStorage.getItem("userName");
  const savedAvatarImage = localStorage.getItem("userAvatarImage");
  const savedChatMode = localStorage.getItem("chatMode") || "formal";

  // Initialize with saved values or defaults
  store.dispatch(
    setUserSettings({
      userName: savedUserName || "Me",
      avatarImage: savedAvatarImage || null,
      chatMode: savedChatMode,
    })
  );
};

// Initialize user settings automatically
export const setupUserSettingsAutoSave = (store) => {
  let previousState = store.getState().user;

  store.subscribe(() => {
    const currentState = store.getState().user;
    
    // Only save if user state has changed
    if (currentState !== previousState) {
      if (currentState.userName !== previousState.userName) {
        localStorage.setItem("userName", currentState.userName);
      }
      
      if (currentState.avatarImage !== previousState.avatarImage) {
        if (currentState.avatarImage) {
          localStorage.setItem("userAvatarImage", currentState.avatarImage);
        } else {
          localStorage.removeItem("userAvatarImage");
        }
      }

      if (currentState.chatMode !== previousState.chatMode) {
        localStorage.setItem("chatMode", currentState.chatMode);
      }
      
      previousState = currentState;
    }
  });
};