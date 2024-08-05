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
import { CopyIcon, CheckIcon, RepeatIcon } from "@chakra-ui/icons";
import ReactMarkdown from "markdown-to-jsx";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";

import avatarImage from "../assets/assistant.png"; // Update the path to point to your avatar image

export function AssistantMsg({
  msg,
  name,
  convId,
  handleRepeat,
  waitingResponse,
  resTime,
  currentMsgId,
  defaultMsg,
}) {
  const { hasCopied, onCopy } = useClipboard(msg);

  const resTimeMessage = "Response time in seconds";
  const reSubmitMessage = "Regenerate response";
  const copyMessage = "Copy to clipboard";

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
        {currentMsgId !== convId ? (
          <Tooltip label={resTimeMessage}>
            <Text fontSize="sm" fontWeight="bold" color="blue">
              {resTime}
            </Text>
          </Tooltip>
        ) : null}
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
              <Tooltip label={reSubmitMessage}>
                <RepeatIcon />
              </Tooltip>
            )
          }
          variant="ghost"
        />
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
                <Tooltip label={copyMessage}>
                  <CopyIcon />
                </Tooltip>
              )
            }
            variant="ghost"
          />
        )}
      </HStack>
    </Box>
  );
}

export default AssistantMsg;
