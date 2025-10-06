import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Textarea,
  Button,
  Alert,
  AlertIcon,
  Code,
  useColorModeValue
} from '@chakra-ui/react';
import { callMCPTool, getMCPPrompt } from '../../api/mcpApi';
import { useSelector } from 'react-redux';

const ToolCall = ({ onToolCall, onPromptCall }) => {
  const { tools, prompts, enabledTools, enabledPrompts } = useSelector(state => state.mcp || {
    tools: [],
    prompts: [],
    enabledTools: {},
    enabledPrompts: {}
  });
  
  const [selectedTool, setSelectedTool] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [promptArgs, setPromptArgs] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const availableTools = tools.filter(tool => enabledTools[tool.name] !== false);
  const availablePrompts = prompts.filter(prompt => enabledPrompts[prompt.name] !== false);
  
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const resultBgColor = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('green.200', 'green.600');

  const handleCallTool = async () => {
    if (!selectedTool) {
      setError('Please select a tool');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const args = JSON.parse(toolArgs);
      const result = await callMCPTool(selectedTool, args);
      
      // Call the parent function to add this to chat history
      onToolCall && onToolCall(selectedTool, args, result);
      
      // Clear form
      setSelectedTool('');
      setToolArgs('{}');
    } catch (error) {
      setError(error.message || 'Failed to call tool');
    } finally {
      setLoading(false);
    }
  };

  const handleCallPrompt = async () => {
    if (!selectedPrompt) {
      setError('Please select a prompt');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const args = JSON.parse(promptArgs);
      const result = await getMCPPrompt(selectedPrompt, args);
      
      // Call the parent function to add this to chat history
      onPromptCall && onPromptCall(selectedPrompt, args, result);
      
      // Clear form
      setSelectedPrompt('');
      setPromptArgs('{}');
    } catch (error) {
      setError(error.message || 'Failed to get prompt');
    } finally {
      setLoading(false);
    }
  };

  const getToolSchema = (toolName) => {
    const tool = tools.find(t => t.name === toolName);
    return tool?.inputSchema;
  };

  const getPromptArgs = (promptName) => {
    const prompt = prompts.find(p => p.name === promptName);
    return prompt?.arguments;
  };

  if (availableTools.length === 0 && availablePrompts.length === 0) {
    return null;
  }

  return (
    <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor="gray.200" mt={4}>
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        MCP Tool & Prompt Actions
      </Text>
      
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      <VStack spacing={4} align="stretch">
        {availableTools.length > 0 && (
          <VStack align="stretch" spacing={3}>
            <HStack justifyContent="space-between">
              <Text fontWeight="medium">Call MCP Tool</Text>
              <Select
                value={selectedTool}
                onChange={(e) => {
                  setSelectedTool(e.target.value);
                  setError('');
                  // Set example args based on tool schema
                  const schema = getToolSchema(e.target.value);
                  if (schema?.properties) {
                    const exampleArgs = {};
                    Object.keys(schema.properties).forEach(key => {
                      exampleArgs[key] = `example_${key}`;
                    });
                    setToolArgs(JSON.stringify(exampleArgs, null, 2));
                  } else {
                    setToolArgs('{}');
                  }
                }}
                placeholder="Select tool..."
                size="sm"
                width="auto"
              >
                {availableTools.map(tool => (
                  <option key={tool.name} value={tool.name}>
                    {tool.name}
                  </option>
                ))}
              </Select>
            </HStack>
            
            {selectedTool && (
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" color="gray.600">
                  Arguments: <Code fontSize="xs">{toolArgs}</Code>
                </Text>
                {getToolSchema(selectedTool) && (
                  <Box p={2} bg="white" borderRadius="md">
                    <Text fontSize="xs" fontWeight="semibold">Expected Parameters:</Text>
                    <Code fontSize="xs" display="block" whiteSpace="pre-wrap">
                      {JSON.stringify(getToolSchema(selectedTool), null, 2)}
                    </Code>
                  </Box>
                )}
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleCallTool}
                  isLoading={loading}
                  width="fit-content"
                >
                  Execute Tool
                </Button>
              </VStack>
            )}
          </VStack>
        )}
        
        {availablePrompts.length > 0 && (
          <VStack align="stretch" spacing={3}>
            <HStack justifyContent="space-between">
              <Text fontWeight="medium">Use MCP Prompt</Text>
              <Select
                value={selectedPrompt}
                onChange={(e) => {
                  setSelectedPrompt(e.target.value);
                  setError('');
                  // Set example args based on prompt arguments
                  const args = getPromptArgs(e.target.value);
                  if (args && args.length > 0) {
                    const exampleArgs = {};
                    args.forEach(arg => {
                      exampleArgs[arg.name] = `example_${arg.name}`;
                    });
                    setPromptArgs(JSON.stringify(exampleArgs, null, 2));
                  } else {
                    setPromptArgs('{}');
                  }
                }}
                placeholder="Select prompt..."
                size="sm"
                width="auto"
              >
                {availablePrompts.map(prompt => (
                  <option key={prompt.name} value={prompt.name}>
                    {prompt.name}
                  </option>
                ))}
              </Select>
            </HStack>
            
            {selectedPrompt && (
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" color="gray.600">
                  Arguments: <Code fontSize="xs">{promptArgs}</Code>
                </Text>
                {getPromptArgs(selectedPrompt) && getPromptArgs(selectedPrompt).length > 0 && (
                  <Box p={2} bg="white" borderRadius="md">
                    <Text fontSize="xs" fontWeight="semibold">Expected Arguments:</Text>
                    {getPromptArgs(selectedPrompt).map(arg => (
                      <Text key={arg.name} fontSize="xs">
                        <Code>{arg.name}</Code> {arg.required && <Text as="span" color="red.500">(required)</Text>} - {arg.description}
                      </Text>
                    ))}
                  </Box>
                )}
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={handleCallPrompt}
                  isLoading={loading}
                  width="fit-content"
                >
                  Execute Prompt
                </Button>
              </VStack>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default ToolCall;