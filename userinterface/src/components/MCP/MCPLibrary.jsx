import React, { useState } from 'react';
import {
  VStack,
  Box,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertDescription,
  Link
} from "@chakra-ui/react";
import { ExternalLinkIcon } from '@chakra-ui/icons';
import MCPConfiguration from './MCPConfiguration';
import MCPToolsPrompts from './MCPToolsPrompts';
import MCPDemo from './MCPDemo';

export default function MCPLibrary() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          MCP (Model Context Protocol)
        </Text>
        
        <Alert status="info" mb={6}>
          <AlertIcon />
          <AlertDescription>
            MCP enables your LLM to connect to external tools and data sources. 
            Configure MCP servers to access filesystems, APIs, databases, and more.{' '}
            <Link 
              href="https://modelcontextprotocol.io" 
              isExternal 
              color="blue.500"
            >
              Learn more <ExternalLinkIcon mx="2px" />
            </Link>
          </AlertDescription>
        </Alert>

        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>Configuration</Tab>
            <Tab>Tools & Prompts</Tab>
            <Tab>Demo</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={0}>
              <MCPConfiguration />
            </TabPanel>
            <TabPanel px={0}>
              <MCPToolsPrompts />
            </TabPanel>
            <TabPanel px={0}>
              <MCPDemo />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </VStack>
  );
}
