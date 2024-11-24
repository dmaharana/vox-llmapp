import { IconButton, Spinner, Tooltip } from "@chakra-ui/react";
import { LuSquare } from "react-icons/lu";

function StopGenerationButton({ handleStopGeneration }) {
  return (
    <>
      <Spinner size="md" />
      <Tooltip label="Stop generation" hasArrow placement="right">
        <IconButton
          aria-label="Stop"
          icon={<LuSquare />}
          colorScheme="red"
          variant={"solid"}
          size="sm"
          rounded={"full"}
          onClick={handleStopGeneration}
        />
      </Tooltip>
    </>
  );
}

export default StopGenerationButton;
