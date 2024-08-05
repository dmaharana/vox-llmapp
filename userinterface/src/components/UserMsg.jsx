import { useState } from "react";
import { Textarea, Tooltip } from "@chakra-ui/react";
import {
  Avatar,
  Box,
  HStack,
  Text,
  useClipboard,
  Button,
} from "@chakra-ui/react";
import {
  CopyIcon,
  CheckIcon,
  EditIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
export function UserMsg({ msg, msgId, handleQueryUpdate, waitingResponse }) {
  const [isEditing, setIsEditing] = useState(false);
  const { hasCopied, onCopy } = useClipboard(msg);
  const [isExpanded, setIsExpanded] = useState(false);
  const copyMessage = "Copy to clipboard";
  const editMessage = "Edit message";
  const expandMessage = "Show more";
  const collapseMessage = "Show less";
  const standardTextLen = 200;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const name = "User";
  return (
    <Box bg={"green.50"} p={2} borderRadius={"md"} mb={2} w={"100%"}>
      <HStack>
        <Avatar size={"sm"} name="User" mb={2} mr={3} />
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
          {isEditing ? (
            <Textarea
              value={msg}
              onChange={(e) => handleQueryUpdate(msgId, e.target.value)}
              onBlur={() => setIsEditing(false)}
            />
          ) : (
            <>
              {msg.length > standardTextLen && !isExpanded ? (
                <Text mt={2} noOfLines={3}>
                  {msg.slice(0, standardTextLen) + "..."}
                </Text>
              ) : (
                <Text mt={2}>{msg}</Text>
              )}

              {msg.length > standardTextLen ? (
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={toggleExpand}
                  variant="ghost"
                >
                  {isExpanded ? (
                    <Tooltip label={collapseMessage}>
                      <ChevronUpIcon />
                    </Tooltip>
                  ) : (
                    <Tooltip label={expandMessage}>
                      <ChevronDownIcon />
                    </Tooltip>
                  )}
                </Button>
              ) : null}
            </>
          )}
        </Box>
      </HStack>
      <HStack spacing={1} justifyContent={"flex-end"}>
        <Button
          size="xs"
          colorScheme="blue"
          isDisabled={waitingResponse}
          onClick={() => setIsEditing(!isEditing)}
          leftIcon={
            isEditing ? (
              <CheckIcon />
            ) : (
              <Tooltip label={editMessage}>
                <EditIcon />
              </Tooltip>
            )
          }
          variant="ghost"
        />
        <Button
          size="xs"
          colorScheme="blue"
          onClick={onCopy}
          ml={2}
          isDisabled={hasCopied}
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
      </HStack>
    </Box>
  );
}

export default UserMsg;
