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
import { useState, useEffect } from "react";

export function AddPromptForm({
  isOpen,
  onClose,
  initialPrompt = null,
  onSave,
  prompts,
}) {
  const toast = useToast();
  const isEditing = !!initialPrompt;
  const [promptName, setPromptName] = useState(initialPrompt?.name || "");
  const [promptContent, setPromptContent] = useState(initialPrompt?.content || "");

  // Update form values when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setPromptName(initialPrompt.name);
      setPromptContent(initialPrompt.content);
    } else {
      setPromptName("");
      setPromptContent("");
    }
  }, [initialPrompt]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPromptName("");
      setPromptContent("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // check for unique name, but exclude current prompt if editing
    const otherNames = prompts
      .filter(p => !isEditing || p.id !== initialPrompt.id)
      .map(p => p.name);

    if (otherNames.includes(promptName)) {
      toast({
        title: "Error",
        description: "Name must be unique",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (promptName && promptContent) {
      onSave(promptName, promptContent, initialPrompt?.id);
      onClose();

      toast({
        title: "Success",
        description: `Prompt ${isEditing ? 'updated' : 'added'} successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="lg"
    >
      <DrawerOverlay />
      <DrawerContent maxW="800px">
        <DrawerCloseButton />
        <DrawerHeader>{isEditing ? 'Edit Prompt' : 'Add Prompt'}</DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSubmit}>
            <FormControl isRequired>
              <FormLabel>Prompt name</FormLabel>
              <Input
                placeholder={DEFAULT_MESSAGES.addPromptNameMessage}
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                mb={3}
                isRequired
              />
              {prompts.some((p) => p.name === promptName && (!isEditing || p.id !== initialPrompt.id)) && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  Name already exists
                </Text>
              )}
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Prompt content</FormLabel>
              <Textarea
                placeholder={DEFAULT_MESSAGES.addPromptContentMessage}
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                mb={3}
                isRequired
                minH="500px"
                fontSize="md"
                lineHeight="tall"
                resize="vertical"
              />
            </FormControl>
          </form>
        </DrawerBody>

        <DrawerFooter>
          <HStack width="full" justify="space-between" mb={4}>
            <Button
              colorScheme="blue"
              width="48%"
              isDisabled={!promptName || !promptContent}
              mr={3}
              onClick={handleSubmit}
            >
              {isEditing ? 'Save Changes' : 'Add Prompt'}
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
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialPrompt: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }),
  onSave: PropTypes.func.isRequired,
  prompts: PropTypes.array.isRequired,
};
