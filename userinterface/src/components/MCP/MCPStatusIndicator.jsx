import React from 'react';
import {
  Box,
  HStack,
  Text,
  Badge,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';

const MCPStatusIndicator = ({ showDetails = false }) => {
  const { connections, tools, prompts } = useSelector(state => state.mcp || {
    connections: [],
    tools: [],
    prompts: []
  });

  const connectedCount = connections.filter(conn => conn.status === 'connected').length;
  const errorCount = connections.filter(conn => conn.status === 'error').length;
  const totalCount = connections.length;

  const getStatusColor = () => {
    if (errorCount > 0) return 'red';
    if (connectedCount > 0) return 'green';
    return 'gray';
  };

  const getStatusIcon = () => {
    if (errorCount > 0) return WarningIcon;
    if (connectedCount > 0) return CheckCircleIcon;
    return InfoIcon;
  };

  const getStatusText = () => {
    if (totalCount === 0) return 'No MCP servers';
    if (errorCount > 0) return `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    if (connectedCount > 0) return `${connectedCount} connected`;
    return 'Disconnected';
  };

  const tooltipText = `MCP Status: ${connectedCount}/${totalCount} servers connected, ${tools.length} tools, ${prompts.length} prompts`;

  if (!showDetails) {
    return (
      <Tooltip label={tooltipText}>
        <HStack spacing={1}>
          <Icon as={getStatusIcon()} color={`${getStatusColor()}.500`} boxSize={3} />
          <Text fontSize="xs" color={`${getStatusColor()}.500`}>
            MCP
          </Text>
        </HStack>
      </Tooltip>
    );
  }

  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <Icon as={getStatusIcon()} color={`${getStatusColor()}.500`} />
        <Text fontSize="sm" fontWeight="semibold">
          MCP Status
        </Text>
        <Badge colorScheme={getStatusColor()} size="sm">
          {getStatusText()}
        </Badge>
      </HStack>
      
      {totalCount > 0 && (
        <HStack spacing={4} fontSize="xs" color="gray.600">
          <Text>{totalCount} server{totalCount !== 1 ? 's' : ''}</Text>
          <Text>{tools.length} tool{tools.length !== 1 ? 's' : ''}</Text>
          <Text>{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</Text>
        </HStack>
      )}
    </Box>
  );
};

export default MCPStatusIndicator;