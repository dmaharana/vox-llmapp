import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Tooltip,
  useClipboard,
} from "@chakra-ui/react";
import { CopyIcon, CheckIcon } from "@chakra-ui/icons";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import ReactMarkdown from "markdown-to-jsx";
import { DEFAULT_MESSAGES } from "./Constants";

function AssistantHistoryMessage({ msg, count, index }) {
  const { hasCopied, onCopy } = useClipboard(msg.content);
  return (
    <>
      <VStack spacing={1} align={"start"}>
        <Box w={"100%"} align={"start"}>
          <Text
            fontWeight={"bold"}
            mb={1}
            fontSize={"xs"}
            color={"gray.600"}
            align={"start"}
          >
            {`[${count - index}] ` + msg.model}
          </Text>
        </Box>
        <ReactMarkdown
          components={ChakraUIRenderer()}
          skiphtml="true"
          align="left"
          sx={{
            p: "20px",
            borderRadius: "10px",
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </VStack>
      <HStack spacing={1} justifyContent={"flex-end"}>
        <Tooltip label={DEFAULT_MESSAGES.resTimeMessage}>
          <Text fontSize="sm" fontWeight="bold" color="blue">
            {msg.resTime}
          </Text>
        </Tooltip>
        <Button
          size="xs"
          colorScheme="blue"
          onClick={() => onCopy(msg.content)}
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
      </HStack>
    </>
  );
}

export default AssistantHistoryMessage;
