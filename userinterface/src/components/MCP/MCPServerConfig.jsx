import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  Switch,
  IconButton,
  Text,
  useToast,
  Select,
  Badge
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';

const MCPServerConfig = ({ server, onSave, onDelete, onCancel, isNew = false }) => {
  const [isEditing, setIsEditing] = useState(isNew);
  const [config, setConfig] = useState(server || {
    name: '',
    type: 'stdio',
    command: '',
    args: [],
    env: {},
    url: '',
    headers: {},
    disabled: false
  });
  const [argsText, setArgsText] = useState(server?.args?.join(' ') || '');
  const [envText, setEnvText] = useState(
    server?.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const [headersText, setHeadersText] = useState(
    server?.headers ? Object.entries(server.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const toast = useToast();

  // Update form fields when server prop changes or when entering edit mode
  useEffect(() => {
    if (server && !isNew) {
      console.log('MCPServerConfig - server object:', server);
      console.log('MCPServerConfig - server.command:', server.command);
      console.log('MCPServerConfig - server.args:', server.args);
      setConfig(server);
      setArgsText(server.args?.join(' ') || '');
      setEnvText(
        server.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
      );
      setHeadersText(
        server.headers ? Object.entries(server.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''
      );
    }
  }, [server, isNew]);

  const handleSave = () => {
    console.log('Saving config:', config);
    if (!config.name.trim()) {
      toast({
        title: 'Error',
        description: 'Server name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate based on server type
    if (config.type === 'stdio') {
      if (!config.command.trim()) {
        toast({
          title: 'Error',
          description: 'Command is required for stdio servers',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    } else if (config.type === 'http') {
      if (!config.url.trim()) {
        toast({
          title: 'Error',
          description: 'URL is required for HTTP servers',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    // Parse args from text (for stdio servers)
    const args = argsText.trim() ? argsText.trim().split(/\s+/) : [];

    // Parse env from text
    const env = {};
    if (envText.trim()) {
      envText.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    // Parse headers from text (for HTTP servers)
    const headers = {};
    if (headersText.trim()) {
      headersText.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    const finalConfig = {
      ...config,
      args: config.type === 'stdio' ? args : [],
      env,
      headers: config.type === 'http' ? headers : {}
    };

    onSave(finalConfig);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isNew) {
      onCancel();
    } else {
      setIsEditing(false);
      // Reset to original values
      setConfig(server);
      setArgsText(server?.args?.join(' ') || '');
      setEnvText(
        server?.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
      );
      setHeadersText(
        server?.headers ? Object.entries(server.headers).map(([k, v]) => `${k}=${v}`).join('\n') : ''
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'green.500';
      case 'disconnected': return 'gray.500';
      case 'error': return 'red.500';
      default: return 'gray.500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  if (!isEditing && !isNew) {
    return (
      <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" mb={4}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2} flex={1}>
            <HStack>
              <Text fontWeight="bold" fontSize="lg">{server.name}</Text>
              <Badge colorScheme={server.type === 'http' ? 'blue' : 'green'} size="sm">
                {server.type?.toUpperCase() || 'STDIO'}
              </Badge>
              <Box
                w={3}
                h={3}
                borderRadius="full"
                bg={getStatusColor(server.status)}
              />
              <Text fontSize="sm" color={getStatusColor(server.status)}>
                {getStatusText(server.status)}
              </Text>
            </HStack>
            {server.type === 'http' ? (
              <Text fontSize="sm" color="gray.600">
                URL: {server.url}
              </Text>
            ) : (
              <Text fontSize="sm" color="gray.600">
                Command: {server.command} {server.args?.join(' ')}
              </Text>
            )}
            {server.lastError && (
              <Text fontSize="sm" color="red.500">
                Error: {server.lastError}
              </Text>
            )}
            {server.tools && server.tools.length > 0 && (
              <Text fontSize="sm" color="blue.600">
                Tools: {server.tools.length}
              </Text>
            )}
            {server.prompts && server.prompts.length > 0 && (
              <Text fontSize="sm" color="purple.600">
                Prompts: {server.prompts.length}
              </Text>
            )}
          </VStack>
          <HStack>
            <IconButton
              icon={<EditIcon />}
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            />
            <IconButton
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={() => onDelete(server.name)}
            />
          </HStack>
        </HStack>
      </Box>
    );
  }

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" mb={4}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">
            {isNew ? 'Add New MCP Server' : 'Edit MCP Server'}
          </Text>
          <HStack>
            <IconButton
              icon={<CheckIcon />}
              size="sm"
              colorScheme="green"
              onClick={handleSave}
            />
            <IconButton
              icon={<CloseIcon />}
              size="sm"
              variant="ghost"
              onClick={handleCancel}
            />
          </HStack>
        </HStack>

        <FormControl isRequired>
          <FormLabel>Server Name</FormLabel>
          <Input
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="e.g., filesystem, git, brave-search"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Server Type</FormLabel>
          <Select
            value={config.type}
            onChange={(e) => {
              const newType = e.target.value;
              setConfig({ ...config, type: newType });
              // Clear type-specific fields when switching
              if (newType === 'stdio') {
                setConfig(prev => ({ ...prev, type: newType, url: '', headers: {} }));
                setHeadersText('');
              } else if (newType === 'http') {
                setConfig(prev => ({ ...prev, type: newType, command: '', args: [] }));
                setArgsText('');
              }
            }}
          >
            <option value="stdio">STDIO (Process)</option>
            <option value="http">HTTP (Web Service)</option>
          </Select>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Choose how to communicate with the MCP server
          </Text>
        </FormControl>

        {config.type === 'stdio' && (
          <>
            <FormControl isRequired>
              <FormLabel>Command</FormLabel>
              <Input
                value={config.command}
                onChange={(e) => setConfig({ ...config, command: e.target.value })}
                placeholder="e.g., uvx, python, node"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Executable command to start the MCP server
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Arguments</FormLabel>
              <Input
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                placeholder="e.g., mcp-server-filesystem /path/to/files"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Space-separated command line arguments
              </Text>
            </FormControl>
          </>
        )}

        {config.type === 'http' && (
          <>
            <FormControl isRequired>
              <FormLabel>URL</FormLabel>
              <Input
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="e.g., http://localhost:3000/mcp, https://api.example.com/mcp"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                HTTP endpoint URL for the MCP server
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Headers</FormLabel>
              <Textarea
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder="Authorization=Bearer token123&#10;X-API-Key=your-api-key"
                rows={3}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                HTTP headers, one per line in Header=value format
              </Text>
            </FormControl>
          </>
        )}

        <FormControl>
          <FormLabel>Environment Variables</FormLabel>
          <Textarea
            value={envText}
            onChange={(e) => setEnvText(e.target.value)}
            placeholder="KEY1=value1&#10;KEY2=value2"
            rows={3}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Environment variables, one per line in KEY=value format
          </Text>
        </FormControl>

        <FormControl>
          <HStack>
            <FormLabel mb={0}>Disabled</FormLabel>
            <Switch
              isChecked={config.disabled}
              onChange={(e) => setConfig({ ...config, disabled: e.target.checked })}
            />
          </HStack>
        </FormControl>
      </VStack>
    </Box>
  );
};

export default MCPServerConfig;