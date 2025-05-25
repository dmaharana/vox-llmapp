import PropTypes from "prop-types";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Input,
  Text,
  Textarea,
  Button,
  FormLabel,
  FormControl,
  HStack,
} from "@chakra-ui/react";
import { DEFAULT_MESSAGES } from "../Constants";
import { useToast } from "@chakra-ui/react";

// export function AddPromptForm({ onAddPrompt, isOpen, onClose }) {
export function AddPromptForm({
  showAddPrompt,
  newPromptName,
  setNewPromptName,
  newPromptContent,
  setNewPromptContent,
  onSave,
  setShowAddPrompt,
  prompts,
}) {
  const toast = useToast();
  const handleSubmit = (e) => {
    e.preventDefault();

    // check for unique name
    const otherNames = prompts.map((prompt) => prompt.name);
    if (otherNames.includes(newPromptName)) {
      toast({
        title: "Error",
        description: "Name must be unique",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (newPromptName && newPromptContent) {
      onSave();
    }
    setShowAddPrompt(false);
    setNewPromptName("");
    setNewPromptContent("");

    toast({
      title: "Success",
      description: "Prompt added successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleCancel = () => {
    setShowAddPrompt(false);
    setNewPromptName("");
    setNewPromptContent("");
    toast({
      title: "Success",
      description: "Prompt add cancelled",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Drawer
      isOpen={showAddPrompt}
      placement="right"
      onClose={() => setShowAddPrompt(false)}
      size="md"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Add Prompt</DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSubmit}>
            <FormControl isRequired>
              <FormLabel>Prompt name</FormLabel>
              <Input
                placeholder={DEFAULT_MESSAGES.addPromptNameMessage}
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                mb={3}
                isRequired
              />
              {prompts.some((prompt) => prompt.name === newPromptName) && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  Name already exists
                </Text>
              )}
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Prompt content</FormLabel>
              <Textarea
                placeholder={DEFAULT_MESSAGES.addPromptContentMessage}
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                mb={3}
                isRequired
              />
            </FormControl>
          </form>
        </DrawerBody>

        <DrawerFooter>
          <HStack width="full" justify="space-between" mb={4}>
            <Button
              colorScheme="blue"
              width="48%"
              isDisabled={!newPromptName || !newPromptContent}
              mr={3}
              onClick={handleSubmit}
            >
              Add Prompt
            </Button>
            <Button variant="outline" onClick={handleCancel} width="48%">
              Cancel
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

AddPromptForm.propTypes = {
  showAddPrompt: PropTypes.bool.isRequired,
  newPromptName: PropTypes.string.isRequired,
  setNewPromptName: PropTypes.func.isRequired,
  newPromptContent: PropTypes.string.isRequired,
  setNewPromptContent: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
