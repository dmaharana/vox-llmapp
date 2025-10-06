import {
  Box,
  HStack,
  Text,
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
  StarIcon,
} from "@chakra-ui/icons";
import { useState } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "markdown-to-jsx";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import { DEFAULT_MESSAGES } from "../Constants";

/**
 * Strips all <think>...</think> tags and their content from a string.
 * Used as a global safeguard before rendering markdown.
 */
function stripThinkTags(markdown) {
  return markdown.replace(/<think>[\s\S]*?<\/think>/gi, "");
}

export function PromptItem({
  prompt,
  searchQuery,
  onEdit,
  onDelete,
  onUse,
  onToggleStar,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxContentLength = 100;

  return (
    <Box p={2} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between">
        <Text fontWeight="bold">{prompt.name}</Text>
        <HStack>
          <IconButton
            icon={<StarIcon />}
            size="sm"
            colorScheme={prompt.starred ? "yellow" : "gray"}
            variant={prompt.starred ? "solid" : "ghost"}
            aria-label={prompt.starred ? "Unstar prompt" : "Star prompt"}
            onClick={() => onToggleStar(prompt.id)}
          />

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
            onClick={() => onEdit(prompt)}
          />

          <IconButton
            icon={<DeleteIcon />}
            size="sm"
            colorScheme="red"
            variant="ghost"
            aria-label="Delete prompt"
            onClick={() => onDelete(prompt.id)}
          />
        </HStack>
      </HStack>
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
          {stripThinkTags(
            prompt.content.length <= maxContentLength || isExpanded
              ? prompt.content
              : prompt.content.substring(0, maxContentLength + 3) + "..."
          )}
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
    </Box>
  );
}

PromptItem.propTypes = {
  prompt: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    starred: PropTypes.bool,
  }).isRequired,
  searchQuery: PropTypes.string,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  onToggleStar: PropTypes.func.isRequired,
};
