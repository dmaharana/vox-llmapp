import { HStack, Spacer } from "@chakra-ui/react";
import ChatSettings from "./ChatSettings";
import DownloadChat from "./DownloadChat";
import ClearChat from "./ClearChat";
import UploadChat from "./UploadChat";
import ModelSelect from "./ModelSelect";

export default function ChatFooterControls({
  includeHistory,
  setIncludeHistory,
  waitingResponse,
  conversation,
  convHistory,
  handleClearChat,
  setConversation,
  setCurrentMsgId,
  setConvHistory,
  model,
  setModel,
  onModelSelect,
}) {
  return (
    <HStack justifyContent="space-between" w="100%">
      <HStack>
        <ChatSettings
          includeHistory={includeHistory}
          setIncludeHistory={setIncludeHistory}
          waitingResponse={waitingResponse}
        />

        <ModelSelect model={model} setModel={setModel} onModelSelect={onModelSelect} />
      </HStack>

      <HStack>
        {conversation.length > 0 && (
          <DownloadChat
            conversation={conversation}
            waitingResponse={waitingResponse}
            convHistory={convHistory}
          />
        )}
        {conversation.length > 0 && (
          <ClearChat
            handleClearChat={handleClearChat}
            waitingResponse={waitingResponse}
          />
        )}
        <UploadChat
          setConversation={setConversation}
          waitingResponse={waitingResponse}
          setCurrentMsgId={setCurrentMsgId}
          setConvHistory={setConvHistory}
        />
      </HStack>
    </HStack>
  );
}
