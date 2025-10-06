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
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { fetchMCPPrompts, getMCPPrompt } from '../../api/mcpApi';

const MCPPromptsList = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [promptResults, setPromptResults] = useState({});
  const [promptInputs, setPromptInputs] = useState({});
  const [callingPrompt, setCallingPrompt] = useState(null);
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const messageBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const promptsData = await fetchMCPPrompts();
      setPrompts(promptsData);
    } catch (err) {
      console.error('Error loading prompts:', err);
      setError(err.message || 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptCall = async (promptName) => {
    try {
      setCallingPrompt(promptName);
      const inputs = promptInputs[promptName] || {};
      const result = await getMCPPrompt(promptName, inputs);
      
      setPromptResults(prev => ({
        ...prev,
        [promptName]: result
      }));

      toast({
        title: 'Success',
        description: `Prompt "${promptName}" retrieved successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error calling prompt:', err);
      toast({
        title: 'Error',
        description: `Failed to get prompt "${promptName}": ${err.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCallingPrompt(null);
    }
  };

  const updatePromptInput = (promptName, paramName, value) => {
    setPromptInputs(prev => ({
      ...prev,
      [promptName]: {
        ...prev[promptName],
        [paramName]: value
      }
    }));
  };

  const renderPromptArguments = (prompt) => {
    if (!prompt.arguments || prompt.arguments.length === 0) {
      return <Text fontSize="sm" color="gray.500">No arguments required</Text>;
    }

    return (
      <VStack spacing={3} align="stretch">
        {prompt.arguments.map((arg) => {
          const currentValue = promptInputs[prompt.name]?.[arg.name] || '';

          return (
            <FormControl key={arg.name} isRequired={arg.required}>
              <FormLabel fontSize="sm">
                {arg.name}
                {arg.required && <Text as="span" color="red.500"> *</Text>}
              </FormLabel>
              <Input
                size="sm"
                placeholder={arg.description}
                value={currentValue}
                onChange={(e) => updatePromptInput(prompt.name, arg.name, e.target.value)}
              />
              {arg.description && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {arg.description}
                </Text>
              )}
            </FormControl>
          );
        })}
      </VStack>
    );
  };

  const renderPromptResult = (promptName) => {
    const result = promptResults[promptName];
    if (!result) return null;

    return (
      <Box mt={4} p={3} bg={bgColor} borderRadius="md">
        <Text fontWeight="semibold" mb={2}>Result:</Text>
        {result.description && (
          <Text fontSize="sm" mb={3} color="gray.600">
            {result.description}
          </Text>
        )}
        {result.messages?.map((message, index) => (
          <Box key={index} mb={3} p={2} bg={messageBgColor} borderRadius="md" border="1px" borderColor={borderColor}>
            <HStack mb={2}>
              <Badge colorScheme={message.role === 'user' ? 'blue' : 'green'} size="sm">
                {message.role}
              </Badge>
            </HStack>
            <Code p={2} display="block" whiteSpace="pre-wrap" fontSize="sm">
              {message.content?.text || JSON.stringify(message.content, null, 2)}
            </Code>
          </Box>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="md" />
        <Text mt={2}>Loading MCP prompts...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Error loading prompts</Text>
          <Text fontSize="sm">{error}</Text>
        </Box>
        <Button size="sm" ml="auto" onClick={loadPrompts}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (prompts.length === 0) {
    return (
      <Box textAlign="center" py={8} bg={bgColor} borderRadius="md">
        <Text color="gray.500" mb={2}>No MCP prompts available</Text>
        <Text fontSize="sm" color="gray.400">
          Connect to MCP servers to see available prompts
        </Text>
        <Button size="sm" mt={3} onClick={loadPrompts}>
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold">
          Available Prompts ({prompts.length})
        </Text>
        <Button size="sm" onClick={loadPrompts} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <Accordion allowMultiple>
        {prompts.map((prompt, index) => (
          <AccordionItem key={`${prompt.name}-${index}`}>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Text fontWeight="semibold">{prompt.name}</Text>
                  <Badge colorScheme="purple" size="sm">Prompt</Badge>
                </HStack>
                {prompt.description && (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {prompt.description}
                  </Text>
                )}
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" mb={2}>Arguments:</Text>
                  {renderPromptArguments(prompt)}
                </Box>

                <Divider />

                <HStack>
                  <Button
                    size="sm"
                    colorScheme="purple"
                    onClick={() => handlePromptCall(prompt.name)}
                    isLoading={callingPrompt === prompt.name}
                    loadingText="Getting..."
                  >
                    Get Prompt
                  </Button>
                  {promptResults[prompt.name] && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPromptResults(prev => {
                        const newResults = { ...prev };
                        delete newResults[prompt.name];
                        return newResults;
                      })}
                    >
                      Clear Result
                    </Button>
                  )}
                </HStack>

                {renderPromptResult(prompt.name)}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  );
};

export default MCPPromptsList;