import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chatSearchQuery: "",
  },
  reducers: {
    setChatSearchQuery(state, action) {
      state.chatSearchQuery = action.payload;
    },
  },
});

export const { setChatSearchQuery } = chatSlice.actions;
export default chatSlice.reducer;
