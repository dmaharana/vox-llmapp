import PropTypes from "prop-types";
import { Input, Textarea, Button, Box } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useState } from "react";

export function AddPromptForm({ onAddPrompt }) {
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");

  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleAdd = () => {
    if (newPromptName && newPromptContent) {
      onAddPrompt({
        id: generateId(),
        name: newPromptName,
        content: newPromptContent,
      });
      setNewPromptName("");
      setNewPromptContent("");
    }
  };

  return (
    <Box pb={4}>
      <Input
        placeholder="Prompt name"
        value={newPromptName}
        onChange={(e) => setNewPromptName(e.target.value)}
        mb={3}
      />
      <Textarea
        placeholder="Prompt content"
        value={newPromptContent}
        onChange={(e) => setNewPromptContent(e.target.value)}
        mb={3}
      />
      <Box display="flex" justifyContent="flex-end">
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={handleAdd}
          isDisabled={!newPromptName || !newPromptContent}
          mt={3}
        >
          Add Prompt
        </Button>
      </Box>
    </Box>
  );
}

AddPromptForm.propTypes = {
  onAddPrompt: PropTypes.func.isRequired,
};
