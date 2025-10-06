import React, { useEffect, useState } from "react";
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
  FormControl,
  Input,
} from "@chakra-ui/react";
import { useSelector, useDispatch } from "react-redux";
import { toggleTool, loadMCPTools } from "../../store/mcpSlice";

const MCPToolsPrompts = () => {
  const dispatch = useDispatch();
  const { tools, enabledTools } = useSelector((state) => {
    // console.log('MCPToolsPrompts - Full state:', state);
    // console.log('MCPToolsPrompts - Tools:', state.mcp?.tools);
    return (
      state.mcp || {
        tools: [],
        enabledTools: {},
      }
    );
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Call useEffect at the top level
  useEffect(() => {
    dispatch(loadMCPTools());
  }, [dispatch]);

  const handleToolToggle = (toolName) => {
    dispatch(toggleTool(toolName));
  };

  const renderToolSchema = (schema) => {
    if (!schema || !schema.properties) return null;

    return (
      <Box mt={2}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Parameters:
        </Text>
        <VStack align="start" spacing={1}>
          {Object.entries(schema.properties).map(([key, prop]) => (
            <HStack key={key} spacing={2}>
              <Code fontSize="xs">{key}</Code>
              <Text fontSize="xs" color="gray.600">
                {prop.type}
                {schema.required?.includes(key) && (
                  <Badge ml={1} size="xs" colorScheme="red">
                    required
                  </Badge>
                )}
              </Text>
              {prop.description && (
                <Text fontSize="xs" color="gray.500">
                  - {prop.description}
                </Text>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>
    );
  };

  if (tools.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">
          No tools available. Add MCP servers to see available tools.
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Available Tools ({tools.length})
        </Text>

        {/* Search Input */}
        {tools.length > 0 && (
          <FormControl mb={4}>
            <Input
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
              variant="outline"
            />
          </FormControl>
        )}

        <Accordion allowMultiple>
          {tools
            .filter((tool) => {
              // Filter tools based on search term
              if (!searchTerm) return true;

              return (
                tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tool.description &&
                  tool.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()))
              );
            })
            .map((tool, index) => (
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
    </VStack>
  );
};

export default MCPToolsPrompts;
