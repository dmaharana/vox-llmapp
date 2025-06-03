import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userName: "Me",
  avatarImage: null,
  avatarType: "initials", // "initials" or "custom"
  chatMode: "formal", // "formal" or "informal"
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserName: (state, action) => {
      const trimmedName = action.payload?.trim();
      if (trimmedName) state.userName = trimmedName;
    },
    setAvatarImage: (state, action) => {
      state.avatarImage = action.payload;
      state.avatarType = action.payload ? "custom" : "initials";
    },
    clearAvatarImage: (state) => {
      state.avatarImage = null;
      state.avatarType = "initials";
    },
    setChatMode: (state, action) => {
      state.chatMode = action.payload;
    },
    setUserSettings: (state, action) => {
      const { userName, avatarImage, chatMode } = action.payload;
      if (userName !== undefined) {
        const trimmedName = userName?.trim();
        if (trimmedName) state.userName = trimmedName;
      }
      if (avatarImage !== undefined) {
        state.avatarImage = avatarImage;
        state.avatarType = avatarImage ? "custom" : "initials";
      }
      if (chatMode !== undefined) {
        state.chatMode = chatMode;
      }
    },
  },
});

export const { setUserName, setAvatarImage, clearAvatarImage, setChatMode, setUserSettings } = userSlice.actions;
export default userSlice.reducer;