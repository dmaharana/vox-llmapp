import React from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Switch,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Divider,
  SimpleGrid
} from '@chakra-ui/react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTool, togglePrompt } from '../../store/mcpSlice';

const MCPToolsPrompts = () => {
  const dispatch = useDispatch();
  const { tools, prompts, enabledTools, enabledPrompts } = useSelector(state => state.mcp || {
    tools: [],
    prompts: [],
    enabledTools: {},
    enabledPrompts: {}
  });

  const handleToolToggle = (toolName) => {
    dispatch(toggleTool(toolName));
  };

  const handlePromptToggle = (promptName) => {
    dispatch(togglePrompt(promptName));
  };

  const renderToolSchema = (schema) => {
    if (!schema || !schema.properties) return null;
    
    return (
      <Box mt={2}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>Parameters:</Text>
        <VStack align="start" spacing={1}>
          {Object.entries(schema.properties).map(([key, prop]) => (
            <HStack key={key} spacing={2}>
              <Code fontSize="xs">{key}</Code>
              <Text fontSize="xs" color="gray.600">
                {prop.type}
                {schema.required?.includes(key) && (
                  <Badge ml={1} size="xs" colorScheme="red">required</Badge>
                )}
              </Text>
              {prop.description && (
                <Text fontSize="xs" color="gray.500">- {prop.description}</Text>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>
    );
  };

  const renderPromptArgs = (args) => {
    if (!args || args.length === 0) return null;
    
    return (
      <Box mt={2}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>Arguments:</Text>
        <VStack align="start" spacing={1}>
          {args.map((arg, index) => (
            <HStack key={index} spacing={2}>
              <Code fontSize="xs">{arg.name}</Code>
              {arg.required && (
                <Badge size="xs" colorScheme="red">required</Badge>
              )}
              {arg.description && (
                <Text fontSize="xs" color="gray.500">- {arg.description}</Text>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>
    );
  };

  if (tools.length === 0 && prompts.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">
          No tools or prompts available. Add MCP servers to see available capabilities.
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {tools.length > 0 && (
        <Box>
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Available Tools ({tools.length})
          </Text>
          <Accordion allowMultiple>
            {tools.map((tool, index) => (
              <AccordionItem key={`${tool.name}-${index}`}>
                <AccordionButton>
                  <HStack flex={1} justify="space-between" align="center">
                    <HStack>
                      <Text fontWeight="semibold">{tool.name}</Text>
                      <Switch
                        size="sm"
                        isChecked={enabledTools[tool.name] !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToolToggle(tool.name);
                        }}
                      />
                    </HStack>
                    <AccordionIcon />
                  </HStack>
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="start" spacing={3}>
                    {tool.description && (
                      <Text fontSize="sm" color="gray.600">
                        {tool.description}
                      </Text>
                    )}
                    {renderToolSchema(tool.inputSchema)}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      )}

      {tools.length > 0 && prompts.length > 0 && <Divider />}

      {prompts.length > 0 && (
        <Box>
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Available Prompts ({prompts.length})
          </Text>
          <Accordion allowMultiple>
            {prompts.map((prompt, index) => (
              <AccordionItem key={`${prompt.name}-${index}`}>
                <AccordionButton>
                  <HStack flex={1} justify="space-between" align="center">
                    <HStack>
                      <Text fontWeight="semibold">{prompt.name}</Text>
                      <Switch
                        size="sm"
                        isChecked={enabledPrompts[prompt.name] !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handlePromptToggle(prompt.name);
                        }}
                      />
                    </HStack>
                    <AccordionIcon />
                  </HStack>
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="start" spacing={3}>
                    {prompt.description && (
                      <Text fontSize="sm" color="gray.600">
                        {prompt.description}
                      </Text>
                    )}
                    {renderPromptArgs(prompt.arguments)}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      )}
    </VStack>
  );
};

export default MCPToolsPrompts;