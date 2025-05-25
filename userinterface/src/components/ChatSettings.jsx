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
  useDisclosure,
  VStack,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
import UserNameEdit from "./UserNameEdit";

function ChatSettings({
  includeHistory,
  setIncludeHistory,
  waitingResponse,
  isLibraryOpen,
  setIsLibraryOpen,
  onLibraryClose,
  isProviderOpen,
  setIsProviderOpen,
  onProviderClose,
  isAddProviderOpen,
  setIsAddProviderOpen,
  onAddProviderClose,
}) {
  const dispatch = useDispatch();
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);

  function handleChange(e) {
    dispatch(setSystemPrompt(e.target.value));
  }

  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();
  const btnRef = useRef(null);

  return (
    <>
      <Menu>
        <MenuButton
          as={IconButton}
          icon={<SettingsIcon />}
          size="lg"
          variant="ghost"
          color="green.500"
          ref={btnRef}
          isDisabled={waitingResponse}
        />
        <MenuList>
          <MenuItem onClick={onSettingsOpen}>Settings</MenuItem>
          <MenuItem
            onClick={() => {
              onSettingsClose();
              setIsLibraryOpen(true);
            }}
          >
            Prompt Library
          </MenuItem>
          <MenuItem
            onClick={() => {
              onSettingsClose();
              setIsProviderOpen(true);
            }}
          >
            Provider Management
          </MenuItem>
        </MenuList>
      </Menu>

      <Modal
        onClose={onSettingsClose}
        finalFocusRef={btnRef}
        isOpen={isSettingsOpen}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Profile</Tab>
                <Tab>Chat</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>User Profile</Text>
                      <UserNameEdit />
                      <Box mt={4}>
                        <AvatarUpload />
                      </Box>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>Chat Settings</Text>
                      <Box mb={4}>
                        <Text mb={2}>System Prompt</Text>
                        <Textarea
                          size="sm"
                          value={systemPrompt}
                          onChange={(e) => handleChange(e)}
                        />
                        <Button
                          mt={2}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onSettingsClose();
                            setIsLibraryOpen(true);
                          }}
                        >
                          Select from Library
                        </Button>
                      </Box>
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
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onSettingsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PromptLibrary isOpen={isLibraryOpen} onClose={onLibraryClose} />

      <ProviderManagement isOpen={isProviderOpen} onClose={onProviderClose} />
    </>
  );
}

export default ChatSettings;
