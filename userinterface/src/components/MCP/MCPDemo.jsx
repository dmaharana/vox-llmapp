import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Select,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { callMCPTool, getMCPPrompt } from '../../api/mcpApi';

const MCPDemo = () => {
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
  const [toolResult, setToolResult] = useState(null);
  const [promptResult, setPromptResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const availableTools = tools.filter(tool => enabledTools[tool.name] !== false);
  const availablePrompts = prompts.filter(prompt => enabledPrompts[prompt.name] !== false);

  const handleCallTool = async () => {
    if (!selectedTool) {
      toast({
        title: 'Error',
        description: 'Please select a tool',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const args = JSON.parse(toolArgs);
      const result = await callMCPTool(selectedTool, args);
      setToolResult(result);
      toast({
        title: 'Success',
        description: 'Tool called successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to call tool',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrompt = async () => {
    if (!selectedPrompt) {
      toast({
        title: 'Error',
        description: 'Please select a prompt',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const args = JSON.parse(promptArgs);
      const result = await getMCPPrompt(selectedPrompt, args);
      setPromptResult(result);
      toast({
        title: 'Success',
        description: 'Prompt retrieved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get prompt',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
    return (
      <Alert status="info">
        <AlertIcon />
        No MCP tools or prompts are available. Please configure MCP servers first.
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Text fontSize="xl" fontWeight="bold">
        MCP Demo - Test Tools and Prompts
      </Text>

      {availableTools.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Test MCP Tools
          </Text>
          
          <VStack spacing={4} align="stretch">
            <Select
              placeholder="Select a tool to test"
              value={selectedTool}
              onChange={(e) => {
                setSelectedTool(e.target.value);
                setToolResult(null);
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
            >
              {availableTools.map(tool => (
                <option key={tool.name} value={tool.name}>
                  {tool.name} - {tool.description}
                </option>
              ))}
            </Select>

            {selectedTool && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Tool Arguments (JSON):
                </Text>
                <Textarea
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  placeholder='{"arg1": "value1", "arg2": "value2"}'
                  rows={4}
                />
                {getToolSchema(selectedTool) && (
                  <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                    <Text fontSize="xs" fontWeight="semibold" mb={1}>Expected Parameters:</Text>
                    <Code fontSize="xs" display="block" whiteSpace="pre-wrap">
                      {JSON.stringify(getToolSchema(selectedTool), null, 2)}
                    </Code>
                  </Box>
                )}
              </Box>
            )}

            <Button
              colorScheme="blue"
              onClick={handleCallTool}
              isLoading={loading}
              isDisabled={!selectedTool}
            >
              Call Tool
            </Button>

            {toolResult && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Tool Result:
                </Text>
                <Box p={3} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                  <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
                    {JSON.stringify(toolResult, null, 2)}
                  </Code>
                </Box>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      {availableTools.length > 0 && availablePrompts.length > 0 && <Divider />}

      {availablePrompts.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Test MCP Prompts
          </Text>
          
          <VStack spacing={4} align="stretch">
            <Select
              placeholder="Select a prompt to test"
              value={selectedPrompt}
              onChange={(e) => {
                setSelectedPrompt(e.target.value);
                setPromptResult(null);
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
            >
              {availablePrompts.map(prompt => (
                <option key={prompt.name} value={prompt.name}>
                  {prompt.name} - {prompt.description}
                </option>
              ))}
            </Select>

            {selectedPrompt && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Prompt Arguments (JSON):
                </Text>
                <Textarea
                  value={promptArgs}
                  onChange={(e) => setPromptArgs(e.target.value)}
                  placeholder='{"arg1": "value1", "arg2": "value2"}'
                  rows={4}
                />
                {getPromptArgs(selectedPrompt) && getPromptArgs(selectedPrompt).length > 0 && (
                  <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                    <Text fontSize="xs" fontWeight="semibold" mb={1}>Expected Arguments:</Text>
                    {getPromptArgs(selectedPrompt).map(arg => (
                      <Text key={arg.name} fontSize="xs">
                        <Code>{arg.name}</Code> {arg.required && <Text as="span" color="red.500">(required)</Text>} - {arg.description}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <Button
              colorScheme="purple"
              onClick={handleGetPrompt}
              isLoading={loading}
              isDisabled={!selectedPrompt}
            >
              Get Prompt
            </Button>

            {promptResult && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Prompt Result:
                </Text>
                <Box p={3} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                  <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
                    {JSON.stringify(promptResult, null, 2)}
                  </Code>
                </Box>
              </Box>
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export default MCPDemo;