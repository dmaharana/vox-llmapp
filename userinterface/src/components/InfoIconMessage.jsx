import { QuestionOutlineIcon } from "@chakra-ui/icons";
import { Box, Tooltip } from "@chakra-ui/react";

function InfoIconMessage({ message }) {
  return (
    <Box p={4} borderRadius="md" color="gray.500" fontSize="sm">
      <Tooltip label={message} hasArrow placement="right">
        <QuestionOutlineIcon />
      </Tooltip>
    </Box>
  );
}

export default InfoIconMessage;
