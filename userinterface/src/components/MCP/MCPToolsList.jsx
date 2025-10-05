import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Button,
  Input,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { fetchMCPTools, callMCPTool } from '../../api/mcpApi';

const MCPToolsList = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toolResults, setToolResults] = useState({});
  const [toolInputs, setToolInputs] = useState({});
  const [callingTool, setCallingTool] = useState(null);
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadTools();
  }, []);

  console.log('MCPToolsList - Current tools state:', tools);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      const toolsData = await fetchMCPTools();
      console.log('MCPToolsList - Raw tools data from API:', toolsData);
      setTools(toolsData);
    } catch (err) {
      console.error('Error loading tools:', err);
      setError(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const handleToolCall = async (toolName) => {
    try {
      setCallingTool(toolName);
      const inputs = toolInputs[toolName] || {};
      const result = await callMCPTool(toolName, inputs);
      
      setToolResults(prev => ({
        ...prev,
        [toolName]: result
      }));

      toast({
        title: 'Success',
        description: `Tool "${toolName}" executed successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error calling tool:', err);
      toast({
        title: 'Error',
        description: `Failed to call tool "${toolName}": ${err.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCallingTool(null);
    }
  };

  const updateToolInput = (toolName, paramName, value) => {
    setToolInputs(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [paramName]: value
      }
    }));
  };

  const renderToolParameters = (tool) => {
    const schema = tool.inputSchema;
    if (!schema || !schema.properties) {
      return <Text fontSize="sm" color="gray.500">No parameters required</Text>;
    }

    return (
      <VStack spacing={3} align="stretch">
        {Object.entries(schema.properties).map(([paramName, paramSchema]) => {
          const isRequired = schema.required?.includes(paramName);
          const currentValue = toolInputs[tool.name]?.[paramName] || '';

          return (
            <FormControl key={paramName} isRequired={isRequired}>
              <FormLabel fontSize="sm">
                {paramName}
                {isRequired && <Text as="span" color="red.500"> *</Text>}
              </FormLabel>
              {paramSchema.type === 'string' && paramSchema.description?.includes('long') ? (
                <Textarea
                  size="sm"
                  placeholder={paramSchema.description}
                  value={currentValue}
                  onChange={(e) => updateToolInput(tool.name, paramName, e.target.value)}
                />
              ) : (
                <Input
                  size="sm"
                  placeholder={paramSchema.description}
                  value={currentValue}
                  onChange={(e) => updateToolInput(tool.name, paramName, e.target.value)}
                />
              )}
              {paramSchema.description && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {paramSchema.description}
                </Text>
              )}
            </FormControl>
          );
        })}
      </VStack>
    );
  };

  const renderToolResult = (toolName) => {
    const result = toolResults[toolName];
    if (!result) return null;

    return (
      <Box mt={4} p={3} bg={bgColor} borderRadius="md">
        <Text fontWeight="semibold" mb={2}>Result:</Text>
        {result.isError ? (
          <Alert status="error" size="sm">
            <AlertIcon />
            <Text fontSize="sm">{result.content?.[0]?.text || 'Unknown error'}</Text>
          </Alert>
        ) : (
          <Box>
            {result.content?.map((content, index) => (
              <Box key={index} mb={2}>
                {content.type === 'text' ? (
                  <Code p={2} display="block" whiteSpace="pre-wrap" fontSize="sm">
                    {content.text}
                  </Code>
                ) : (
                  <Text fontSize="sm">{JSON.stringify(content, null, 2)}</Text>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="md" />
        <Text mt={2}>Loading MCP tools...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Error loading tools</Text>
          <Text fontSize="sm">{error}</Text>
        </Box>
        <Button size="sm" ml="auto" onClick={loadTools}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (tools.length === 0) {
    return (
      <Box textAlign="center" py={8} bg={bgColor} borderRadius="md">
        <Text color="gray.500" mb={2}>No MCP tools available</Text>
        <Text fontSize="sm" color="gray.400">
          Connect to MCP servers to see available tools
        </Text>
        <Button size="sm" mt={3} onClick={loadTools}>
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold">
          Available Tools ({tools.length})
        </Text>
        <Button size="sm" onClick={loadTools} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <Accordion allowMultiple>
        {tools.map((tool, index) => {
          console.log('MCPToolsList - Rendering tool:', tool);
          
          // Parse server name and tool name from the format "ServerName: ToolName"
          const toolNameParts = tool.name.split(': ');
          const serverName = toolNameParts.length > 1 ? toolNameParts[0] : '';
          const actualToolName = toolNameParts.length > 1 ? toolNameParts.slice(1).join(': ') : tool.name;
          
          return (
            <AccordionItem key={`${tool.name}-${index}`}>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  <HStack spacing={2}>
                    {serverName && (
                      <Badge colorScheme="purple" fontSize="xs">
                        {serverName}
                      </Badge>
                    )}
                    <Text fontWeight="semibold">{actualToolName}</Text>
                    <Badge colorScheme="blue" size="sm">Tool</Badge>
                  </HStack>
                  {tool.description && (
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      {tool.description}
                    </Text>
                  )}
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Parameters:</Text>
                    {renderToolParameters(tool)}
                  </Box>

                  <Divider />

                  <HStack>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => handleToolCall(tool.name)}
                      isLoading={callingTool === tool.name}
                      loadingText="Calling..."
                    >
                      Call Tool
                    </Button>
                    {toolResults[tool.name] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setToolResults(prev => {
                          const newResults = { ...prev };
                          delete newResults[tool.name];
                          return newResults;
                        })}
                      >
                        Clear Result
                      </Button>
                    )}
                  </HStack>

                  {renderToolResult(tool.name)}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Box>
  );
};

export default MCPToolsList;