import {
    VStack,
    Box,
    Text,
} from "@chakra-ui/react";

export default function ToolLibrary() {
    return (
        <VStack spacing={6} align="stretch">
            <Box>
                <Text fontSize="xl" fontWeight="bold" mb={4}>Tool Library</Text>
                <Box>
                    Tool Library Placeholder
                </Box>
            </Box>
        </VStack>
    );
}