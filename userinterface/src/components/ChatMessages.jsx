import {
  VStack,
  Box,
  Text,
  Button,
  Icon,
  HStack,
  Tooltip,
} from "@chakra-ui/react";
import { MdModelTraining } from "react-icons/md";
import { useSelector } from "react-redux";
import { DEFAULT_MESSAGES } from "./Constants";
import { UserMsg } from "./UserMsg";
import { AssistantMsg } from "./AssistantMsg";
import { useEffect, useRef } from "react";

export default function ChatMessages({
  conversation,
  waitingResponse,
  handleQueryUpdate,
  handleDeleteMessage,
  handleAssistantUpdate,
  handleResubmit,
  currentMsgId,
  initialAssistantMessage,
  convHistory,
  useColorModeValue,
  model,
  chatBodySettingsDefaultTab,
  setSettingsDefaultTab,
  setIsSettingsOpen,
  isSettingsOpen,
}) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, waitingResponse]);

  const getSystemPromptLabel = () => {
    const matchedPrompt = prompts?.find((p) => p.content === systemPrompt);
    if (matchedPrompt) {
      return matchedPrompt.name;
    } else if (systemPrompt === DEFAULT_MESSAGES.SYSTEM_PROMPT) {
      return "Default System Prompt";
    } else {
      return "Custom System Prompt";
    }
  };

  const handleSystemPromptClick = () => {
    setIsSettingsOpen(true);
  };

  useEffect(() => {
    if (chatBodySettingsDefaultTab === "prompts" && isSettingsOpen) {
      setSettingsDefaultTab(chatBodySettingsDefaultTab);
    }
  }, [chatBodySettingsDefaultTab, isSettingsOpen]);

  const bgChat = useColorModeValue("blue.50", "gray.700");
  const bgText = useColorModeValue("gray.600", "gray.200");
  return (
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
                timestamp={m.timestamp}
              />
            )}
            {m.assistant && (
              <AssistantMsg
                msg={m.assistant}
                name={m.model}
                model={m.model}
                convId={m.id}
                resTime={m.resTime}
                handleRepeat={handleResubmit}
                waitingResponse={waitingResponse}
                currentMsgId={currentMsgId}
                defaultMsg={initialAssistantMessage}
                chatHistory={convHistory}
                systemPrompt={systemPrompt}
                handleAssistantUpdate={handleAssistantUpdate}
                timestamp={m.timestamp}
              />
            )}
          </Box>
        ))
      ) : (
        <Box w={"100%"} textAlign="center" p={8}>
          <VStack spacing={6}>
            <Text fontSize="2xl" fontWeight="bold" color={bgText}>
              What would you like to know today?
            </Text>

            <HStack alignItems="center" flex="1">
              <Icon
                as={MdModelTraining}
                color={bgText}
                boxSize={6}
                mr={3}
                filter="drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))"
              />
              <Text fontSize="md" fontWeight="bold" color={bgText}>
                System Prompt:
              </Text>

              <Tooltip label={DEFAULT_MESSAGES.UpdateSystemPrompt}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={handleSystemPromptClick}
                >
                  <Text
                    fontSize="md"
                    color={bgText}
                    noOfLines={3}
                    lineHeight="tall"
                    position="relative"
                    zIndex={1}
                    _hover={{
                      textDecoration: "none",
                    }}
                  >
                    {getSystemPromptLabel()}
                  </Text>
                </Button>
              </Tooltip>
            </HStack>

            <VStack>
              <Text fontSize="sm" color={bgText} fontStyle="italic">
                Click on System Prompt to update it.
              </Text>
              <Text fontSize="sm" color={bgText} fontStyle="italic">
                Type your question below to get started.
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </VStack>
  );
}
