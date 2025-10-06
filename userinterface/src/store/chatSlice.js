import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chatSearchQuery: "",
    selectedTab: "all", // "all", "starred", "archived"
  },
  reducers: {
    setChatSearchQuery(state, action) {
      state.chatSearchQuery = action.payload;
    },
    setSelectedTab(state, action) {
      state.selectedTab = action.payload;
    },
    toggleStarChat(state, action) {
      const chatId = action.payload;
      // Note: The actual chat data should be updated in the parent component
      // since it's passed as a prop
    },
    toggleArchiveChat(state, action) {
      const chatId = action.payload;
      // Note: The actual chat data should be updated in the parent component
      // since it's passed as a prop
    },
  },
});

export const { setChatSearchQuery, setSelectedTab, toggleStarChat, toggleArchiveChat } = chatSlice.actions;
export default chatSlice.reducer;
