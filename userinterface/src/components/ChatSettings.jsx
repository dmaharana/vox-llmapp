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
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import IncludeHistorySwitch from "./IncludeHistorySwitch";

function ChatSettings({
  systemPrompt,
  setSystemPrompt,
  includeHistory,
  setIncludeHistory,
  waitingResponse,
}) {
  function handleChange(e) {
    setSystemPrompt(e.target.value);
  }

  const toolTipMessage = "Edit settings";
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [scrollBehavior, setScrollBehavior] = useState("inside");

  const btnRef = useRef(null);

  return (
    // <Box p={2} borderRadius={"md"} mb={2} align={"start"}>
    <>
      <Tooltip label={toolTipMessage} fontSize={"xs"}>
        <IconButton
          icon={<SettingsIcon />}
          size="lg"
          variant="ghost"
          color="green.500"
          ref={btnRef}
          isDisabled={waitingResponse}
          onClick={onOpen}
        />
      </Tooltip>

      <Modal
        onClose={onClose}
        finalFocusRef={btnRef}
        isOpen={isOpen}
        scrollBehavior={scrollBehavior}
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
    </>
    // </Box>
  );
}

export default ChatSettings;
