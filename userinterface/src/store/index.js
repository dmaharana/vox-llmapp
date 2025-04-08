import { configureStore } from "@reduxjs/toolkit";
import promptReducer from "./promptSlice";
import chatReducer from "./chatSlice";

export const store = configureStore({
  reducer: {
    prompt: promptReducer,
    chat: chatReducer,
  },
});
