import { useState, useEffect } from "react";
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
  ChevronDownIcon,
  ChevronUpIcon,
  RepeatIcon,
  RepeatClockIcon,
  ViewOffIcon,
} from "@chakra-ui/icons";
import ReactMarkdown from "markdown-to-jsx";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import { DEFAULT_MESSAGES } from "./Constants";

import avatarImage from "../assets/assistant.png"; // Default avatar
import avatarImage1 from "../assets/assistant1.png";
import avatarImage2 from "../assets/assistant2.png";
import avatarImage3 from "../assets/assistant3.png";
import avatarImage4 from "../assets/assistant4.png";
import avatarImage5 from "../assets/assistant5.png";
import avatarImage6 from "../assets/assistant6.png";

import AssistantHistory from "./AssistantHistory";

const avatarImages = [
  avatarImage,
  avatarImage1,
  avatarImage2,
  avatarImage3,
  avatarImage4,
  avatarImage5,
  avatarImage6,
];

const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * avatarImages.length);
  return avatarImages[randomIndex];
};

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
  systemPrompt,
}) {
  const { hasCopied, onCopy } = useClipboard(msg);

  const conversation = chatHistory?.find(
    (conv) => conv.id === convId
  )?.messages;
  const count = conversation?.filter(
    (msg) => msg.role === DEFAULT_MESSAGES.assistantRole
  )?.length;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMsgExpanded, setIsMsgExpanded] = useState(waitingResponse);
  const maxContentLength = 200;
  const [currentAvatar, setCurrentAvatar] = useState(getRandomAvatar());

  useEffect(() => {
    setCurrentAvatar(getRandomAvatar());
  }, [name, systemPrompt]);

  return (
    <Box bg={"gray.50"} p={2} borderRadius={"md"} mb={2} w={"100%"}>
      <HStack>
        <Avatar
          size={"sm"}
          name="Assistant"
          src={currentAvatar}
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
            {msg.length <= maxContentLength || isMsgExpanded
              ? msg
              : msg.substring(0, maxContentLength) + "..."}
          </ReactMarkdown>

          {String(msg).length > maxContentLength && (
            <Button
              size="xs"
              colorScheme="blue"
              variant="ghost"
              onClick={() => setIsMsgExpanded(!isMsgExpanded)}
            >
              {isMsgExpanded ? (
                <Tooltip label={DEFAULT_MESSAGES.collapseMessage}>
                  <ChevronUpIcon />
                </Tooltip>
              ) : (
                <Tooltip label={DEFAULT_MESSAGES.expandMessage}>
                  <ChevronDownIcon />
                </Tooltip>
              )}
            </Button>
          )}
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
