import { useState } from "react";
import { Textarea, Tooltip, useColorModeValue } from "@chakra-ui/react";
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
  CloseIcon,
} from "@chakra-ui/icons";
import { useSelector } from "react-redux";

import { DEFAULT_MESSAGES } from "./Constants";

export function UserMsg({
  msg,
  msgId,
  handleQueryUpdate,
  waitingResponse,
  handleDeleteMessage,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { hasCopied, onCopy } = useClipboard(msg);
  const [isExpanded, setIsExpanded] = useState(false);
  const standardTextLen = 200;

  const { userName, avatarImage, avatarType } = useSelector((state) => state.user);

  const userBg = useColorModeValue("green.50", "gray.600");
  const userAvatarText = useColorModeValue("gray.200", "gray.800");
  const userAvatarName = useColorModeValue("gray.600", "gray.300");
  const userAvatarBg = useColorModeValue("orange.600", "orange.300");
  const userTextColor = useColorModeValue("black", "white");

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Box
      bg={userBg}
      color={userTextColor}
      p={2}
      borderRadius={"md"}
      mb={2}
      w={"100%"}
    >
      <HStack>
        <Avatar 
          size={"sm"} 
          name={userName} 
          src={avatarType === "custom" ? avatarImage : null}
          mb={2} 
          mr={3} 
          bg={userAvatarBg} 
          color={userAvatarText} 
        />
        <Box w={"100%"} align={"start"}>
          <Text
            fontWeight={"bold"}
            mb={1}
            fontSize={"xs"}
            color={userAvatarName}
            align={"start"}
          >
            {userName}
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
                    <Tooltip label={DEFAULT_MESSAGES.collapseMessage}>
                      <ChevronUpIcon />
                    </Tooltip>
                  ) : (
                    <Tooltip label={DEFAULT_MESSAGES.expandMessage}>
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
              <Tooltip label={DEFAULT_MESSAGES.editMessage}>
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
              <Tooltip label={DEFAULT_MESSAGES.copyMessage}>
                <CopyIcon />
              </Tooltip>
            )
          }
          variant="ghost"
        />
        <Button
          size="xs"
          colorScheme="red"
          onClick={() => handleDeleteMessage(msgId)}
          ml={2}
          isDisabled={waitingResponse}
          leftIcon={
            <Tooltip label={DEFAULT_MESSAGES.deleteMessage}>
              <CloseIcon />
            </Tooltip>
          }
          variant="ghost"
        />
      </HStack>
    </Box>
  );
}

export default UserMsg;
