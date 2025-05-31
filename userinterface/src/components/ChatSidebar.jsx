import {
  VStack,
  Box,
  Button,
  HStack,
  IconButton,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Button as ChakraButton,
  useDisclosure,
} from "@chakra-ui/react";
import { PiUploadLight } from "react-icons/pi";

import {
  AddIcon,
  SearchIcon,
  DownloadIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import { Tooltip } from "@chakra-ui/react";
import { useSelector, useDispatch } from "react-redux";
import { setChatSearchQuery } from "../store/chatSlice";
import { useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import generateUUID from "./scripts/utils";
import JSZip from "jszip";

function ChatSidebar({
  isSidebarOpen,
  isHoverMode = false,
  sidebarWidth,
  allChats,
  setAllChats,
  activeChatId,
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
}) {
  const sidebarBg = useColorModeValue("blue.50", "gray.700");
  const dispatch = useDispatch();
  const chatSearchQuery = useSelector((state) => state.chat.chatSearchQuery);
  const fileInputRef = useRef();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteChatOpen,
    onOpen: onDeleteChatOpen,
    onClose: onDeleteChatClose,
  } = useDisclosure();
  const [chatToDelete, setChatToDelete] = useState(null);

  const handleDeleteAllChats = () => {
    setAllChats([]);
    localStorage.setItem("voxChats", JSON.stringify([]));
    onClose();
  };

  const handleDeleteChatClick = (chatId) => {
    setChatToDelete(chatId);
    onDeleteChatOpen();
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      handleDeleteChat(chatToDelete);
      setChatToDelete(null);
    }
    onDeleteChatClose();
  };

  const filteredChats = allChats.filter((chat) => {
    const query = chatSearchQuery.toLowerCase();
    return (
      (chat.title && chat.title.toLowerCase().includes(query)) ||
      (chat.conversation &&
        chat.conversation.some(
          (msg) =>
            (msg.user && msg.user.toLowerCase().includes(query)) ||
            (msg.assistant && msg.assistant.toLowerCase().includes(query)),
        ))
    );
  });

  const handleExportAllChats = async () => {
    const zip = new JSZip();

    allChats.forEach((chat) => {
      const safeTitle = chat.title
        ? chat.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()
        : chat.id;
      zip.file(`chat_${safeTitle}.json`, JSON.stringify(chat, null, 2));
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_chats_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const handleImportChats = (e) => {
    const files = e.target.files;
    if (!files.length) return;

    Array.from(files).forEach((file) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        try {
          let imported = JSON.parse(fileReader.result);
          if (!Array.isArray(imported)) {
            imported = [imported];
          }

          setAllChats((prev) => {
            let updated = [...prev];
            imported.forEach((chat) => {
              if (!Array.isArray(chat.conversation)) return;
              if (!chat.id) {
                chat.id = generateUUID();
              }
              if (!chat.title) {
                const firstUserMsg = chat.conversation.find((msg) => msg.user);
                chat.title = firstUserMsg ? firstUserMsg.user : "Untitled Chat";
              }
              if (!chat.id || !Array.isArray(chat.conversation)) return;
              const exists = updated.some((c) => c.id === chat.id);
              if (!exists) {
                updated.push(chat);
              }
            });
            localStorage.setItem("voxChats", JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.error("Invalid chat file", err);
        }
      };
      fileReader.readAsText(file);
    });
    e.target.value = null;
  };

  return (
    <>
      <VStack
        w="100%"
        bg={sidebarBg}
        p={2}
        spacing={2}
        boxShadow={isHoverMode ? "2xl" : "md"}
        flexShrink={0}
        h="100%"
        borderRadius="md"
      >
        <HStack w="100%" spacing={2}>
          <InputGroup size="sm" flex="1">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search chats..."
              value={chatSearchQuery}
              onChange={(e) => dispatch(setChatSearchQuery(e.target.value))}
              borderColor="gray.600"
              borderRadius="full"
              _focus={{
                borderColor: "gray.800",
                boxShadow: "0 0 0 1px #2D3748",
              }}
            />
          </InputGroup>
          <Tooltip label="New Chat" hasArrow>
            <IconButton
              icon={<AddIcon />}
              aria-label="New Chat"
              colorScheme="blue"
              size="sm"
              onClick={handleNewChat}
            />
          </Tooltip>
        </HStack>
        <Box w="100%" overflowY="auto">
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
                width="100%"
                maxWidth={`${sidebarWidth}px`}
              >
                {chat.title}
              </Button>
              <IconButton
                aria-label="Delete chat"
                icon={<span>&times;</span>}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => handleDeleteChatClick(chat.id)}
              />
            </HStack>
          ))}
        </Box>

        <VStack mt="auto" spacing={2} position="sticky" bottom="0">
          <HStack>
            <Tooltip label="Export All Chats" hasArrow>
              <IconButton
                icon={<DownloadIcon />}
                aria-label="Export All Chats"
                colorScheme="green"
                variant={"ghost"}
                size="sm"
                isDisabled={allChats.length === 0}
                onClick={handleExportAllChats}
              />
            </Tooltip>

            <Tooltip label="Delete All Chats" hasArrow>
              <IconButton
                icon={<DeleteIcon />}
                aria-label="Delete All Chats"
                colorScheme="red"
                variant="ghost"
                size="sm"
                onClick={onOpen}
                isDisabled={allChats.length === 0}
              />
            </Tooltip>

            <Tooltip label="Import Chats" hasArrow>
              <IconButton
                icon={<PiUploadLight />}
                aria-label="Import Chats"
                colorScheme="purple"
                variant={"ghost"}
                size="sm"
                onClick={() => fileInputRef.current.click()}
              />
            </Tooltip>
          </HStack>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept=".json"
            onChange={handleImportChats}
          />
        </VStack>
      </VStack>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDeleteAllChats}
        title="Delete All Chats"
        message="Are you sure you want to delete ALL chats? This action cannot be undone."
        confirmText="Delete All"
        confirmColorScheme="red"
      />

      <ConfirmDialog
        isOpen={isDeleteChatOpen}
        onClose={onDeleteChatClose}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        confirmColorScheme="red"
      />
    </>
  );
}

export default ChatSidebar;
