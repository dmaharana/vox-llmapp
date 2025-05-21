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
  isLibraryOpen,
  setIsLibraryOpen,
  conversation,
  convHistory,
  handleClearChat,
  setConversation,
  setCurrentMsgId,
  setConvHistory,
  model,
  setModel,
  isProviderOpen,
  setIsProviderOpen,
  isAddProviderOpen,
  setIsAddProviderOpen,
  onModelSelect,
}) {
  return (
    <HStack justifyContent="space-between" w="100%">
      <HStack>
        <ChatSettings
          includeHistory={includeHistory}
          setIncludeHistory={setIncludeHistory}
          waitingResponse={waitingResponse}
          isLibraryOpen={isLibraryOpen}
          setIsLibraryOpen={setIsLibraryOpen}
          onLibraryClose={() => setIsLibraryOpen(false)}
          isProviderOpen={isProviderOpen}
          setIsProviderOpen={setIsProviderOpen}
          onProviderClose={() => setIsProviderOpen(false)}
          isAddProviderOpen={isAddProviderOpen}
          setIsAddProviderOpen={setIsAddProviderOpen}
          onAddProviderClose={() => setIsAddProviderOpen(false)}
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
