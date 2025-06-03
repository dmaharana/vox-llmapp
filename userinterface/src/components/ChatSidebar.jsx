import {
  Avatar,
  Box,
  Button,
  HStack,
  IconButton,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tooltip,
} from "@chakra-ui/react";
import { PiUploadLight } from "react-icons/pi";
import { LuMessagesSquare } from "react-icons/lu";
import { FiStar, FiArchive } from "react-icons/fi";
import appIcon from "/vox.png";

import {
  AddIcon,
  SearchIcon,
  DownloadIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import { setChatSearchQuery, setSelectedTab } from "../store/chatSlice";
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
  const avatarBg = useColorModeValue("orange.700", "blue.700");
  const dispatch = useDispatch();
  const chatSearchQuery = useSelector((state) => state.chat.chatSearchQuery);
  const selectedTab = useSelector((state) => state.chat.selectedTab);
  const fileInputRef = useRef();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteChatOpen,
    onOpen: onDeleteChatOpen,
    onClose: onDeleteChatClose,
  } = useDisclosure();
  const [chatToDelete, setChatToDelete] = useState(null);
  const [hoveredChatId, setHoveredChatId] = useState(null);

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

  const handleStarChat = (chatId) => {
    setAllChats((prev) => {
      const updated = prev.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, isStarred: !chat.isStarred };
        }
        return chat;
      });
      localStorage.setItem("voxChats", JSON.stringify(updated));
      return updated;
    });
  };

  const handleArchiveChat = (chatId) => {
    setAllChats((prev) => {
      const updated = prev.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, isArchived: !chat.isArchived };
        }
        return chat;
      });
      localStorage.setItem("voxChats", JSON.stringify(updated));
      return updated;
    });
  };

  const filteredChats = allChats.filter((chat) => {
    const query = chatSearchQuery.toLowerCase();
    const matchesSearch = 
      (chat.title && chat.title.toLowerCase().includes(query)) ||
      (chat.conversation &&
        chat.conversation.some(
          (msg) =>
            (msg.user && msg.user.toLowerCase().includes(query)) ||
            (msg.assistant && msg.assistant.toLowerCase().includes(query))
        ));

    // Filter based on selected tab
    if (selectedTab === "starred") {
      return matchesSearch && chat.isStarred;
    } else if (selectedTab === "archived") {
      return matchesSearch && chat.isArchived;
    }
    return matchesSearch && !chat.isArchived;
  });

  const handleExportAllChats = async () => {
    const zip = new JSZip();

    allChats.forEach((chat) => {
      const safeTitle = chat.title
        ? chat.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()
        : chat.id;
      // Ensure isStarred and isArchived are included in the exported data
      const chatData = {
        ...chat,
        isStarred: chat.isStarred || false,
        isArchived: chat.isArchived || false
      };
      zip.file(`chat_${safeTitle}.json`, JSON.stringify(chatData, null, 2));
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
              // Ensure imported chats have isStarred and isArchived properties
              chat.isStarred = Boolean(chat.isStarred);
              chat.isArchived = Boolean(chat.isArchived);
              
              if (!chat.id || !Array.isArray(chat.conversation)) return;
              const existingChatIndex = updated.findIndex((c) => c.id === chat.id);
              if (existingChatIndex !== -1) {
                // Update existing chat while preserving starred/archived status
                updated[existingChatIndex] = {
                  ...chat,
                  isStarred: chat.isStarred || updated[existingChatIndex].isStarred,
                  isArchived: chat.isArchived || updated[existingChatIndex].isArchived
                };
              } else {
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

  const ChatItem = ({ chat }) => (
    <HStack 
      key={chat.id} 
      w="100%" 
      spacing={1}
      onMouseEnter={() => setHoveredChatId(chat.id)}
      onMouseLeave={() => setHoveredChatId(null)}
      position="relative"
      pr={hoveredChatId === chat.id ? "0" : "8"}
    >
      <LuMessagesSquare />
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
      <HStack 
        spacing={1} 
        position="absolute" 
        right="0"
        opacity={hoveredChatId === chat.id ? 1 : 0}
        transition="opacity 0.2s"
        bg={sidebarBg}
      >
        <Tooltip label={chat.isStarred ? "Unstar" : "Star"}>
          <IconButton
            icon={<FiStar />}
            aria-label={chat.isStarred ? "Unstar" : "Star"}
            size="sm"
            colorScheme={chat.isStarred ? "yellow" : "gray"}
            variant={chat.isStarred ? "solid" : "ghost"}
            onClick={(e) => {
              e.stopPropagation();
              handleStarChat(chat.id);
            }}
          />
        </Tooltip>
        <Tooltip label={chat.isArchived ? "Unarchive" : "Archive"}>
          <IconButton
            icon={<FiArchive />}
            aria-label={chat.isArchived ? "Unarchive" : "Archive"}
            size="sm"
            colorScheme={chat.isArchived ? "purple" : "gray"}
            variant={chat.isArchived ? "solid" : "ghost"}
            onClick={(e) => {
              e.stopPropagation();
              handleArchiveChat(chat.id);
            }}
          />
        </Tooltip>
        <IconButton
          aria-label="Delete chat"
          icon={<span>&times;</span>}
          size="sm"
          colorScheme="red"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteChatClick(chat.id);
          }}
        />
      </HStack>
    </HStack>
  );

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

        <Tabs 
          isFitted 
          variant="enclosed" 
          onChange={(index) => {
            const tabs = ["all", "starred", "archived"];
            dispatch(setSelectedTab(tabs[index]));
          }}
          index={["all", "starred", "archived"].indexOf(selectedTab)}
          w="100%"
          size="sm"
          display="flex"
          flexDirection="column"
          flex="1"
          minH="0"
        >
          <TabList mb="1em">
            <Tab>All</Tab>
            <Tab>Starred</Tab>
            <Tab>Archived</Tab>
          </TabList>

          <TabPanels flex="1" minH="0">
            <TabPanel p={0} h="100%">
              <Box w="100%" h="100%" overflowY="auto">
                {filteredChats.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </Box>
            </TabPanel>
            <TabPanel p={0} h="100%">
              <Box w="100%" h="100%" overflowY="auto">
                {filteredChats.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </Box>
            </TabPanel>
            <TabPanel p={0} h="100%">
              <Box w="100%" h="100%" overflowY="auto">
                {filteredChats.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

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
