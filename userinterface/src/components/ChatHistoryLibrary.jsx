import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Tooltip,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { AddIcon, SearchIcon } from "@chakra-ui/icons";
import { setChatSearchQuery } from "../store/chatSlice";

export default function ChatHistoryLibrary({ isOpen, onClose, allChats, onNewChat, onSelectChat }) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Chat History</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Box mb={4}>
            <HStack>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search chats..."
                  value={chatSearchQuery}
                  onChange={(e) => dispatch(setChatSearchQuery(e.target.value))}
                />
              </InputGroup>
              <Tooltip label="New Chat">
                <IconButton
                  icon={<AddIcon />}
                  onClick={onNewChat}
                  colorScheme="blue"
                  aria-label="New Chat"
                />
              </Tooltip>
            </HStack>
          </Box>

          <VStack spacing={3} align="stretch" maxH="60vh" overflowY="auto" pr={2}>
            {filteredChats.map((chat) => (
              <Box
                key={chat.id}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => onSelectChat(chat.id)}
              >
                <strong>{chat.title || "Untitled Chat"}</strong>
                <Box fontSize="sm" color="gray.500" noOfLines={2}>
                  {chat.conversation?.[0]?.user}
                </Box>
              </Box>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
