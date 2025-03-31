export const chatApi = "/api/chat";
export const listModelsApi = "/api/models";

export const DEFAULT_MESSAGES = {
  SYSTEM_PROMPT:
    "You are a helpful assistant. Answer as concisely as possible.",
  ASSISTANT_PROMPT: "Assistant is typing...",
  CHAT_HISTORY_ON_MSG: "Chat mode on, all previous messages are included.",
  CHAT_HISTORY_OFF_MSG:
    "Chat mode off, only current message is included to generate response. Sytem prompt will be prepended to the query.",

  resTimeMessage: "Response time in seconds",
  reSubmitMessage: "Regenerate response",
  copyMessage: "Copy to clipboard",
  showHistoryMessage: "Show history",
  hideHistoryMessage: "Hide history",
  editSettingMessage: "Edit settings",
  clearChatMessage: "Clear chat",
  clearChatConfirmMessage: "Are you sure you want to clear the chat?",
  noResponseMessage: "Something went wrong. Please try again.",

  convUploadErrorTitle: "Failed to parse the file.",
  convUploadErrorMessage: "Please upload a valid JSON file.",
  convUploadSuccessMessage: "Conversation(s) uploaded successfully.",
  convUploadNoConvMessage: "No conversations found in the file.",
  convUploadConvCountMessage: "Conversation count: ",

  editMessage: "Edit message",
  expandMessage: "Show more",
  collapseMessage: "Show less",
  deleteMessage: "Delete conversation",

  exportPrompts: "Export all prompts as JSON",
  importPrompts: "Import prompts from JSON file",

  assistantRole: "assistant",
  userRole: "user",
};

export const DEFAULT_FILENAMES = {
  csv: "conversation.csv",
  json: "conversation.json",
};
