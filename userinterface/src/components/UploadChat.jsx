import { useState } from "react";
import {
  IconButton,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  PopoverCloseButton,
  PopoverHeader,
  HStack,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { PiUploadLight } from "react-icons/pi";
import ShowAlert from "./ShowAlert";
import { DEFAULT_MESSAGES } from "./Constants";

function UploadChat({
  setConversation,
  waitingResponse,
  setCurrentMsgId,
  setConvHistory,
}) {
  const { isOpen, onToggle, onClose } = useDisclosure();
  const [convCount, setConvCount] = useState(-1);
  const [loadError, setLoadError] = useState(false);
  const [file, setFile] = useState("");

  // onclose reset all states
  function resetStates() {
    setConvCount(-1);
    setLoadError(false);
    setFile("");
  }

  function handleUpload(file) {
    const fileReader = new FileReader();
    fileReader.readAsText(file);
    fileReader.onload = () => {
      try {
        const voxData = JSON.parse(fileReader.result);
        // if there are no conversations, show an alert
        // console.log(voxData);
        if (
          voxData?.conversation?.length > 0 &&
          voxData.conversation[0]?.user
        ) {
          // console.log(voxData.conversation[0].user);
          setConversation(voxData?.conversation);
          setConvHistory(voxData?.history);
          // setCurrentMsgId to total number of messages+1
          setCurrentMsgId(voxData.conversation.length + 1);
          setConvCount(voxData.conversation.length);
        } else {
          // console.log("no conversations");
          setConvCount(0);
        }
      } catch (error) {
        console.error("Invalid JSON file:", error);
        setLoadError(true);
      }
    };
    onClose();
  }

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="left">
      <PopoverTrigger>
        <Tooltip label="Upload Chat" hasArrow placement="right">
          <IconButton
            icon={<PiUploadLight />}
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
        <PopoverHeader>Upload Conversation</PopoverHeader>
        <PopoverBody>
          <HStack justifyContent={"center"}>
            <Input
              type="file"
              value={file}
              onChange={(e) => {
                handleUpload(e.target.files[0]);
              }}
            />
          </HStack>
        </PopoverBody>
      </PopoverContent>

      {loadError && (
        <ShowAlert
          status="error"
          title={DEFAULT_MESSAGES.convUploadErrorTitle}
          message={DEFAULT_MESSAGES.convUploadErrorMessage}
          resetStates={resetStates}
        />
      )}

      {convCount > 0 && !loadError && (
        <ShowAlert
          status="success"
          title=""
          message={` ${convCount} ${DEFAULT_MESSAGES.convUploadSuccessMessage}`}
          resetStates={resetStates}
        />
      )}

      {convCount === 0 && (
        <ShowAlert
          status="warning"
          title=""
          message={DEFAULT_MESSAGES.convUploadNoConvMessage}
          resetStates={resetStates}
        />
      )}
    </Popover>
  );
}

export default UploadChat;
