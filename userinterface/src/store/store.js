import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";
import providerReducer from "./providerSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    provider: providerReducer,
  },
});
