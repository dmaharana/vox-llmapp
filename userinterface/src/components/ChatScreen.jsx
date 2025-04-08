import { useState, useEffect } from "react";
import generateUUID from "./scripts/utils";
import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  List,
  ListItem,
  Spacer,
  Stack,
  Text,
  Textarea,
  VStack,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdModelTraining, MdSystemUpdateAlt } from "react-icons/md";
import { IoMdSend } from "react-icons/io";
import { BeatLoader } from "react-spinners";
import { UserMsg } from "./UserMsg";
import { AssistantMsg } from "./AssistantMsg";
import DownloadChat from "./DownloadChat";
import ModelSelect from "./ModelSelect";
import ChatSettings from "./ChatSettings";
import { DEFAULT_MESSAGES } from "./Constants";
import ClearChat from "./ClearChat";
import StopGenerationButton from "./StopGenerationButton";
import UploadChat from "./UploadChat";
import {
  EditIcon,
  MoonIcon,
  SunIcon,
  HamburgerIcon,
  AddIcon,
} from "@chakra-ui/icons";

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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    DEFAULT_MESSAGES.SYSTEM_PROMPT
  );
  const [prompts, setPrompts] = useState([]);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [convHistory, setConvHistory] = useState([]);
  const [convId, setConvId] = useState(1);

  const [allChats, setAllChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  // const bgMain = useColorModeValue("gray.50", "gray.800");
  const bgChat = useColorModeValue("blue.50", "gray.700");
  const bgInput = useColorModeValue("green.50", "gray.700");
  const sidebarBg = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    setConversation((prev) =>
      Array.isArray(prev)
        ? prev.map((msg) => ({
            ...msg,
            model,
            systemPrompt,
          }))
        : prev
    );
  }, [model, systemPrompt]);

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
        // no messages: do not add new chat, but keep existing list
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

  // handle resubmit for a message with given id
  const handleResubmit = async (id) => {
    // find the message with the given id
    setCurrentMsgId(id);
    const message = conversation?.find((msg) => msg.id === id);
    const assistantMessage = message?.assistant;

    // save the existing assistant message into the history object with the same conversation id, so that the history can be shown to the user
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
                      systemPrompt,
                      assistant: text,
                      model,
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
          <VStack
            w="250px"
            bg={sidebarBg}
            p={2}
            spacing={2}
            overflowY="auto"
            borderRight="1px solid gray"
            borderRadius="md"
            m={2}
            boxShadow="md"
          >
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleNewChat}
              w="100%"
              leftIcon={<AddIcon />}
            >
              New Chat
            </Button>
            {allChats.map((chat) => (
              <HStack key={chat.id} w="100%" spacing={1}>
                <Button
                  flex="1"
                  variant={chat.id === activeChatId ? "solid" : "ghost"}
                  colorScheme="teal"
                  size="sm"
                  onClick={() => handleSelectChat(chat.id)}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  justifyContent="flex-start"
                  textAlign="left"
                >
                  {chat.title}
                </Button>
                <IconButton
                  aria-label="Delete chat"
                  icon={<span>&times;</span>}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleDeleteChat(chat.id)}
                />
              </HStack>
            ))}
          </VStack>
        )}
        <Box flex="1" position="relative">
          <VStack
            h={"90vh"}
            bg={bgMain}
            py={4}
            px={2}
            borderRadius={"2rem"}
            justifyContent="space-between"
          >
            <HStack
              w="100%"
              p={2}
              borderRadius="2rem"
              bg="#FFD7BE"
              justifyContent="space-between"
              alignItems="center"
            >
              <IconButton
                aria-label="Toggle sidebar"
                icon={<HamburgerIcon />}
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                variant="ghost"
                mr={2}
                color="black"
              />

              <Text
                fontFamily="Gothic"
                fontSize="2.0rem"
                fontWeight="bold"
                textAlign="center"
                color="#000000"
                flex="1"
                textShadow="2px 2px 4px #000000"
              >
                {DEFAULT_MESSAGES.APP_TITLE}
                {(() => {
                  if (systemPrompt !== DEFAULT_MESSAGES.SYSTEM_PROMPT) {
                    const matchedPrompt = prompts?.find(
                      (p) => p.content === systemPrompt
                    );
                    if (matchedPrompt) {
                      return ` (${matchedPrompt.name})`;
                    } else {
                      return ` (Custom Prompt)`;
                    }
                  }
                  return "";
                })()}
              </Text>

              <IconButton
                aria-label="Toggle dark mode"
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                size="lg"
                color="black"
              />
            </HStack>
            <VStack
              flex="1"
              h="100%"
              w={"100%"}
              bg={bgChat}
              overflowY={"auto"}
              justifyContent={conversation.length > 0 ? "flex-start" : "center"}
            >
              {conversation.length > 0 ? (
                conversation.map((m) => (
                  <Box key={m.id} w={"100%"}>
                    {m.user && (
                      <UserMsg
                        msg={m.user}
                        msgId={m.id}
                        waitingResponse={waitingResponse}
                        handleQueryUpdate={handleQueryUpdate}
                        handleDeleteMessage={handleDeleteMessage}
                      />
                    )}
                    {m.assistant && (
                      <AssistantMsg
                        msg={m.assistant}
                        name={m.model}
                        convId={m.id}
                        resTime={m.resTime}
                        handleRepeat={handleResubmit}
                        waitingResponse={waitingResponse}
                        currentMsgId={currentMsgId}
                        defaultMsg={initialAssistantMessage}
                        chatHistory={convHistory}
                        systemPrompt={systemPrompt}
                      />
                    )}
                  </Box>
                ))
              ) : (
                <Box w={"100%"} textAlign="center" p={8}>
                  <VStack spacing={6}>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.600">
                      What would you like to know today?
                    </Text>

                    <Box
                      width="100%"
                      maxW="container.md"
                      p={4}
                      borderRadius="xl"
                      borderWidth={2}
                      borderColor="blue.200"
                      bgGradient="linear(to-b, blue.50, white)"
                      boxShadow="0px 4px 24px rgba(149, 203, 255, 0.25)"
                    >
                      <Stack spacing={4}>
                        <List spacing={3}>
                          <ListItem display="flex" alignItems="center">
                            <Icon
                              as={MdModelTraining}
                              color="blue.600"
                              boxSize={6}
                              mr={3}
                              filter="drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))"
                            />
                            <Box flex="1">
                              <Text
                                fontSize="sm"
                                color="blue.700"
                                mb={0}
                                fontWeight="normal"
                              >
                                Model:
                              </Text>
                              <Text
                                fontSize="md"
                                color="blue.900"
                                fontWeight="semibold"
                                noOfLines={1}
                                textShadow="0 1px 2px rgba(0, 0, 0, 0.05)"
                              >
                                {model || "No model chosen yet"}
                              </Text>
                            </Box>
                          </ListItem>

                          <ListItem display="flex" alignItems="flex-start">
                            <Icon
                              as={MdSystemUpdateAlt}
                              color="blue.600"
                              boxSize={6}
                              mr={3}
                              mt={1}
                              filter="drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))"
                            />
                            <Box flex="1">
                              <Text
                                fontSize="sm"
                                color="blue.700"
                                mb={0}
                                fontWeight="normal"
                              >
                                System Prompt:
                              </Text>
                              <Box
                                position="relative"
                                borderRadius="lg"
                                p={3}
                                bg="white"
                                borderWidth={1}
                                borderColor="blue.100"
                                boxShadow="inner 0 2px 4px rgba(0, 0, 0, 0.05)"
                              >
                                <Text
                                  fontSize="md"
                                  color="blue.800"
                                  noOfLines={3}
                                  lineHeight="tall"
                                  position="relative"
                                  zIndex={1}
                                >
                                  {(() => {
                                    const matchedPrompt = prompts?.find(
                                      (p) => p.content === systemPrompt
                                    );
                                    if (matchedPrompt) {
                                      return matchedPrompt.name;
                                    } else if (
                                      systemPrompt ===
                                      DEFAULT_MESSAGES.SYSTEM_PROMPT
                                    ) {
                                      return "Default System Prompt";
                                    } else {
                                      return "Custom System Prompt";
                                    }
                                  })()}

                                  <IconButton
                                    size="xs"
                                    position="absolute"
                                    top={0}
                                    right={0}
                                    zIndex={2}
                                    icon={<EditIcon />}
                                    colorScheme="blue"
                                    variant="ghost"
                                    onClick={() => setIsLibraryOpen(true)}
                                  />
                                </Text>
                              </Box>
                            </Box>
                          </ListItem>
                        </List>
                      </Stack>
                    </Box>

                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      Type your question below or select a system prompt to get
                      started
                    </Text>
                  </VStack>
                </Box>
              )}
            </VStack>

            <Box w={"100%"} bg={bgInput} mt="auto">
              <HStack bg={bgInput}>
                <Textarea
                  isDisabled={waitingResponse}
                  placeholder={DEFAULT_MESSAGES.chatTextBoxDefaultMessage}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e)}
                  borderRadius={"2rem"}
                  h={"70%"}
                  // resize={"none"}
                  paddingTop={"2rem"}
                />
                {query && (
                  <Button
                    colorScheme={"purple"}
                    type="submit"
                    variant="ghost"
                    isDisabled={!query || waitingResponse}
                    onClick={(e) => handleSubmit(e)}
                  >
                    <IoMdSend size={40} />
                  </Button>
                )}

                {waitingResponse && (
                  <StopGenerationButton
                    handleStopGeneration={handleStopGeneration}
                  />
                )}
              </HStack>
              <HStack>
                <ChatSettings
                  systemPrompt={systemPrompt}
                  setSystemPrompt={setSystemPrompt}
                  prompts={prompts}
                  setPrompts={setPrompts}
                  includeHistory={includeHistory}
                  setIncludeHistory={setIncludeHistory}
                  waitingResponse={waitingResponse}
                  isLibraryOpen={isLibraryOpen}
                  setIsLibraryOpen={setIsLibraryOpen}
                  onLibraryClose={() => setIsLibraryOpen(false)}
                />
                <ModelSelect model={model} setModel={setModel} />
                <Spacer />
                {conversation.length > 0 && (
                  <DownloadChat
                    conversation={conversation}
                    waitingResponse={waitingResponse}
                    convHistory={convHistory}
                  />
                )}
                {conversation.length > 0 && (
                  <ClearChat
                    handleClearChat={handleClearChat}
                    waitingResponse={waitingResponse}
                  />
                )}
                <UploadChat
                  setConversation={setConversation}
                  waitingResponse={waitingResponse}
                  setCurrentMsgId={setCurrentMsgId}
                  setConvHistory={setConvHistory}
                />
              </HStack>
            </Box>
          </VStack>
        </Box>
      </HStack>
    </Box>
  );
}
