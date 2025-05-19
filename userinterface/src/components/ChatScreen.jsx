import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setPrompts, setSystemPrompt } from "../store/promptSlice";
import {
  Box,
  useColorMode,
  useColorModeValue,
  Button,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { BeatLoader } from "react-spinners";
import generateUUID from "./scripts/utils";
import { DEFAULT_MESSAGES } from "./Constants";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatFooterControls from "./ChatFooterControls";
import ModelSelect from "./ModelSelect";

function generateChatTitle(conversation) {
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return "Untitled Chat";
  }
  const firstUserMsg = conversation.find((m) => m.user);
  if (!firstUserMsg || !firstUserMsg.user) {
    return "Untitled Chat";
  }
  let text = firstUserMsg.user.trim();

  // Use first sentence or first ~8 words
  const sentenceEnd = text.indexOf(".");
  if (sentenceEnd !== -1 && sentenceEnd < 50) {
    text = text.slice(0, sentenceEnd + 1);
  } else {
    const words = text.split(/\s+/).slice(0, 8);
    text = words.join(" ");
    if (words.length >= 8) text += "...";
  }

  // Capitalize first letter
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ChatScreen() {
  const dispatch = useDispatch();
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [includeHistory, setIncludeHistory] = useState(true);
  const [convHistory, setConvHistory] = useState([]);
  const [convId, setConvId] = useState(1);

  const [allChats, setAllChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProviderOpen, setIsProviderOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Load prompts from localStorage on mount
  useEffect(() => {
    const savedPrompts = localStorage.getItem("voxPrompts");
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts);
        dispatch(setPrompts(parsed));
      } catch (e) {
        console.error("Failed to parse saved prompts", e);
      }
    }

    const savedSystemPrompt = localStorage.getItem("voxSystemPrompt");
    if (savedSystemPrompt) {
      try {
        const parsedPrompt = JSON.parse(savedSystemPrompt);
        if (parsedPrompt && parsedPrompt.trim() !== "") {
          dispatch(setSystemPrompt(parsedPrompt));
        } else {
          dispatch(setSystemPrompt(DEFAULT_MESSAGES.SYSTEM_PROMPT));
        }
      } catch (e) {
        console.error("Failed to parse saved system prompt", e);
        dispatch(setSystemPrompt(DEFAULT_MESSAGES.SYSTEM_PROMPT));
      }
    } else {
      dispatch(setSystemPrompt(DEFAULT_MESSAGES.SYSTEM_PROMPT));
    }
  }, [dispatch]);

  // Save prompts to localStorage whenever prompts change
  useEffect(() => {
    if (prompts && prompts.length > 0) {
      localStorage.setItem("voxPrompts", JSON.stringify(prompts));
    }
  }, [prompts]);

  // Save systemPrompt to localStorage whenever it changes
  useEffect(() => {
    if (systemPrompt) {
      localStorage.setItem("voxSystemPrompt", JSON.stringify(systemPrompt));
    }
  }, [systemPrompt]);

  useEffect(() => {
    const savedModel = localStorage.getItem("voxSelectedModel");
    if (savedModel) {
      setModel(savedModel);
    }
  }, []);

  useEffect(() => {
    if (model) {
      localStorage.setItem("voxSelectedModel", model);
    }
  }, [model]);

  const initialAssistantMessage = (
    <Button
      isLoading
      spinner={<BeatLoader size={8} color="red" />}
      variant={"ghost"}
    />
  );
  const [waitingResponse, setWaitingResponse] = useState(false);
  const [currentMsgId, setCurrentMsgId] = useState(1);
  const [cancelToken, setCancelToken] = useState();

  const { colorMode, toggleColorMode } = useColorMode();
  const bgMain = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    // Do not update existing messages' model or systemPrompt
    // Optionally, update other UI state here if needed
  }, [model, systemPrompt]);

  useEffect(() => {
    if (!activeChatId) return;

    setAllChats((prev) => {
      const updated = prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              model,
            }
          : chat
      );
      localStorage.setItem("voxChats", JSON.stringify(updated));
      return updated;
    });
  }, [model, activeChatId]);

  useEffect(() => {
    const saved = localStorage.getItem("voxChats");
    if (saved) {
      const chats = JSON.parse(saved);
      setAllChats(chats);
      if (chats.length > 0) {
        setActiveChatId(chats[0].id);
        setConversation(chats[0].conversation);
      }
    } else {
      const newId = generateUUID();
      const initialChat = {
        id: newId,
        title: "Chat 1",
        conversation: [],
        createdAt: Date.now(),
      };
      setAllChats([initialChat]);
      setActiveChatId(newId);
      setConversation([]);
      localStorage.setItem("voxChats", JSON.stringify([initialChat]));
    }
  }, []);

  useEffect(() => {
    if (!activeChatId) return;

    setAllChats((prev) => {
      const chatExists = prev.some((c) => c.id === activeChatId);
      const hasMessages =
        Array.isArray(conversation) && conversation.length > 0;

      let updated;
      if (hasMessages) {
        if (chatExists) {
          updated = prev.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  conversation,
                  title: generateChatTitle(conversation),
                }
              : chat
          );
        } else {
          const newChat = {
            id: activeChatId,
            title: generateChatTitle(conversation),
            conversation,
            createdAt: Date.now(),
          };
          updated = [newChat, ...prev];
        }
      } else {
        updated = prev;
      }

      localStorage.setItem("voxChats", JSON.stringify(updated));
      return updated;
    });
  }, [conversation]);

  const handleNewChat = () => {
    const newId = generateUUID();
    setActiveChatId(newId);
    setConversation([]);
  };

  const handleSelectChat = (chatId) => {
    const chat = allChats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setConversation(chat.conversation);
    }
  };

  const handleResubmit = async (id) => {
    setCurrentMsgId(id);
    const message = conversation?.find((msg) => msg.id === id);
    const assistantMessage = message?.assistant;

    const convHistoryItem = convHistory?.find((item) => item.id === id);

    if (assistantMessage !== "Thinking..." && assistantMessage !== "") {
      if (convHistoryItem) {
        setConvHistory((p) =>
          p.map((item) =>
            item.id === id
              ? {
                  ...item,
                  messages: [
                    ...item.messages,
                    {
                      role: "assistant",
                      model: message.model,
                      content: assistantMessage,
                      resTime: message.resTime,
                    },
                  ],
                }
              : item
          )
        );
      } else {
        setConvHistory([
          {
            id: id,
            messages: [
              {
                role: "assistant",
                model: message.model,
                content: assistantMessage,
                resTime: message.resTime,
              },
            ],
          },
        ]);
      }
    }

    const newMessage = {
      id: id,
      user: message.user,
      model: model,
      systemPrompt: systemPrompt,
      assistant: "Thinking...",
      resTime: "",
    };

    setConversation((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              user: newMessage.user,
              model: newMessage.model,
              assistant: newMessage.assistant,
              resTime: newMessage.resTime,
            }
          : m
      )
    );

    callLlmService(newMessage);
  };

  const handleQueryUpdate = (id, newQuery) => {
    // find the message with the given id
    const message = conversation.find((msg) => msg.id === id);

    if (message) {
      setConversation((conversation) =>
        conversation.map((msg) =>
          msg.id === id ? { ...msg, user: newQuery } : msg
        )
      );
    }
  };

  const handleAssistantUpdate = (id, editedAssistantMsg) => {
    // find the message with the given id
    const message = conversation.find((msg) => msg.id === id);

    if (message) {
      setConversation((conversation) =>
        conversation.map((msg) =>
          msg.id === id ? { ...msg, assistant: editedAssistantMsg } : msg
        )
      );
    }
  };

  const handleStopGeneration = async () => {
    const params = new URLSearchParams({
      token: cancelToken,
    });

    const response = await fetch(`/api/cancel?${params}`, {
      method: "DELETE",
    });

    const rsp = await response.json();

    if (rsp?.data?.error === false) {
      setCancelToken(null);
      setWaitingResponse(false);
      setCurrentMsgId(-1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newMsgId = 1;
    if (conversation.length > 0) {
      newMsgId = conversation[conversation.length - 1].id + 1;
    }
    setCurrentMsgId(newMsgId);

    const newMessage = {
      id: newMsgId,
      user: query,
      model: model,
      systemPrompt: systemPrompt,
      // assistant: "",
      assistant: "Thinking...",
      // assistant: initialAssistantMessage,
      resTime: 0,
    };

    if (conversation.length > 0) {
      setConversation([...conversation, newMessage]);
    } else {
      setConversation([newMessage]);
    }
    setQuery("");

    callLlmService(newMessage);
  };

  function parseMultipleJson(data) {
    const result = [];
    let start = data.indexOf("{");
    let open = 0;

    for (let i = start; i < data.length; i++) {
      if (data[i] === "{") {
        open++;
      } else if (data[i] === "}") {
        open--;
        if (open === 0) {
          try {
            const jsonObject = JSON.parse(data.substring(start, i + 1));
            result.push(jsonObject);
            start = i + 1;
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      }
    }

    return result;
  }

  const callLlmService = async (message) => {
    // console.log(conversation);
    // get user query for the message id
    const query = message.user;
    const msgId = message.id;
    const startTime = new Date().getTime();

    let reqBody = {
      model: model,
      prompt: query,
      stream: true,
      includeHistory: includeHistory,
      systemPrompt: systemPrompt,
    };

    if (conversation.length > 0 && includeHistory) {
      reqBody = {
        ...reqBody,
        conversation: conversation,
      };
    }

    // console.log(JSON.stringify(reqBody));
    try {
      setWaitingResponse(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errBody = await response.json();
        console.error(errBody);
        setConversation((p) =>
          p.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  assistant: errBody.message,
                  model,
                  resTime: "0s",
                }
              : m
          )
        );

        setWaitingResponse(false);
        setCurrentMsgId(-1);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        if (done) {
          break;
        }

        const chunkValue = decoder.decode(value, { stream: true });
        const chunkParts = parseMultipleJson(chunkValue);

        chunkParts.forEach((cJson) => {
          // console.log(cJson);
          try {
            if (cJson["cancelToken"]) {
              setCancelToken(cJson["cancelToken"]);
            }
            if (cJson["response"]) {
              text += cJson["response"];
            }
            const endTime = new Date().getTime();
            const resTime = (endTime - startTime) / 1000;
            setConversation((p) =>
              p.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      assistant: text,
                      resTime: `${resTime.toFixed(2)}s`,
                    }
                  : m
              )
            );
          } catch (error) {
            console.error(error);
            console.log(part);
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setWaitingResponse(false);
      setCancelToken(null);
      // if assistant message is empty, set the assistant message to "Something went wrong. Please try again."

      const currentConv = conversation.find((m) => m.id === message.id);
      // console.log("msg id", message.id, "currentConv", currentConv);

      if (currentConv?.assistant === "") {
        setConversation((p) =>
          p.map((m) =>
            m.id === message.id
              ? {
                  ...m,
                  assistant: DEFAULT_MESSAGES.noResponseMessage,
                  model,
                  resTime: "0s",
                }
              : m
          )
        );
      }

      // reset current message id
      setCurrentMsgId(-1);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      // Allow default behavior for Shift+Enter (new line)
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearChat = () => {
    setConversation([]);
    setConvHistory([]);
    setAllChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId ? { ...chat, conversation: [] } : chat
      )
    );
    localStorage.setItem("voxChats", JSON.stringify(allChats));
  };

  const handleDeleteMessage = (id) => {
    setConversation((p) => p.filter((m) => m.id !== id));
    setConvHistory((p) => p.filter((m) => m.id !== id));
  };

  const handleDeleteChat = (chatId) => {
    const updated = allChats.filter((c) => c.id !== chatId);
    setAllChats(updated);
    localStorage.setItem("voxChats", JSON.stringify(updated));

    if (chatId === activeChatId) {
      if (updated.length > 0) {
        setActiveChatId(updated[0].id);
        setConversation(updated[0].conversation);
      } else {
        setActiveChatId(null);
        setConversation([]);
      }
    }
  };

  return (
    <Box position="relative">
      <HStack align="stretch" h="90vh">
        {isSidebarOpen && (
          <ChatSidebar
            isSidebarOpen={isSidebarOpen}
            allChats={allChats}
            setAllChats={setAllChats}
            activeChatId={activeChatId}
            handleNewChat={handleNewChat}
            handleSelectChat={handleSelectChat}
            handleDeleteChat={handleDeleteChat}
          />
        )}
        <Box flex="1" position="relative">
          <VStack
            h={"90vh"}
            bg={bgMain}
            py={4}
            px={2}
            borderRadius={"1rem"}
            justifyContent="space-between"
          >
            <ChatHeader
              toggleColorMode={toggleColorMode}
              colorMode={colorMode}
              setIsLibraryOpen={setIsLibraryOpen}
              toggleSidebar={toggleSidebar}
              model={model}
              setModel={setModel}
            />

            <ChatMessages
              conversation={conversation}
              waitingResponse={waitingResponse}
              handleQueryUpdate={handleQueryUpdate}
              handleDeleteMessage={handleDeleteMessage}
              handleAssistantUpdate={handleAssistantUpdate}
              handleResubmit={handleResubmit}
              currentMsgId={currentMsgId}
              initialAssistantMessage={initialAssistantMessage}
              convHistory={convHistory}
              setIsLibraryOpen={setIsLibraryOpen}
              useColorModeValue={useColorModeValue}
              model={model}
            />

            <ChatInput
              query={query}
              setQuery={setQuery}
              waitingResponse={waitingResponse}
              handleSubmit={handleSubmit}
              handleKeyPress={handleKeyPress}
              handleStopGeneration={handleStopGeneration}
              useColorModeValue={useColorModeValue}
            />

            <ChatFooterControls
              includeHistory={includeHistory}
              setIncludeHistory={setIncludeHistory}
              waitingResponse={waitingResponse}
              isLibraryOpen={isLibraryOpen}
              setIsLibraryOpen={setIsLibraryOpen}
              conversation={conversation}
              convHistory={convHistory}
              handleClearChat={handleClearChat}
              setConversation={setConversation}
              setCurrentMsgId={setCurrentMsgId}
              setConvHistory={setConvHistory}
              model={model}
              setModel={setModel}
              isProviderOpen={isProviderOpen}
              setIsProviderOpen={setIsProviderOpen}
            />
          </VStack>
        </Box>
      </HStack>
    </Box>
  );
}
