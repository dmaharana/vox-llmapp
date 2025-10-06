import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setPrompts, setSystemPrompt } from "../store/promptSlice";
import { setActiveProvider } from "../store/providerSlice";
import { initializeMCP } from "../store/mcpInit";
import { callMCPTool } from "../api/mcpApi";
import {
  Box,
  useColorMode,
  useColorModeValue,
  Button,
  HStack,
  VStack,
  IconButton,
  Tooltip,
  Text,
  Badge,
} from "@chakra-ui/react";
import { BeatLoader } from "react-spinners";
import generateUUID from "./scripts/utils";
import { DEFAULT_MESSAGES } from "./Constants";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarRightCollapse,
} from "react-icons/tb";

import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatFooterControls from "./ChatFooterControls";

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
  const { providers, activeProvider } = useSelector((state) => state.provider);
  const { tools, enabledTools } = useSelector((state) => state.mcp);
  const [conversation, setConversation] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeTools, setIncludeTools] = useState(true);
  const [convHistory, setConvHistory] = useState([]);

  const [allChats, setAllChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    return savedWidth ? parseInt(savedWidth) : 300;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Handle MCP tool calls within chat
  const handleToolCall = (toolName, args, result) => {
    const newMessageId = conversation.length > 0 ? conversation[conversation.length - 1].id + 1 : 1;
    
    const toolCallMessage = {
      id: newMessageId,
      user: `Called MCP tool: ${toolName}`,
      toolCall: {
        toolName,
        args,
        result
      },
      timestamp: new Date().toISOString(),
    };

    setConversation(prev => [...prev, toolCallMessage]);
  };

  // Handle MCP prompt calls within chat
  const handlePromptCall = (promptName, args, result) => {
    const newMessageId = conversation.length > 0 ? conversation[conversation.length - 1].id + 1 : 1;
    
    const promptCallMessage = {
      id: newMessageId,
      user: `Used MCP prompt: ${promptName}`,
      promptCall: {
        promptName,
        args,
        result
      },
      timestamp: new Date().toISOString(),
    };

    setConversation(prev => [...prev, promptCallMessage]);
  };

  // Handle tool call approval
  const handleToolCallApprove = async (messageId, toolName, args) => {
    try {
      // Parse the arguments if they're a JSON string (from LLM response)
      let parsedArgs = args;
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args);
        } catch (parseError) {
          console.error('Error parsing tool arguments:', parseError);
          // If parsing fails, use the string as-is
        }
      }
      
      const result = await callMCPTool(toolName, parsedArgs);
      
      // Update the tool call message with the result and capture the updated conversation
      const updatedConversation = conversation.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              toolCall: {
                ...msg.toolCall,
                result: result,
              }
            }
          : msg
      );
      setConversation(updatedConversation);
      
      // Check if there are no follow-up tool calls and send result back to backend for further processing
      if (activeProvider && activeProvider.api_key) {
        try {
          // Check if this tool result should trigger a follow-up response from the LLM
          // We'll send the tool result back to the backend to see if the LLM wants to continue
          const currentActiveTools = filterTools(tools, enabledTools);
          const toolResponseReqBody = {
            model,
            prompt: `Tool "${toolName}" returned: ${JSON.stringify(result)}`,
            stream: true, // Use streaming since we want to handle both tool calls and responses
            includeHistory: includeHistory,
            includeTools: includeTools,
            tools: currentActiveTools,
            systemPrompt: systemPrompt,
            providerUrl: activeProvider.endpoint,
            providerName: activeProvider.provider_name,
            providerApiKey: activeProvider.api_key,
          };

          // Only include conversation if there are previous messages (excluding the current tool call)
          const conversationWithoutToolCall = updatedConversation.filter(msg => !msg.toolCall || msg.toolCall.result !== result);
          if (conversationWithoutToolCall.length > 0 && includeHistory) {
            // Transform to role-based format for backend
            const formattedConversation = conversationWithoutToolCall.map(msg => {
              const formattedMsg = [];
              
              if (msg.user && msg.user !== "Thinking...") {
                formattedMsg.push({
                  role: "user",
                  content: msg.user,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  systemPrompt: msg.systemPrompt
                });
              }
              
              if (msg.assistant && msg.assistant !== "Thinking..." && msg.assistant !== "") {
                formattedMsg.push({
                  role: "assistant", 
                  content: msg.assistant,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  resTime: msg.resTime
                });
              }
              
              return formattedMsg;
            }).flat();
            
            toolResponseReqBody.conversation = formattedConversation;
          }

          console.log("Tool result request body:", toolResponseReqBody);

          const toolResponse = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": activeProvider.api_key,
            },
            body: JSON.stringify(toolResponseReqBody),
          });

          if (toolResponse.ok) {
            const toolResponseData = await toolResponse.json();
            console.log("Tool response from backend:", toolResponseData);
            
            // Check if the backend response contains tool calls
            let hasToolCalls = false;
            if (toolResponseData.response && typeof toolResponseData.response === "string") {
              try {
                const nestedData = JSON.parse(toolResponseData.response);
                hasToolCalls = nestedData.choices && nestedData.choices[0] && nestedData.choices[0].tool_calls;
                
                // If there are tool calls, add them to conversation like in the streaming logic
                if (hasToolCalls) {
                  const toolCalls = nestedData.choices[0].tool_calls;
                  console.log("Backend wants to make more tool calls:", toolCalls);
                  
                  setConversation((prev) => {
                    const updatedConv = [...prev];
                    
                    // Add tool call messages to conversation
                    toolCalls.forEach((toolCall, index) => {
                      const toolCallId = updatedConversation.length + 1 + index; // Use sequential IDs
                      updatedConv.push({
                        id: toolCallId,
                        user: `AI wants to use tool: ${toolCall.function.name}`,
                        toolCall: {
                          toolName: toolCall.function.name,
                          args: toolCall.function.arguments,
                          result: "Pending user confirmation...",
                        },
                        timestamp: new Date().toISOString(),
                      });
                    });
                    
                    return updatedConv;
                  });
                }
              } catch (parseError) {
                console.log("Could not parse nested response for tool calls, treating as regular response");
                // If parsing fails, treat as regular text response
                hasToolCalls = false;
              }
            }
            
            // Only add assistant message if there are no follow-up tool calls
            if (toolResponseData.response && !hasToolCalls) {
              const assistantMessage = {
                id: updatedConversation.length + 1,
                user: "assistant",
                assistant: toolResponseData.response,
                timestamp: new Date().toISOString(),
              };
              setConversation(prev => [...prev, assistantMessage]);
            }
          } else {
            console.error("Failed to get response from backend after tool call");
          }
        } catch (toolError) {
          console.error("Error sending tool result to backend:", toolError);
        }
      }
    } catch (error) {
      // Update with error message
      const errorMessage = error.message || "Tool call failed";
      const updatedConversationWithErrors = conversation.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              toolCall: {
                ...msg.toolCall,
                result: { error: errorMessage },
              }
            }
          : msg
      );
      setConversation(updatedConversationWithErrors);
      
      // Also send error back to backend for processing
      if (activeProvider && activeProvider.api_key) {
        try {
          const currentActiveTools = filterTools(tools, enabledTools);
          const toolResponseReqBody = {
            model,
            prompt: `Tool "${toolName}" failed: ${errorMessage}`,
            stream: true, // Use streaming since we want to handle both tool calls and responses
            includeHistory: includeHistory,
            includeTools: includeTools,
            tools: currentActiveTools,
            systemPrompt: systemPrompt,
            providerUrl: activeProvider.endpoint,
            providerName: activeProvider.provider_name,
            providerApiKey: activeProvider.api_key,
          };

          // Only include conversation if there are previous messages (excluding the current tool call)
          const conversationWithoutToolCall = updatedConversationWithErrors.filter(msg => {
            return !msg.toolCall || !msg.toolCall.result || !msg.toolCall.result.error || msg.toolCall.result.error !== errorMessage;
          });
          if (conversationWithoutToolCall.length > 0 && includeHistory) {
            // Transform to role-based format for backend
            const formattedConversation = conversationWithoutToolCall.map(msg => {
              const formattedMsg = [];
              
              if (msg.user && msg.user !== "Thinking...") {
                formattedMsg.push({
                  role: "user",
                  content: msg.user,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  systemPrompt: msg.systemPrompt
                });
              }
              
              if (msg.assistant && msg.assistant !== "Thinking..." && msg.assistant !== "") {
                formattedMsg.push({
                  role: "assistant", 
                  content: msg.assistant,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  resTime: msg.resTime
                });
              }
              
              return formattedMsg;
            }).flat();
            
            toolResponseReqBody.conversation = formattedConversation;
          }
          if (conversationWithoutToolCall.length > 0 && includeHistory) {
            // Transform to role-based format for backend
            const formattedConversation = conversationWithoutToolCall.map(msg => {
              const formattedMsg = [];
              
              if (msg.user && msg.user !== "Thinking...") {
                formattedMsg.push({
                  role: "user",
                  content: msg.user,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  systemPrompt: msg.systemPrompt
                });
              }
              
              if (msg.assistant && msg.assistant !== "Thinking..." && msg.assistant !== "") {
                formattedMsg.push({
                  role: "assistant", 
                  content: msg.assistant,
                  timestamp: msg.timestamp,
                  model: msg.model,
                  resTime: msg.resTime
                });
              }
              
              return formattedMsg;
            }).flat();
            
            toolResponseReqBody.conversation = formattedConversation;
          }
          if (conversationWithoutToolCall.length > 0 && includeHistory) {
            toolResponseReqBody.conversation = conversationWithoutToolCall;
          }

          console.log("Tool error request body:", toolResponseReqBody);

          const toolResponse = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": activeProvider.api_key,
            },
            body: JSON.stringify(toolResponseReqBody),
          });

          if (toolResponse.ok) {
            const toolResponseData = await toolResponse.json();
            console.log("Tool error response from backend:", toolResponseData);
            
            // Check if the backend response contains tool calls
            let hasToolCalls = false;
            if (toolResponseData.response && typeof toolResponseData.response === "string") {
              try {
                const nestedData = JSON.parse(toolResponseData.response);
                hasToolCalls = nestedData.choices && nestedData.choices[0] && nestedData.choices[0].tool_calls;
                
                // If there are tool calls, add them to conversation
                if (hasToolCalls) {
                  const toolCalls = nestedData.choices[0].tool_calls;
                  console.log("Backend wants to make more tool calls after error:", toolCalls);
                  
                  setConversation((prev) => {
                    const updatedConv = [...prev];
                    
                    // Add tool call messages to conversation
                    toolCalls.forEach((toolCall, index) => {
                      const toolCallId = updatedConversationWithErrors.length + 1 + index;
                      updatedConv.push({
                        id: toolCallId,
                        user: `AI wants to use tool: ${toolCall.function.name}`,
                        toolCall: {
                          toolName: toolCall.function.name,
                          args: toolCall.function.arguments,
                          result: "Pending user confirmation...",
                        },
                        timestamp: new Date().toISOString(),
                      });
                    });
                    
                    return updatedConv;
                  });
                }
              } catch (parseError) {
                console.log("Could not parse nested response for tool calls, treating as regular response");
                // If parsing fails, treat as regular text response
                hasToolCalls = false;
              }
            }
            
            // Only add assistant message if there are no follow-up tool calls
            if (toolResponseData.response && !hasToolCalls) {
              const assistantMessage = {
                id: updatedConversationWithErrors.length + 1,
                user: "assistant",
                assistant: toolResponseData.response,
                timestamp: new Date().toISOString(),
              };
              setConversation(prev => [...prev, assistantMessage]);
            }
          }
        } catch (toolError) {
          console.error("Error sending tool error to backend:", toolError);
        }
      }
    }
  };

  // Handle tool call rejection
  const handleToolCallReject = (messageId) => {
    setConversation(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              toolCall: {
                ...msg.toolCall,
                result: "Tool call rejected by user",
              }
            }
          : msg
      )
    );
  };

  const chatBodySettingsDefaultTab = "prompts";
  const chatFooterSettingsDefaultTab = "profile";
  const [settingsDefaultTab, setSettingsDefaultTab] = useState(
    chatBodySettingsDefaultTab
  );

  // Initialize MCP on component mount
  useEffect(() => {
    const cleanup = initializeMCP(dispatch);
    return cleanup; // Cleanup function for periodic refresh
  }, [dispatch]);

  // Auto-select first provider if none selected and providers are available
  useEffect(() => {
    if (!activeProvider && providers.length > 0) {
      const enabledProviders = providers.filter((p) => p.enabled);
      if (enabledProviders.length > 0) {
        dispatch(setActiveProvider(enabledProviders[0]));
      }
    }
  }, [providers, activeProvider, dispatch]);

  // Auto-select first model when provider is selected or changes
  useEffect(() => {
    if (activeProvider) {
      if (activeProvider.models && activeProvider.models.length > 0) {
        setModel(activeProvider.models[0]);
      } else {
        setModel(""); // No models available for this provider
      }
    } else {
      setModel(""); // No active provider selected
    }
  }, [activeProvider]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    const maxWidth = window.innerWidth / 2; // Half screen width
    const minWidth = 200;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
      localStorage.setItem("sidebarWidth", newWidth.toString());
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    // If sidebar was in hover mode, hide it after resize
    if (!isSidebarOpen) {
      setTimeout(() => setIsHovering(false), 200);
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Load system prompt from localStorage on mount
  useEffect(() => {
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
  const [cancelToken, setCancelToken] = useState("");

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
      timestamp: new Date().toISOString(),
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
      assistant: "Thinking...",
      resTime: 0,
      timestamp: new Date().toISOString(),
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

  // get enabled tools from the tools array
  function filterTools(tools, enabledTools) {
    return tools.filter((tool) => {
      console.log(
        "Checking tool:",
        tool.name,
        "Enabled:",
        enabledTools[tool.name]
      );
      if (enabledTools[tool.name] !== false) {
        return true;
      }
      return false;
    });
  }

  const callLlmService = async (message) => {
    const query = message.user;
    const msgId = message.id;
    const startTime = new Date().getTime();
    const activeTools = filterTools(tools, enabledTools);
    console.log(
      "Include tools:",
      enabledTools,
      "tools:",
      tools,
      "activeTools:",
      activeTools
    );
    // if there are tools then set stream to false for now
    const stream = activeTools.length > 0 ? false : true;

    // Check if provider is selected
    if (!activeProvider) {
      console.error("No provider selected");
      setConversation((p) =>
        p.map((m) =>
          m.id === msgId
            ? {
                ...m,
                assistant:
                  "Error: No provider selected. Please select a provider in settings.",
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

    let reqBody = {
      model: model,
      prompt: query,
      stream: stream,
      includeHistory: includeHistory,
      includeTools: includeTools,
      tools: activeTools,
      systemPrompt: systemPrompt,
      providerUrl: activeProvider.endpoint,
      providerName: activeProvider.provider_name,
      providerApiKey: activeProvider.api_key,
    };

    console.log("Request body:", reqBody);
    if (conversation.length > 0 && includeHistory) {
      // Transform frontend message format to backend-compatible format
      const formattedConversation = conversation.map(msg => {
        const formattedMsg = [];
        
        // Add user message if exists
        if (msg.user && msg.user !== "Thinking...") {
          formattedMsg.push({
            role: "user",
            content: msg.user,
            timestamp: msg.timestamp,
            model: msg.model,
            systemPrompt: msg.systemPrompt
          });
        }
        
        // Add assistant message if exists and not thinking
        if (msg.assistant && msg.assistant !== "Thinking..." && msg.assistant !== "") {
          formattedMsg.push({
            role: "assistant", 
            content: msg.assistant,
            timestamp: msg.timestamp,
            model: msg.model,
            resTime: msg.resTime
          });
        }
        
        return formattedMsg;
      }).flat();
      
      reqBody = {
        ...reqBody,
        conversation: formattedConversation,
      };
    }
    console.log("Request body with conversation:", reqBody);

    try {
      setWaitingResponse(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": activeProvider.api_key,
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

      // Check if this is a non-streaming response (for tool calls)
      const contentType = response.headers.get("content-type");
      console.log("Response content-type:", contentType);
      if (contentType && contentType.includes("application/json")) {
        // Non-streaming response - could be tool call or regular response
        const responseData = await response.json();
        console.log("Non-streaming response:", responseData);

        // Check for tool calls in the nested response field
        if (
          responseData.response &&
          typeof responseData.response === "string"
        ) {
          try {
            console.log(
              "Attempting to parse nested response:",
              responseData.response
            );
            const nestedData = JSON.parse(responseData.response);
            console.log("Parsed nested data:", nestedData);

            if (
              nestedData.choices &&
              nestedData.choices[0] &&
              nestedData.choices[0].tool_calls
            ) {
              const toolCalls = nestedData.choices[0].tool_calls;
              console.log("Received tool calls from nested data:", toolCalls);
              // Use the cancelToken from the request or look for it in response
              const token = cancelToken || responseData.cancelToken || "";
              console.log(
                "Setting tool call token:",
                token,
                "from cancelToken:",
                cancelToken,
                "or responseData.cancelToken:",
                responseData.cancelToken
              );
              // Add tool calls directly to conversation instead of showing modal
              setConversation((prev) => {
                        const updatedConv = prev.map((m) =>
                          m.id === msgId
                            ? {
                                ...m,
                                assistant: "The AI wants to use tools. Processing...",
                              }
                            : m
                        );
                        
                        // Add tool call messages to conversation
                        toolCalls.forEach((toolCall, index) => {
                          const toolCallId = msgId + 0.1 + index; // Use decimal IDs for tool calls
                          updatedConv.push({
                            id: toolCallId,
                            user: `AI wants to use tool: ${toolCall.function.name}`,
                            toolCall: {
                              toolName: toolCall.function.name,
                              args: toolCall.function.arguments,
                              result: "Pending user confirmation...",
                            },
                            timestamp: new Date().toISOString(),
                          });
                        });
                        
                        return updatedConv;
                      });
                      setWaitingResponse(false);
                      return;
            }
          } catch (e) {
            console.error(
              "Error parsing nested tool call response:",
              e,
              "Response data:",
              responseData.response
            );
          }
        }

        // Regular non-streaming response
        const endTime = new Date().getTime();
        const resTime = (endTime - startTime) / 1000;
        setConversation((p) =>
          p.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  assistant: responseData.response || "",
                  resTime: `${resTime.toFixed(2)}s`,
                  timestamp: new Date().toISOString(),
                }
              : m
          )
        );
        setWaitingResponse(false);
        return;
      }

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";
      let cancelTokenReceived = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        if (done) {
          break;
        }

        const chunkValue = decoder.decode(value, { stream: true });

        // Split by lines and process each SSE line
        const lines = chunkValue.split("\n");
        console.log("SSE lines:", lines);

        for (const line of lines) {
          const trimmedLine = line.trim();
          console.log("Processing line:", trimmedLine);

          // Handle completion signal
          if (trimmedLine === "data: [DONE]") {
            done = true;
            break;
          }

          // Process data lines
          if (trimmedLine.startsWith("data: ")) {
            const jsonStr = trimmedLine.substring(6); // Remove 'data: ' prefix
            if (jsonStr && jsonStr !== "[DONE]") {
              try {
                const jsonData = JSON.parse(jsonStr);
                console.log("Parsed JSON data:", jsonData);

                if (jsonData.cancelToken && !cancelTokenReceived) {
                  setCancelToken(jsonData.cancelToken);
                  cancelTokenReceived = true;
                }

                if (jsonData.response) {
                  text += jsonData.response;
                  const endTime = new Date().getTime();
                  const resTime = (endTime - startTime) / 1000;
                  setConversation((p) =>
                    p.map((m) =>
                      m.id === msgId
                        ? {
                            ...m,
                            assistant: text,
                            resTime: `${resTime.toFixed(2)}s`,
                            timestamp: new Date().toISOString(),
                          }
                        : m
                    )
                  );
                }

                // Check for tool calls
                if (
                  jsonData.response &&
                  typeof jsonData.response === "string" &&
                  jsonData.response.includes("Tool call required")
                ) {
                  try {
                    // Extract tool calls from the response
                    const toolCallData = JSON.parse(jsonData.response);
                    if (
                      toolCallData.choices &&
                      toolCallData.choices[0] &&
                      toolCallData.choices[0].tool_calls
                    ) {
                      const toolCalls = toolCallData.choices[0].tool_calls;
                      console.log("Received tool calls:", toolCalls);
                      
                      // Add tool calls directly to conversation instead of showing modal
                      setConversation((prev) => {
                        const updatedConv = prev.map((m) =>
                          m.id === msgId
                            ? {
                                ...m,
                                assistant: "The AI wants to use tools. Processing...",
                              }
                            : m
                        );
                        
                        // Add tool call messages to conversation
                        toolCalls.forEach((toolCall, index) => {
                          const toolCallId = msgId + 0.1 + index; // Use decimal IDs for tool calls
                          updatedConv.push({
                            id: toolCallId,
                            user: `AI wants to use tool: ${toolCall.function.name}`,
                            toolCall: {
                              toolName: toolCall.function.name,
                              args: toolCall.function.arguments,
                              result: "Pending user confirmation...",
                            },
                            timestamp: new Date().toISOString(),
                          });
                        });
                        
                        return updatedConv;
                      });
                      
                      // Don't continue processing this response as normal text
                      done = true;
                      break;
                    }
                  } catch (e) {
                    console.error("Error parsing tool call response:", e);
                  }
                }
                
                // Handle role-based responses from backend
                if (jsonData.response && typeof jsonData.response === "object") {
                  const responseObj = jsonData.response;
                  
                  // Handle assistant responses
                  if (responseObj.role === "assistant" && responseObj.content) {
                    setConversation((prev) => {
                      const updatedConv = prev.map((m) =>
                        m.id === msgId
                          ? {
                              ...m,
                              assistant: responseObj.content,
                              model: responseObj.model || model,
                              resTime: responseObj.resTime || "",
                            }
                          : m
                      );
                      return updatedConv;
                    });
                  }
                  // Handle user responses (if any)
                  else if (responseObj.role === "user" && responseObj.content) {
                    // This would be rare in streaming but handle it
                    console.log("Received user role in streaming response:", responseObj);
                  }
                }
              } catch (error) {
                console.error("Error parsing JSON:", error, "Data:", jsonStr);
              }
            }
          }
        }
      }
      if (text === "") {
        setConversation((p) =>
          p.map((m) =>
            m.id === msgId
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

      setWaitingResponse(false);
      setCancelToken(null);
      setCurrentMsgId(-1);
    } catch (error) {
      console.error(error);
    } finally {
      setWaitingResponse(false);
      setCancelToken(null);

      const currentConv = conversation.find((m) => m.id === message.id);

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

  const handleModelSelect = (model) => {
    setModel(model.modelName);
    const provider = providers.find((p) => p.id === model.providerId);
    if (provider) {
      dispatch(setActiveProvider(provider));
    }
  };

  return (
    <Box position="relative" h="100vh" w="100vw">
      {/* Full-width header */}
      <ChatHeader toggleColorMode={toggleColorMode} colorMode={colorMode} />

      {/* Main content area with sidebar and chat */}
      <HStack
        align="stretch"
        h="calc(100vh - 64px)"
        position="relative"
        spacing={0}
      >
        {/* Hover trigger area for collapsed sidebar */}
        {!isSidebarOpen && (
          <Box
            position="absolute"
            left={0}
            top={0}
            w="30px"
            h="100%"
            zIndex={999}
            bg="transparent"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          />
        )}

        {/* Sidebar container with fixed width to account for toggle button */}
        <Box
          position="relative"
          h="100%"
          flexShrink={0}
          w={isSidebarOpen ? `${sidebarWidth + 48}px` : "48px"}
          transition="width 0.3s ease"
        >
          {/* Actual sidebar content */}
          {(isSidebarOpen || (!isSidebarOpen && isHovering)) && (
            <Box
              position={!isSidebarOpen && isHovering ? "absolute" : "relative"}
              left={0}
              top={0}
              zIndex={!isSidebarOpen && isHovering ? 998 : "auto"}
              h="100%"
              w={`${sidebarWidth}px`}
              transition={isResizing ? "none" : "all 0.3s ease"}
              opacity={isSidebarOpen || isHovering ? 1 : 0}
              transform={
                isSidebarOpen || isHovering
                  ? "translateX(0)"
                  : "translateX(-20px)"
              }
              onMouseEnter={() => !isSidebarOpen && setIsHovering(true)}
              onMouseLeave={() => {
                if (!isSidebarOpen && !isResizing) {
                  setTimeout(() => {
                    if (!isResizing) {
                      setIsHovering(false);
                    }
                  }, 100);
                }
              }}
              display="flex"
              flexShrink={0}
            >
              <Box flex="1" display="flex" flexDirection="column">
                <ChatSidebar
                  isSidebarOpen={isSidebarOpen}
                  isHoverMode={!isSidebarOpen && isHovering}
                  allChats={allChats}
                  setAllChats={setAllChats}
                  activeChatId={activeChatId}
                  handleNewChat={handleNewChat}
                  handleSelectChat={handleSelectChat}
                  handleDeleteChat={handleDeleteChat}
                  sidebarWidth={sidebarWidth}
                />
              </Box>
              {/* Resize handle */}
              <Box
                w="6px"
                h="100%"
                bg="transparent"
                cursor="col-resize"
                onMouseDown={handleMouseDown}
                onMouseEnter={() => {
                  if (!isSidebarOpen) setIsHovering(true);
                }}
                _hover={{
                  bg: "blue.100",
                }}
                _active={{
                  bg: "blue.200",
                }}
                transition="background-color 0.2s ease"
                flexShrink={0}
                position="relative"
                zIndex={1001}
                userSelect="none"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderLeft="1px solid"
                borderColor="gray.200"
              >
                <Box
                  w="2px"
                  h="30px"
                  bg="gray.400"
                  borderRadius="1px"
                  opacity={0.7}
                  transition="all 0.2s ease"
                  _hover={{
                    opacity: 1,
                    bg: "blue.400",
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Toggle button - positioned at the end of sidebar container */}
          <Box
            position="absolute"
            right="-1px"
            top="0"
            h="auto"
            zIndex={1002}
            transform="translateX(100%)"
          >
            <Tooltip
              label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
              placement="right"
              hasArrow
            >
              <IconButton
                aria-label="Toggle sidebar"
                icon={
                  isSidebarOpen ? (
                    <TbLayoutSidebarRightCollapse />
                  ) : (
                    <TbLayoutSidebarLeftCollapse />
                  )
                }
                size="lg"
                onClick={toggleSidebar}
                variant="ghost"
                color={useColorModeValue("blue.900", "blue.100")}
                borderRadius="0 md md 0"
                _hover={{
                  bg: useColorModeValue("gray.100", "gray.600"),
                }}
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Chat container - centered and 75% width */}
        <Box
          flex="1"
          display="flex"
          justifyContent="center"
          alignItems="stretch"
          position="relative"
        >
          <Box w="75%" maxW="75vw" position="relative">
            <VStack
              h={"100%"}
              bg={bgMain}
              py={4}
              px={2}
              borderRadius={"1rem"}
              justifyContent="space-between"
            >
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
                useColorModeValue={useColorModeValue}
                model={model}
                includeTools={includeTools}
                setIncludeTools={setIncludeTools}
                setIsSettingsOpen={setIsSettingsOpen}
                isSettingsOpen={isSettingsOpen}
                chatBodySettingsDefaultTab={chatBodySettingsDefaultTab}
                setSettingsDefaultTab={setSettingsDefaultTab}
                handleToolCallApprove={handleToolCallApprove}
                handleToolCallReject={handleToolCallReject}
              />

              <ChatInput
                query={query}
                setQuery={setQuery}
                waitingResponse={waitingResponse}
                handleSubmit={handleSubmit}
                handleKeyPress={handleKeyPress}
                handleStopGeneration={handleStopGeneration}
                onToolCall={handleToolCall}
                onPromptCall={handlePromptCall}
              />

              <ChatFooterControls
                includeHistory={includeHistory}
                setIncludeHistory={setIncludeHistory}
                includeTools={includeTools}
                setIncludeTools={setIncludeTools}
                waitingResponse={waitingResponse}
                conversation={conversation}
                convHistory={convHistory}
                handleClearChat={handleClearChat}
                setConversation={setConversation}
                setCurrentMsgId={setCurrentMsgId}
                setConvHistory={setConvHistory}
                model={model}
                setModel={setModel}
                onModelSelect={handleModelSelect}
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                chatFooterDefaultSettingsTab={chatFooterSettingsDefaultTab}
              />
            </VStack>
          </Box>
        </Box>
      </HStack>

      {/* Tool call functionality is now integrated directly into the chat */}
    </Box>
  );
}
