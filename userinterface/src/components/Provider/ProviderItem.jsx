import {
    Box,
    HStack,
    Text,
    Spacer,
    IconButton,
    Textarea,
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

export function ProviderItem() {
    return (
        <Box>
            <Box p="4" borderWidth="1px" borderRadius="md" bg="gray.100">
                <HStack>
                    <Text fontWeight="bold">New Provider</Text>
                    <Spacer />
                    <IconButton
                        aria-label="Edit Provider"
                        icon={<EditIcon />}
                        variant="ghost"
                    />
                </HStack>
                <Textarea
                    placeholder="Enter LLaMA model configuration"
                    size="sm"
                />
            </Box>
        </Box>
    );
}
