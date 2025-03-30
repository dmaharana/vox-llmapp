import { useState, useRef } from "react";
import {
  Box,
  Text,
  Textarea,
  Tooltip,
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import IncludeHistorySwitch from "./IncludeHistorySwitch";
import PromptLibrary from "./PromptLibrary";
import { DEFAULT_MESSAGES } from "./Constants";
function ChatSettings({
  systemPrompt,
  setSystemPrompt,
  includeHistory,
  setIncludeHistory,
  waitingResponse,
  isLibraryOpen,
  onLibraryClose,
}) {
  function handleChange(e) {
    setSystemPrompt(e.target.value);
  }

  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef(null);

  const onLibraryOpen = () => {
    onLibraryClose();
    onOpen();
  };

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
          <MenuItem onClick={onOpen}>Settings</MenuItem>
          <MenuItem onClick={onLibraryOpen}>Prompt Library</MenuItem>
        </MenuList>
      </Menu>

      <Modal
        onClose={onClose}
        finalFocusRef={btnRef}
        isOpen={isOpen}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
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
                onLibraryOpen();
                onClose();
              }}
            >
              Select from Library
            </Button>
            <IncludeHistorySwitch
              includeHistory={includeHistory}
              setIncludeHistory={setIncludeHistory}
              waitingResponse={waitingResponse}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PromptLibrary
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        isOpen={isLibraryOpen}
        onClose={onLibraryClose}
      />
    </>
    // </Box>
  );
}

export default ChatSettings;
