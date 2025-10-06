import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  prompts: [],
  systemPrompt: "",
};

const promptSlice = createSlice({
  name: "prompt",
  initialState,
  reducers: {
    setPrompts(state, action) {
      state.prompts = action.payload;
    },
    setSystemPrompt(state, action) {
      state.systemPrompt = action.payload;
    },
  },
});

export const { setPrompts, setSystemPrompt } = promptSlice.actions;
export default promptSlice.reducer;
