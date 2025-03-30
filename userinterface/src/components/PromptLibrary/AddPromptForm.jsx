import { Input, Textarea, Button, Box } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useState } from "react";

export function AddPromptForm({ onAddPrompt }) {
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");

  const handleAdd = () => {
    if (newPromptName && newPromptContent) {
      onAddPrompt({
        id: crypto.randomUUID(),
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
