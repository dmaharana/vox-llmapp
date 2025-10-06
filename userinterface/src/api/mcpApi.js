import axios from "axios";

// Get all MCP server configurations and status
export const fetchMCPConfigs = async () => {
  try {
    // console.log('Fetching MCP configs, current cookies:', document.cookie);
    const response = await axios.get("/run/mcp-configs", {
      withCredentials: true, // Ensure cookies are sent
    });
    // console.log('fetchMCPConfigs response.data:', response.data);
    // console.log('fetchMCPConfigs connections:', response.data?.connections);
    return response.data;
  } catch (error) {
    console.error("Error fetching MCP configs:", error);
    throw error;
  }
};

// Register a new MCP server
export const registerMCPServer = async (config) => {
  try {
    console.log("Registering MCP server with config:", config);
    console.log("Request will be sent to: /run/mcp-config");
    console.log("Current cookies:", document.cookie);

    const response = await axios.post(
      "/run/mcp-config",
      { config },
      {
        withCredentials: true, // Ensure cookies are sent and received
      }
    );

    console.log("MCP server registration response:", response);
    console.log("MCP server registration response.data:", response.data);
    console.log(
      "MCP server registration response.data type:",
      typeof response.data
    );
    console.log(
      "MCP server registration response.data.connections:",
      response.data?.connections
    );
    console.log("Response headers:", response.headers);
    console.log("Cookies after response:", document.cookie);

    return response.data;
  } catch (error) {
    console.error("Error registering MCP server:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
};

// Update an existing MCP server
export const updateMCPServer = async (config) => {
  try {
    const response = await axios.put("/run/mcp-config", { config });
    return response.data;
  } catch (error) {
    console.error("Error updating MCP server:", error);
    throw error;
  }
};

// Delete an MCP server
export const deleteMCPServer = async (name) => {
  try {
    const response = await axios.delete(`/run/mcp-config/${name}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting MCP server:", error);
    throw error;
  }
};

// Get all available tools
export const fetchMCPTools = async () => {
  try {
    const response = await axios.get("/run/mcp-tools");
    return response.data.tools || [];
  } catch (error) {
    console.error("Error fetching MCP tools:", error);
    return [];
  }
};

// Get all available prompts
export const fetchMCPPrompts = async () => {
  try {
    const response = await axios.get("/run/mcp-prompts");
    return response.data.prompts || [];
  } catch (error) {
    console.error("Error fetching MCP prompts:", error);
    return [];
  }
};

// Call a tool
export const callMCPTool = async (toolName, toolArguments) => {
  try {
    const response = await axios.post("/run/mcp-tool", {
      toolName,
      arguments: toolArguments,
    });
    return response.data;
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    throw error;
  }
};

// Get a prompt
export const getMCPPrompt = async (promptName, promptArguments) => {
  try {
    const response = await axios.post("/run/mcp-prompt", {
      promptName,
      arguments: promptArguments,
    });
    return response.data;
  } catch (error) {
    console.error("Error getting MCP prompt:", error);
    throw error;
  }
};

// Refresh all MCP connections
export const refreshMCPConnections = async () => {
  try {
    const response = await axios.post("/run/mcp-refresh");
    return response.data;
  } catch (error) {
    console.error("Error refreshing MCP connections:", error);
    throw error;
  }
};

// Export all MCP configurations as JSON
export const exportMCPConfigs = async () => {
  try {
    const response = await axios.get("/run/mcp-configs/export", {
      responseType: "blob",
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error exporting MCP configurations:", error);
    throw error;
  }
};
