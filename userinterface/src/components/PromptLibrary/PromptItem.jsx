import {
  Box,
  HStack,
  Text,
  Textarea,
  Input,
  Button,
  IconButton,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import { useState } from "react";
import PropTypes from "prop-types";

export function PromptItem({
  prompt,
  searchQuery,
  onEdit,
  onDelete,
  onUse,
  isEditing,
  onSaveEdit,
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
                  onSave(prompt.id, editName, editContent);
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(null)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <IconButton
                icon={<CheckIcon />}
                size="sm"
                colorScheme="green"
                variant="ghost"
                aria-label="Use prompt"
                onClick={() => onUse(prompt.content)}
              />

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
          {!searchQuery
            ? String(prompt.content)
            : String(prompt.content)
                .split(
                  new RegExp(
                    `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                    "gi"
                  )
                )
                .map((part, i) =>
                  i % 2 === 1 ? <mark key={i}>{part}</mark> : part
                )}
        </Text>
      )}
    </Box>
  );
}

PromptItem.propTypes = {
  prompt: PropTypes.object.isRequired,
  searchQuery: PropTypes.string,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
};
