import {
  Box,
  HStack,
  Text,
  Textarea,
  Input,
  Button,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  EditIcon,
  DeleteIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@chakra-ui/icons";
import { useState, useRef } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "markdown-to-jsx";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import { DEFAULT_MESSAGES } from "../Constants";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const maxContentLength = 100;

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
        <Box mt={2}>
          <ReactMarkdown
            components={ChakraUIRenderer()}
            skiphtml="true"
            align="left"
            sx={{
              p: "20px",
              borderRadius: "10px",
            }}
          >
            {prompt.content.length <= maxContentLength || isExpanded
              ? prompt.content
              : prompt.content.substring(0, maxContentLength + 3) + "..."}
          </ReactMarkdown>

          {String(prompt.content).length > maxContentLength && (
            <Button
              size="xs"
              colorScheme="blue"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Tooltip label={DEFAULT_MESSAGES.collapseMessage}>
                  <ChevronUpIcon boxSize="1.5rem" color="green" />
                </Tooltip>
              ) : (
                <Tooltip label={DEFAULT_MESSAGES.expandMessage}>
                  <ChevronDownIcon boxSize="1.5rem" color="green" />
                </Tooltip>
              )}
            </Button>
          )}
        </Box>
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
  onSaveEdit: PropTypes.func.isRequired,
};
