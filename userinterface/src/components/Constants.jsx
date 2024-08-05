export const chatApi = "/api/chat";
export const listModelsApi = "/api/models";

export const DEFAULT_MESSAGES = {
  SYSTEM_PROMPT:
    "You are a helpful assistant. Answer as concisely as possible.",
  ASSISTANT_PROMPT: "Assistant is typing...",
  CHAT_HISTORY_ON_MSG: "Chat mode on, all previous messages are included.",
  CHAT_HISTORY_OFF_MSG:
    "Chat mode off, only current message is included to generate response. Sytem prompt will be prepended to the query.",
};
