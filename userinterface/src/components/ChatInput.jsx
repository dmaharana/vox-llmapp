import { Box, HStack, Textarea, Button } from "@chakra-ui/react";
import { IoMdSend } from "react-icons/io";
import StopGenerationButton from "./StopGenerationButton";
import { DEFAULT_MESSAGES } from "./Constants";

export default function ChatInput({
  query,
  setQuery,
  waitingResponse,
  handleSubmit,
  handleKeyPress,
  handleStopGeneration,
  useColorModeValue,
}) {
  const bgInput = useColorModeValue("green.50", "gray.700");
  const bgText = useColorModeValue("gray.600", "gray.100");

  return (
    <Box w={"100%"} bg={bgInput} mt="auto">
      <HStack bg={bgInput}>
        <Textarea
          isDisabled={waitingResponse}
          placeholder={DEFAULT_MESSAGES.chatTextBoxDefaultMessage}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e)}
          borderRadius={"1rem"}
          autosize="true"
          maxH="10lh"
          paddingTop={"2rem"}
          color={bgText}
          variant="outline"
          resize="vertical"
          overflow="auto"
        />
        {query && (
          <Button
            colorScheme={"purple"}
            type="submit"
            variant="ghost"
            isDisabled={!query || waitingResponse}
            onClick={(e) => handleSubmit(e)}
          >
            <IoMdSend size={40} />
          </Button>
        )}

        {waitingResponse && (
          <StopGenerationButton handleStopGeneration={handleStopGeneration} />
        )}
      </HStack>
    </Box>
  );
}
