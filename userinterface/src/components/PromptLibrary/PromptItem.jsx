import { Box, HStack, Text, Textarea, Input, Button, IconButton } from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useState } from "react";

export function PromptItem({
  prompt,
  searchQuery,
  onEdit,
  onDelete,
  onUse,
  isEditing,
  onSaveEdit
}) {
  const [editName, setEditName] = useState(prompt.name);
  const [editContent, setEditContent] = useState(prompt.content);

  return (
    <Box p={2} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            size="sm"
            fontWeight="bold"
          />
        ) : (
          <Text fontWeight="bold">{prompt.name}</Text>
        )}
        <HStack>
          {isEditing ? (
            <>
              <Button
                size="sm"
                colorScheme="green"
                onClick={() => {
                  onSaveEdit(prompt.id, editName, editContent);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={onUse}
              >
                Use
              </Button>
              <IconButton
                icon={<EditIcon />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                aria-label="Edit prompt"
                onClick={() => onEdit(prompt.id)}
              />
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                aria-label="Delete prompt"
                onClick={() => onDelete(prompt.id)}
              />
            </>
          )}
        </HStack>
      </HStack>
      {isEditing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          fontSize="sm"
          mt={2}
          resize="vertical"
        />
      ) : (
        <Text fontSize="sm" mt={2}>
          {!searchQuery ? prompt.content : 
            prompt.content.split(new RegExp(`(${searchQuery})`, "gi"))
              .map((part, i) => i % 2 === 1 ? <mark key={i}>{part}</mark> : part)
          }
        </Text>
      )}
    </Box>
  );
}
