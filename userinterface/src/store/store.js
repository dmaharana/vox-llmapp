import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";
import providerReducer from "./providerSlice";
import userReducer from "./userSlice";
import promptReducer from "./promptSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    provider: providerReducer,
    user: userReducer,
    prompt: promptReducer,
  }
});
