import { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSystemPrompt } from "../store/promptSlice";
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
  includeHistory,
  setIncludeHistory,
  waitingResponse,
  isLibraryOpen,
  setIsLibraryOpen,
  onLibraryClose,
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
            <IncludeHistorySwitch
              includeHistory={includeHistory}
              setIncludeHistory={setIncludeHistory}
              waitingResponse={waitingResponse}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={onSettingsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PromptLibrary isOpen={isLibraryOpen} onClose={onLibraryClose} />
    </>
  );
}

export default ChatSettings;
