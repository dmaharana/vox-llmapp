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

  return (
    <Box w={"100%"} bg={bgInput} mt="auto">
      <HStack bg={bgInput}>
        <Textarea
          isDisabled={waitingResponse}
          placeholder={DEFAULT_MESSAGES.chatTextBoxDefaultMessage}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e)}
          borderRadius={"2rem"}
          h={"70%"}
          paddingTop={"2rem"}
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
