import PropTypes from "prop-types";
import { HStack } from "@chakra-ui/react";
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
  chatFooterDefaultSettingsTab,
  isSettingsOpen,
  setIsSettingsOpen,
}) {

  // if chatFooterDefaultSettingsTab is undefined, set it to "settings"
  if (chatFooterDefaultSettingsTab === undefined) {
    chatFooterDefaultSettingsTab = "prompt";
  }

  return (
    <HStack justifyContent="space-between" w="100%">
      <HStack>
        <ChatSettings
          includeHistory={includeHistory}
          setIncludeHistory={setIncludeHistory}
          waitingResponse={waitingResponse}
          defaultTab={chatFooterDefaultSettingsTab}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
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

ChatFooterControls.propTypes = {
  includeHistory: PropTypes.bool.isRequired,
  setIncludeHistory: PropTypes.func.isRequired,
  waitingResponse: PropTypes.bool.isRequired,
  conversation: PropTypes.array.isRequired,
  convHistory: PropTypes.array,
  handleClearChat: PropTypes.func.isRequired,
  setConversation: PropTypes.func.isRequired,
  setCurrentMsgId: PropTypes.func.isRequired,
  setConvHistory: PropTypes.func.isRequired,
  model: PropTypes.string.isRequired,
  setModel: PropTypes.func.isRequired,
  onModelSelect: PropTypes.func.isRequired,
  chatFooterDefaultSettingsTab: PropTypes.string.isRequired,
  isSettingsOpen: PropTypes.bool.isRequired,
  setIsSettingsOpen: PropTypes.func.isRequired,
};