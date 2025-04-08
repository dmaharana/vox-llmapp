import {
  VStack,
  Button,
  HStack,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

export default function ChatSidebar({
  isSidebarOpen,
  allChats,
  activeChatId,
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
}) {
  const sidebarBg = useColorModeValue("gray.200", "gray.700");

  return (
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
  );
}
