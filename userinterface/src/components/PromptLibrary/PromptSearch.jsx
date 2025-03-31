import { InputGroup, InputLeftElement, Input, Button, HStack } from "@chakra-ui/react";
import { AddIcon, SearchIcon } from "@chakra-ui/icons";

export function PromptSearch({
  searchQuery,
  setSearchQuery,
  showAddPrompt,
  setShowAddPrompt
}) {
  return (
    <HStack mb={4} spacing={3}>
      <InputGroup flex="1">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          pl="3rem"
        />
      </InputGroup>

      <Button
        leftIcon={<AddIcon />}
        colorScheme="blue"
        size="sm"
        onClick={() => setShowAddPrompt(!showAddPrompt)}
        title={showAddPrompt ? "Close" : "Add new prompt"}
      >
        {showAddPrompt ? "Close" : "New"}
      </Button>
    </HStack>
  );
}
