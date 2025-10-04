import { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSystemPrompt } from "../store/promptSlice";
import {
  Text,
  Textarea,
  IconButton,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
  Box,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import IncludeHistorySwitch from "./IncludeHistorySwitch";
import PromptLibrary from "./PromptLibrary";
import ProviderManagement from "./ProviderManagement";
import AvatarUpload from "./AvatarUpload";
import UserNameEdit from "./UserProfile/UserNameEdit";
import ChatModeSwitch from "./UserProfile/ChatModeSwitch";
import { useColorModeValue } from "@chakra-ui/react";
import MCPLibrary from "./MCP/MCPLibrary";
import ToolLibrary from "./Tool/ToolLibrary";
import AgentLibrary from "./Agent/AgentLibrary";

function ChatSettings({
  includeHistory,
  setIncludeHistory,
  waitingResponse,
  defaultTab,
  isSettingsOpen,
  setIsSettingsOpen,
}) {
  const dispatch = useDispatch();
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);

  function handleChange(e) {
    dispatch(setSystemPrompt(e.target.value));
  }

  const btnRef = useRef(null);
  const tabList = [
    "prompt",
    "chat",
    "provider",
    "mcp",
    "tool",
    "agent",
    "profile",
  ];
  const disabledTabs = ["tool", "agent"];
  const defaultTabName = defaultTab || tabList[0];
  const defaultTabIndex = tabList.indexOf(defaultTabName);

  // set border color constant for dark mode
  const borderColor = useColorModeValue("green.200", "green.700");

  return (
    <>
      <IconButton
        icon={<SettingsIcon />}
        size="lg"
        variant="ghost"
        color="green.500"
        ref={btnRef}
        isDisabled={waitingResponse}
        onClick={() => setIsSettingsOpen(true)}
      />

      <Modal
        onClose={() => setIsSettingsOpen(false)}
        finalFocusRef={btnRef}
        isOpen={isSettingsOpen}
        scrollBehavior="inside"
        size="6xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent maxW="60rem" w="90%" maxH="80vh" h="50rem" m={0}>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="hidden" p={0}>
            <Tabs
              orientation="vertical"
              variant="line"
              isLazy
              defaultIndex={defaultTabIndex}
              h="100%"
            >
              {/* <Tabs isFitted variant="enclosed" isLazy defaultIndex={defaultTabIndex} > */}
              <TabList
                w="10rem"
                minW="10rem"
                borderRight="1px"
                borderColor={borderColor}
                h="100%"
                pt={4}
              >
                <Box position="sticky" top={0}>
                  {tabList.map((tab) => (
                    <Tab key={tab} value={tab} isDisabled={disabledTabs.includes(tab)}>
                      {tab === "mcp"
                        ? "MCP"
                        : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Tab>
                  ))}
                </Box>
              </TabList>
              <TabPanels h="100%" overflowY="auto" p={6}>
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>
                        System Prompt
                      </Text>
                      <Box mb={4}>
                        <Text mb={2}>Current Prompt</Text>
                        <Textarea
                          size="sm"
                          value={systemPrompt}
                          onChange={(e) => handleChange(e)}
                          mb={3}
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xl" fontWeight="bold" mb={4}>
                          Prompt Library
                        </Text>
                        <PromptLibrary
                          isOpen={true}
                          onClose={() => {}}
                          isEmbedded={true}
                        />
                      </Box>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>
                        Chat Settings
                      </Text>
                      <Box>
                        <IncludeHistorySwitch
                          includeHistory={includeHistory}
                          setIncludeHistory={setIncludeHistory}
                          waitingResponse={waitingResponse}
                        />
                      </Box>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <ProviderManagement />
                </TabPanel>
                <TabPanel>
                  <MCPLibrary />
                </TabPanel>
                <TabPanel>
                  <ToolLibrary />
                </TabPanel>
                <TabPanel>
                  <AgentLibrary />
                </TabPanel>
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>
                        User Profile
                      </Text>
                      <UserNameEdit />
                      <Box mt={4}>
                        <AvatarUpload />
                      </Box>
                      <Box mt={4}>
                        <ChatModeSwitch />
                      </Box>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default ChatSettings;
