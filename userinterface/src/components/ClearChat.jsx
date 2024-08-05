import { DeleteIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  IconButton,
  ButtonGroup,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverFooter,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";

function ClearChat({ handleClearChat, waitingResponse }) {
  const toolTipMessage = "Clear Chat";
  const { isOpen, onToggle, onClose } = useDisclosure();
  return (
    // <Box
    //   p={2}
    //   borderRadius={"md"}
    //   mb={2}
    //   align={"start"}
    //   display={"flex"}
    //   justifyContent={"space-between"}
    // >
    <Popover
      returnFocusOnClose={false}
      isOpen={isOpen}
      onClose={onClose}
      placement="top"
    >
      <PopoverTrigger>
        <Tooltip label={toolTipMessage} hasArrow placement="right">
          <IconButton
            icon={<DeleteIcon />}
            size="lg"
            variant="ghost"
            color="red.500"
            isDisabled={waitingResponse}
            onClick={onToggle}
          />
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent
        bg={"gray.50"}
        borderRadius={"md"}
        boxShadow="red 0px 0px 1px"
        borderColor="red"
        borderWidth={2}
      >
        <PopoverHeader fontWeight="semibold">Confirmation</PopoverHeader>
        <PopoverCloseButton />
        <PopoverBody>
          Are you sure you want to continue with your action?
        </PopoverBody>
        <PopoverFooter display="flex" justifyContent="flex-end">
          <ButtonGroup size="sm">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleClearChat}>
              Apply
            </Button>
          </ButtonGroup>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}

export default ClearChat;
