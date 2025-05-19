import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  Button,
  IconButton,
  List,
  ListItem,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import { useState } from "react";
import PropTypes from "prop-types";

// provider
// name
// api_key
// models
// endpoint

export function ProviderItem({
  provider,
  onEdit,
  onDelete,
  onUse,
  isEditing,
  onSaveEdit,
}) {
  const [editName, setEditName] = useState(provider.name);
  const [editApiKey, setEditApiKey] = useState(provider.api_key);
  const [editModels, setEditModels] = useState(provider.models);

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
          <Text fontWeight="bold">{provider.name}</Text>
        )}
        <HStack>
          {isEditing ? (
            <>
              <Button
                size="sm"
                colorScheme="green"
                onClick={() => {
                  onSaveEdit(provider.id, editName, editApiKey, editModels);
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
                onClick={() => onUse(provider.api_key)}
              />

              <IconButton
                icon={<EditIcon />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                aria-label="Edit prompt"
                onClick={() => onEdit(provider.id)}
              />

              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                aria-label="Delete prompt"
                onClick={() => onDelete(provider.id)}
              />
            </>
          )}
        </HStack>
      </HStack>
      {isEditing ? (
        <>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            size="sm"
            fontWeight="bold"
          />
          <Input
            value={editApiKey}
            onChange={(e) => setEditApiKey(e.target.value)}
            size="sm"
            fontWeight="bold"
          />
          <Input
            value={editModels}
            onChange={(e) => setEditModels(e.target.value)}
            size="sm"
            fontWeight="bold"
          />
        </>
      ) : (
        <VStack mt={2}>
          <Box overflowX="auto">
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Endpoint</th>
                  <th>API Key</th>
                  <th>Models</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{provider.provider_name}</td>
                  <td>{provider.endpoint}</td>
                  <td style={{ wordBreak: "break-word" }}>
                    <Text
                      noOfLines={1}
                      fontWeight="bold"
                      fontSize="sm"
                      color="gray.500"
                    >
                      {provider.api_key}
                    </Text>
                  </td>
                  <td>
                    <List>
                      {provider.models.map((model) => (
                        <ListItem key={model} fontSize="sm">{model}</ListItem>
                      ))}
                    </List>
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </VStack>
      )}
    </Box>
  );
}

ProviderItem.propTypes = {
  provider: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  onSaveEdit: PropTypes.func.isRequired,
};
