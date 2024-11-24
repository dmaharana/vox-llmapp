import { IconButton, Spinner, Tooltip } from "@chakra-ui/react";
import { LuSquare } from "react-icons/lu";

function StopGenerationButton({ handleStopGeneration }) {
  const toolTipMessage = "Stop generation";
  return (
    <>
      <Spinner size="md" />
      <Tooltip label={toolTipMessage} hasArrow placement="right">
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
