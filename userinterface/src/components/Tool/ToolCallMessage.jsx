import { Box, HStack, VStack, Text, Code, Badge, Button, useColorModeValue } from "@chakra-ui/react";

export const ToolCallMessage = ({ message, onApprove, onReject }) => {
  const bg = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("blue.200", "blue.600");
  const isPending = message.toolCall?.result === "Pending user confirmation...";

  return (
    <Box
      p={4}
      bg={bg}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      mb={4}
      maxWidth="90%"
      alignSelf="flex-start"
    >
      <HStack mb={2} spacing={2}>
        <Badge colorScheme="blue" variant="solid">
          MCP Tool Call
        </Badge>
        <Text fontSize="sm" color="blue.600" fontWeight="semibold">
          {message.user}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </HStack>
      
      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="medium">
          Arguments:
        </Text>
        <Box p={2} bg="white" borderRadius="md">
          <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
            {JSON.stringify(message.toolCall.args, null, 2)}
          </Code>
        </Box>
        
        {isPending && onApprove && onReject && (
          <HStack mt={2} spacing={3} justifyContent="flex-start">
            <Button
              size="sm"
              colorScheme="green"
              onClick={() => onApprove(message.id, message.toolCall.toolName, message.toolCall.args)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              onClick={() => onReject(message.id)}
            >
              Reject
            </Button>
          </HStack>
        )}
        
        {message.toolCall.result && message.toolCall.result !== "Pending user confirmation..." && (
          <>
            <Text fontSize="sm" fontWeight="medium" mt={2}>
              Result:
            </Text>
            <Box p={2} bg="gray.100" borderRadius="md">
              <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
                {JSON.stringify(message.toolCall.result, null, 2)}
              </Code>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
};

export const PromptCallMessage = ({ message }) => {
  const bg = useColorModeValue("purple.50", "purple.900");
  const borderColor = useColorModeValue("purple.200", "purple.600");

  return (
    <Box
      p={4}
      bg={bg}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      mb={4}
      maxWidth="90%"
      alignSelf="flex-start"
    >
      <HStack mb={2} spacing={2}>
        <Badge colorScheme="purple" variant="solid">
          MCP Prompt
        </Badge>
        <Text fontSize="sm" color="purple.600" fontWeight="semibold">
          {message.user}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </HStack>
      
      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="medium">
          Arguments:
        </Text>
        <Box p={2} bg="white" borderRadius="md">
          <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
            {JSON.stringify(message.promptCall.args, null, 2)}
          </Code>
        </Box>
        
        <Text fontSize="sm" fontWeight="medium" mt={2}>
          Result:
        </Text>
        <Box p={2} bg="gray.100" borderRadius="md">
          <Code fontSize="sm" display="block" whiteSpace="pre-wrap">
            {JSON.stringify(message.promptCall.result, null, 2)}
          </Code>
        </Box>
      </VStack>
    </Box>
  );
};