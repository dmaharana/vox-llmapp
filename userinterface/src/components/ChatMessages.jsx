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

export default function ChatMessages({
  conversation,
  waitingResponse,
  handleQueryUpdate,
  handleDeleteMessage,
  handleResubmit,
  currentMsgId,
  initialAssistantMessage,
  convHistory,
  setIsLibraryOpen,
  useColorModeValue,
  model,
}) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);

  const bgChat = useColorModeValue("blue.50", "gray.700");

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

            <HStack alignItems="center" flex="1">
              <Icon
                as={MdModelTraining}
                color="blue.600"
                boxSize={6}
                mr={3}
                filter="drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))"
              />
              <Text fontSize="md" fontWeight="bold" color="blue.600">
                System Prompt:
              </Text>

              <Tooltip label={DEFAULT_MESSAGES.UpdateSystemPrompt}>
              <Button
                size="sm"
                icon={
                  <Icon
                    as={MdModelTraining}
                    color="blue.600"
                    boxSize={6}
                    mr={3}
                    filter="drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))"
                  />
                }
                colorScheme="blue"
                variant="ghost"
                onClick={() => setIsLibraryOpen(true)}
              >
                <Text
                  fontSize="md"
                  color="blue.800"
                  noOfLines={3}
                  lineHeight="tall"
                  position="relative"
                  zIndex={1}
                  textDecoration="underline"
                  _hover={{
                    textDecoration: "none",
                  }}
                >
                  {(() => {
                    const matchedPrompt = prompts?.find(
                      (p) => p.content === systemPrompt
                    );
                    if (matchedPrompt) {
                      return matchedPrompt.name;
                    } else if (
                      systemPrompt === DEFAULT_MESSAGES.SYSTEM_PROMPT
                    ) {
                      return "Default System Prompt";
                    } else {
                      return "Custom System Prompt";
                    }
                  })()}
                </Text>
              </Button>
              </Tooltip>

            </HStack>

            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              Type your question below or select a system prompt to get started
            </Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
