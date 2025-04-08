import {
  VStack,
  Box,
  Text,
  IconButton,
  Stack,
  List,
  ListItem,
  Icon,
} from "@chakra-ui/react";
import { MdModelTraining, MdSystemUpdateAlt } from "react-icons/md";
import { EditIcon } from "@chakra-ui/icons";
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
  systemPrompt,
  prompts,
  setIsLibraryOpen,
  useColorModeValue,
}) {
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
                        No model chosen yet
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
                              systemPrompt === DEFAULT_MESSAGES.SYSTEM_PROMPT
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
              Type your question below or select a system prompt to get started
            </Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
