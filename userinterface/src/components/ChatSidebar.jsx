import {
  VStack,
  Button,
  HStack,
  IconButton,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { AddIcon, SearchIcon } from "@chakra-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import { setChatSearchQuery } from "../store/chatSlice";

export default function ChatSidebar({
  isSidebarOpen,
  allChats,
  activeChatId,
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
}) {
  const sidebarBg = useColorModeValue("gray.200", "gray.700");
  const dispatch = useDispatch();
  const chatSearchQuery = useSelector((state) => state.chat.chatSearchQuery);

  const filteredChats = allChats.filter((chat) => {
    const query = chatSearchQuery.toLowerCase();
    return (
      (chat.title && chat.title.toLowerCase().includes(query)) ||
      (chat.conversation &&
        chat.conversation.some(
          (msg) =>
            (msg.user && msg.user.toLowerCase().includes(query)) ||
            (msg.assistant && msg.assistant.toLowerCase().includes(query))
        ))
    );
  });

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
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search chats..."
          value={chatSearchQuery}
          onChange={(e) => dispatch(setChatSearchQuery(e.target.value))}
        />
      </InputGroup>
      <Button
        colorScheme="blue"
        size="sm"
        onClick={handleNewChat}
        w="100%"
        leftIcon={<AddIcon />}
      >
        New Chat
      </Button>
      {filteredChats.map((chat) => (
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
