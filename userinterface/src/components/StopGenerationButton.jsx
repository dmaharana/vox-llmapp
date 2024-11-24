import { IconButton, Spinner } from "@chakra-ui/react";
import { LuSquare } from "react-icons/lu";

function StopGenerationButton({ handleStopGeneration }) {
  return (
    <>
      <Spinner size="md" />
      <IconButton
        aria-label="Stop"
        icon={<LuSquare />}
        colorScheme="red"
        variant={"solid"}
        size="sm"
        rounded={"full"}
        onClick={handleStopGeneration}
      />
    </>
  );
}

export default StopGenerationButton;
