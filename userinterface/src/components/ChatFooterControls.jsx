import { HStack, Spacer } from "@chakra-ui/react";
import ChatSettings from "./ChatSettings";
import ModelSelect from "./ModelSelect";
import DownloadChat from "./DownloadChat";
import ClearChat from "./ClearChat";
import UploadChat from "./UploadChat";

export default function ChatFooterControls({
  systemPrompt,
  setSystemPrompt,
  prompts,
  setPrompts,
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
}) {
  return (
    <HStack justifyContent="space-between" w="100%">
      <HStack>
        <ChatSettings
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          prompts={prompts}
          setPrompts={setPrompts}
          includeHistory={includeHistory}
          setIncludeHistory={setIncludeHistory}
          waitingResponse={waitingResponse}
          isLibraryOpen={isLibraryOpen}
          setIsLibraryOpen={setIsLibraryOpen}
          onLibraryClose={() => setIsLibraryOpen(false)}
        />
        <ModelSelect model={conversation.model} setModel={conversation.setModel} />
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
