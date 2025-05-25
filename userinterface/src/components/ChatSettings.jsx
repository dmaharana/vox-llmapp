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
      <IconButton
        icon={<SettingsIcon />}
        size="lg"
        variant="ghost"
        color="green.500"
        ref={btnRef}
        isDisabled={waitingResponse}
        onClick={onSettingsOpen}
      />

      <Modal
        onClose={onSettingsClose}
        finalFocusRef={btnRef}
        isOpen={isSettingsOpen}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent maxW="container.md">
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Profile</Tab>
                <Tab>Chat</Tab>
                <Tab>Prompts</Tab>
                <Tab>Provider</Tab>
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
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontSize="xl" fontWeight="bold" mb={4}>System Prompt</Text>
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
                        <Text fontSize="xl" fontWeight="bold" mb={4}>Prompt Library</Text>
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
                  <ProviderManagement 
                    isOpen={true} 
                    onClose={() => {}}
                    isEmbedded={true}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onSettingsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>


    </>
  );
}

export default ChatSettings;
