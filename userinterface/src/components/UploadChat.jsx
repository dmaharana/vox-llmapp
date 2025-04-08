import { useEffect, useRef, useState } from "react";
import {
  IconButton,
  Input,
  Tooltip,
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
  const [convCount, setConvCount] = useState(-1);
  const [loadError, setLoadError] = useState(false);

  const fileInputRef = useRef();
  const timerRef = useRef();

  function resetStates() {
    setConvCount(-1);
    setLoadError(false);
  }

  useEffect(() => {
    if (convCount !== -1 || loadError) {
      timerRef.current = setTimeout(() => {
        resetStates();
      }, 3000);
    }
    return () => clearTimeout(timerRef.current);
  }, [convCount, loadError]);

  function handleUpload(file) {
    const fileReader = new FileReader();
    fileReader.readAsText(file);
    fileReader.onload = () => {
      try {
        const voxData = JSON.parse(fileReader.result);
        if (
          voxData?.conversation?.length > 0 &&
          voxData.conversation[0]?.user
        ) {
          setConversation(voxData?.conversation);
          setConvHistory(voxData?.history);
          setCurrentMsgId(voxData.conversation.length + 1);
          setConvCount(voxData.conversation.length);
        } else {
          setConvCount(0);
        }
      } catch (error) {
        console.error("Invalid JSON file:", error);
        setLoadError(true);
      }
    };
  }

  return (
    <>
      <Tooltip label="Upload Chat" hasArrow placement="right">
        <IconButton
          icon={<PiUploadLight />}
          size="lg"
          variant="ghost"
          color="green.500"
          isDisabled={waitingResponse}
          onClick={() => fileInputRef.current.click()}
        />
      </Tooltip>

      <Input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files[0]) {
            handleUpload(e.target.files[0]);
            e.target.value = null;
          }
        }}
      />

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
    </>
  );
}

export default UploadChat;
