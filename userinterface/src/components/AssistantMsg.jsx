import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  HStack,
  Spinner,
  Text,
  Tooltip,
  useClipboard,
} from "@chakra-ui/react";
import {
  CopyIcon,
  CheckIcon,
  RepeatIcon,
  RepeatClockIcon,
  ViewOffIcon,
} from "@chakra-ui/icons";
import ReactMarkdown from "markdown-to-jsx";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import { DEFAULT_MESSAGES } from "./Constants";

import avatarImage from "../assets/assistant.png"; // Update the path to point to your avatar image
import AssistantHistory from "./AssistantHistory";

export function AssistantMsg({
  msg,
  name,
  convId,
  handleRepeat,
  waitingResponse,
  resTime,
  currentMsgId,
  defaultMsg,
  chatHistory,
}) {
  const { hasCopied, onCopy } = useClipboard(msg);

  const conversation = chatHistory?.find(
    (conv) => conv.id === convId
  )?.messages;
  const count = conversation?.filter(
    (msg) => msg.role === DEFAULT_MESSAGES.assistantRole
  )?.length;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box bg={"gray.50"} p={2} borderRadius={"md"} mb={2} w={"100%"}>
      <HStack>
        <Avatar
          size={"sm"}
          name="Assistant"
          src={avatarImage}
          mb={2}
          mr={3}
          bg={"red"}
        />
        <Box w={"100%"} align={"start"}>
          <Text
            fontWeight={"bold"}
            mb={1}
            fontSize={"xs"}
            color={"gray.600"}
            align={"start"}
          >
            {name}
          </Text>
          <ReactMarkdown
            components={ChakraUIRenderer()}
            skiphtml="true"
            align="left"
            sx={{
              p: "20px",
              borderRadius: "10px",
            }}
          >
            {msg}
          </ReactMarkdown>
        </Box>
      </HStack>
      <HStack spacing={1} justifyContent={"flex-end"}>
        {typeof count === "undefined" ? null : (
          <Button
            size="xs"
            colorScheme="blue"
            onClick={() => setIsExpanded(!isExpanded)}
            ml={2}
            leftIcon={
              !isExpanded ? (
                <Tooltip
                  label={
                    DEFAULT_MESSAGES.showHistoryMessage + " (" + count + ")"
                  }
                >
                  <RepeatClockIcon />
                </Tooltip>
              ) : (
                <Tooltip label={DEFAULT_MESSAGES.hideHistoryMessage}>
                  <ViewOffIcon />
                </Tooltip>
              )
            }
            variant="ghost"
          />
        )}

        <Button
          size="xs"
          colorScheme="blue"
          onClick={() => handleRepeat(convId)}
          ml={2}
          isDisabled={waitingResponse || currentMsgId === convId}
          // align={"end"}
          leftIcon={
            waitingResponse && currentMsgId === convId ? (
              <Spinner size="xs" />
            ) : (
              <Tooltip label={DEFAULT_MESSAGES.reSubmitMessage}>
                <RepeatIcon />
              </Tooltip>
            )
          }
          variant="ghost"
        />

        {currentMsgId !== convId ? (
          <Tooltip label={DEFAULT_MESSAGES.resTimeMessage}>
            <Text fontSize="sm" fontWeight="bold" color="blue">
              {resTime}
            </Text>
          </Tooltip>
        ) : null}

        {waitingResponse && currentMsgId === convId ? null : (
          <Button
            size="xs"
            colorScheme="blue"
            onClick={onCopy}
            ml={2}
            isDisabled={hasCopied}
            // align={"end"}
            leftIcon={
              hasCopied ? (
                <CheckIcon />
              ) : (
                <Tooltip label={DEFAULT_MESSAGES.copyMessage}>
                  <CopyIcon />
                </Tooltip>
              )
            }
            variant="ghost"
          />
        )}
      </HStack>
      {isExpanded && <br />}
      {isExpanded && (
        // <Box w={"100%"} align={"start"}>
        <AssistantHistory conversation={conversation} />
        // </Box>
      )}
    </Box>
  );
}

export default AssistantMsg;
