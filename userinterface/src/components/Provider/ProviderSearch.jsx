import { InputGroup, InputLeftElement, Input, Button, HStack } from "@chakra-ui/react";
import { AddIcon, SearchIcon, CloseIcon } from "@chakra-ui/icons";

export function ProviderSearch({
  searchQuery,
  setSearchQuery,
  showAddProvider,
  setShowAddProvider,
  editingProvider
}) {
  return (
    <HStack mb={4} spacing={3}>
      <InputGroup flex="1">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          pl="3rem"
        />
      </InputGroup>

      <Button
        leftIcon={!editingProvider && showAddProvider ? <CloseIcon /> : <AddIcon />}
        colorScheme="blue"
        size="sm"
        onClick={() => setShowAddProvider(!showAddProvider)}
        title={!editingProvider && showAddProvider ? "Close" : "Add new provider"}
      >
        {!editingProvider && showAddProvider ? "Close" : "New"}
      </Button>
    </HStack>
  );
}
