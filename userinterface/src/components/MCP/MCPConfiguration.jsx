import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import { AddIcon, RepeatIcon, DownloadIcon } from "@chakra-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import {
  loadMCPConfigs,
  addMCPServer,
  editMCPServer,
  removeMCPServer,
  refreshConnections,
  clearError,
  loadMCPTools,
  loadMCPPrompts,
} from "../../store/mcpSlice";
import { exportMCPConfigs } from "../../api/mcpApi";
import MCPServerConfig from "./MCPServerConfig";
import MCPToolsList from "./MCPToolsList";
import MCPPromptsList from "./MCPPromptsList";

const MCPConfiguration = () => {
  const dispatch = useDispatch();
  const { connections, loading, error, lastUpdated, tools, prompts } =
    useSelector((state) => {
      // console.log('MCPConfiguration - Full Redux state:', state);
      // console.log('MCPConfiguration - MCP state:', state.mcp);
      return (
        state.mcp || {
          connections: [],
          loading: false,
          error: null,
          lastUpdated: null,
          tools: [],
          prompts: [],
        }
      );
    });
  const bgColor = useColorModeValue("gray.50", "gray.700");
  const [showAddForm, setShowAddForm] = useState(false);
  const [jsonConfig, setJsonConfig] = useState("");
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const fileInputRef = React.useRef(null);
  const toast = useToast();

  // React.useEffect(() => {
  //   console.log("MCPConfiguration - connections:", connections);
  //   console.log("MCPConfiguration - connections.length:", connections?.length);
  //   console.log("MCPConfiguration - tools:", tools);
  //   console.log("MCPConfiguration - prompts:", prompts);
  // }, [connections, tools, prompts]);

  React.useEffect(() => {
    dispatch(loadMCPConfigs());
    dispatch(loadMCPTools());
    dispatch(loadMCPPrompts());
  }, [dispatch]);

  const handleAddServer = async (config) => {
    // console.log("Adding server:", config);
    if (!config.name) {
      toast({
        title: "Error",
        description: "Server name is required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate based on server type
    if (config.type === "stdio" && !config.command) {
      toast({
        title: "Error",
        description: "Command is required for stdio servers",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (config.type === "http" && !config.url) {
      toast({
        title: "Error",
        description: "URL is required for HTTP servers",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    try {
      console.log("Dispatching addMCPServer action...");
      const result = await dispatch(addMCPServer(config)).unwrap();
      console.log("addMCPServer action completed successfully:", result);
      setShowAddForm(false);
      toast({
        title: "Success",
        description: `MCP server "${config.name}" added successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("addMCPServer action failed:", error);
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleEditServer = async (config) => {
    try {
      await dispatch(editMCPServer(config)).unwrap();
      toast({
        title: "Success",
        description: `MCP server "${config.name}" updated successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteServer = async (name) => {
    try {
      await dispatch(removeMCPServer(name)).unwrap();
      toast({
        title: "Success",
        description: `MCP server "${name}" removed successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await dispatch(refreshConnections()).unwrap();
      toast({
        title: "Success",
        description: "MCP connections refreshed successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportMCPConfigs();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vox-mcp-config.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "MCP configuration exported successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export MCP configuration",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleJsonImport = () => {
    try {
      const config = JSON.parse(jsonConfig);
      if (config.mcpServers) {
        // Import multiple servers
        Object.entries(config.mcpServers).forEach(([name, serverConfig]) => {
          // Extract the name from the config if not already set
          const serverWithNamed = {
            ...serverConfig,
            name: serverConfig.name || name,
          };
          dispatch(addMCPServer(serverWithNamed));
        });
        toast({
          title: "Success",
          description: "MCP configuration imported successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description:
            'Invalid configuration format. Expected "mcpServers" object.',
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      setJsonConfig("");
      setShowJsonInput(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const config = JSON.parse(content);
        if (config.mcpServers) {
          // Import multiple servers
          Object.entries(config.mcpServers).forEach(([name, serverConfig]) => {
            // Extract the name from the config if not already set
            const serverWithNamed = {
              ...serverConfig,
              name: serverConfig.name || name,
            };
            dispatch(addMCPServer(serverWithNamed));
          });
          toast({
            title: "Success",
            description: `MCP configuration from "${file.name}" imported successfully`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Error",
            description:
              'Invalid configuration format. Expected "mcpServers" object.',
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
        setShowFileInput(false);
        event.target.value = null; // Reset file input
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse JSON file",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event) => {
    handleFileImport(event);
  };

  const handleFileInputChange = () => {
    setShowFileInput(!showFileInput);
    if (!showFileInput) {
      setShowJsonInput(false);
      // Trigger file dialog immediately
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const exampleConfig = `{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-filesystem", "/tmp"],
      "env": {},
      "disabled": false
    },
    "web-api": {
      "name": "web-api",
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-token-here",
        "X-API-Key": "your-api-key"
      },
      "env": {},
      "disabled": false
    }
  }
}`;

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <HStack justify="space-between" align="center" mb={4}>
          <Text fontSize="xl" fontWeight="bold">
            MCP Configuration
          </Text>
          <HStack>
            <Tooltip label="Export configurations">
              <IconButton
                icon={<DownloadIcon />}
                size="sm"
                variant="ghost"
                onClick={handleExport}
                isDisabled={connections.length === 0}
                mr={2}
              />
            </Tooltip>
            <Tooltip label="Import configurations from file">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                mr={2}
              >
                Import from File
              </Button>
            </Tooltip>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              display="none"
            />
            <Tooltip label="Refresh connections">
              <IconButton
                icon={<RepeatIcon />}
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                isLoading={loading}
              />
            </Tooltip>
            <Button
              leftIcon={<AddIcon />}
              size="sm"
              colorScheme="blue"
              onClick={() => setShowAddForm(true)}
              isDisabled={showAddForm}
            >
              Add Server
            </Button>
          </HStack>
        </HStack>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
            <Button
              size="sm"
              variant="ghost"
              ml="auto"
              onClick={() => dispatch(clearError())}
            >
              Dismiss
            </Button>
          </Alert>
        )}

        {loading && (
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
            <Text>Loading MCP configurations...</Text>
          </HStack>
        )}

        {lastUpdated && (
          <Text fontSize="xs" color="gray.500" mb={4}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </Text>
        )}

        <VStack spacing={4} align="stretch">
          {showAddForm && (
            <MCPServerConfig
              isNew={true}
              onSave={handleAddServer}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {connections.length === 0 && !loading && !showAddForm && (
            <Box textAlign="center" py={8} bg={bgColor} borderRadius="md">
              <Text color="gray.500" mb={4}>
                No MCP servers configured
              </Text>
              <VStack spacing={2}>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={() => setShowAddForm(true)}
                >
                  Add Your First Server
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowJsonInput(!showJsonInput)}
                >
                  Or import from JSON
                </Button>
              </VStack>
            </Box>
          )}

          {connections.map((connection) => (
            <MCPServerConfig
              key={connection.name}
              server={connection}
              onSave={handleEditServer}
              onDelete={handleDeleteServer}
            />
          ))}

          {showJsonInput && (
            <Box
              mt={4}
              p={4}
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
            >
              <Text fontWeight="semibold" mb={2}>
                Import Configuration from JSON
              </Text>
              <Textarea
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                placeholder={exampleConfig}
                rows={8}
                mb={3}
              />
              <HStack>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleJsonImport}
                  isDisabled={!jsonConfig.trim()}
                >
                  Import
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowJsonInput(false);
                    setJsonConfig("");
                  }}
                >
                  Cancel
                </Button>
              </HStack>
            </Box>
          )}

          {showFileInput && (
            <Box
              mt={4}
              p={4}
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
            >
              <Text fontWeight="semibold" mb={2}>
                Import Configuration from File
              </Text>
              <Text fontSize="sm" color="gray.500" mb={2}>
                File upload will start automatically after selecting a file
              </Text>
              <HStack mt={3} justify="flex-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowFileInput(false);
                  }}
                >
                  Cancel
                </Button>
              </HStack>
            </Box>
          )}

          {showFileInput && (
            <Box
              mt={4}
              p={4}
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
            >
              <Text fontWeight="semibold" mb={2}>
                Import Configuration from File
              </Text>
              <FormControl>
                <FormLabel>
                  Select JSON file with MCP server configurations
                </FormLabel>
                <Input type="file" accept=".json" onChange={handleFileUpload} />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Upload a JSON file containing MCP server configurations in the
                  same format as the export
                </Text>
              </FormControl>
              <HStack mt={3}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowFileInput(false);
                    setSelectedFile(null);
                    const fileInput =
                      document.querySelector('input[type="file"]');
                    if (fileInput) fileInput.value = "";
                  }}
                >
                  Cancel
                </Button>
              </HStack>
            </Box>
          )}

          {connections.length > 0 && !showJsonInput && !showFileInput && (
            <HStack justify="center" mt={4}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowJsonInput(true)}
              >
                Import Additional Servers from JSON
              </Button>
            </HStack>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};

export default MCPConfiguration;
