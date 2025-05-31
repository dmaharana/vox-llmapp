import {
    VStack,
    Box,
    Text,
} from "@chakra-ui/react";

export default function AgentLibrary() {
    return (
        <VStack spacing={6} align="stretch">
        <Box>
            <Text fontSize="xl" fontWeight="bold" mb={4}>Agent Library</Text>
            <Box>
                Agent Library Placeholder
            </Box>
        </Box>
    </VStack>
    );
}