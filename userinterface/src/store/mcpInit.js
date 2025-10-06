import { loadMCPConfigs } from './mcpSlice';

export const initializeMCP = (dispatch) => {
  // Load MCP configurations on app startup with error handling
  dispatch(loadMCPConfigs()).catch(error => {
    console.warn('Failed to initialize MCP on startup:', error);
  });
  
  // Set up periodic refresh of MCP status (every 30 seconds)
  const refreshInterval = setInterval(() => {
    dispatch(loadMCPConfigs()).catch(error => {
      console.warn('Failed to refresh MCP status:', error);
    });
  }, 30000);

  // Return cleanup function
  return () => {
    clearInterval(refreshInterval);
  };
};