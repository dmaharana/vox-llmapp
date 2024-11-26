import { DownloadIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  HStack,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { DEFAULT_FILENAMES } from "./Constants";

function DownloadChat({ conversation, waitingResponse, convHistory }) {
  // conversation has fields: id, model, systemPrompt, user, assistant, resTime
  // download conversation as a csv and json

  const { isOpen, onToggle, onClose } = useDisclosure();

  const csvHeader = "id,model,systemPrompt,user,assistant,resTime";
  const handleDownloadCsv = (conversation) => {
    const csvData = [
      csvHeader,
      ...conversation.map((message) => {
        const row = csvHeader.split(",").map((header) => message[header]);
        return row
          .map((value) =>
            typeof value === "string" ? value.replace(/,/g, " ") : value
          )
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvData], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", DEFAULT_FILENAMES.csv);
    link.click();
  };

  const handleDownloadConversationJson = (conversation, filename) => {
    const blob = new Blob([JSON.stringify(conversation, null, 2)], {
      type: "text/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  const handleDownloadJson = () => {
    // combine conversation and convHistory into one json, with conv and history keys
    const jumboJson = {
      conversation: conversation,
      history: convHistory,
    };
    handleDownloadConversationJson(jumboJson, DEFAULT_FILENAMES.json);
  };

  return (
    // <Box p={4} borderRadius="md" color="gray.500" fontSize="sm">
    <Popover isOpen={isOpen} onClose={onClose} placement="left">
      <PopoverTrigger>
        <Tooltip label="Download Chat" hasArrow placement="right">
          <IconButton
            icon={<DownloadIcon />}
            size="lg"
            variant="ghost"
            color="green.500"
            isDisabled={waitingResponse}
            onClick={onToggle}
          ></IconButton>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent
        w="220px"
        bg={"gray.50"}
        borderRadius={"md"}
        boxShadow="green 0px 0px 1px"
        borderColor="green"
        borderWidth={2}
      >
        <PopoverCloseButton />
        <PopoverHeader>Download Conversation</PopoverHeader>
        <PopoverBody>
          <HStack justifyContent={"center"}>
            <Button
              colorScheme={"green"}
              size="sm"
              onClick={() => handleDownloadCsv(conversation)}
            >
              CSV
            </Button>
            <Button
              colorScheme={"purple"}
              size="sm"
              onClick={handleDownloadJson}
            >
              JSON
            </Button>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
    // </Box>
  );
}

export default DownloadChat;
