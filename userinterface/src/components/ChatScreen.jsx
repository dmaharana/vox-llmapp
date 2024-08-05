import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Spacer,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { IoMdSend } from "react-icons/io";
import { BeatLoader } from "react-spinners";
import { UserMsg } from "./UserMsg";
import { AssistantMsg } from "./AssistantMsg";
import DownloadChat from "./DownloadChat";
import ModelSelect from "./ModelSelect";
import ChatSettings from "./ChatSettings";
import { DEFAULT_MESSAGES } from "./Constants";
import ClearChat from "./ClearChat";

export default function ChatScreen() {
  const [conversation, setConversation] = useState([]);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    DEFAULT_MESSAGES.SYSTEM_PROMPT
  );
  const [includeHistory, setIncludeHistory] = useState(true);
  const [convHistory, setConvHistory] = useState([]);
  const [convId, setConvId] = useState(1);
  const initialAssistantMessage = (
    <Button
      isLoading
      // colorScheme="orange"
      // loadingText="Thinking..."
      spinner={<BeatLoader size={8} color="red" />}
      variant={"ghost"}
    />
  );
  const [waitingResponse, setWaitingResponse] = useState(false);
  const [currentMsgId, setCurrentMsgId] = useState(1);

  // console.log(model);

  // handle resubmit for a message with given id
  const handleResubmit = async (id) => {
    // find the message with the given id
    setCurrentMsgId(id);
    const message = conversation.find((msg) => msg.id === id);
    const newMessage = {
      id: id,
      user: message.user,
      model: model,
      assistant: "Thinking...",
      resTime: "",
    };

    // setConversation((p) =>
    //   p.map((m) => (m.id === id ? { ...m, newMessage } : m))
    // );
    // ? { ...m, assistant: newMessage.assistant, model: newMessage.model }

    setConversation((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              user: newMessage.user,
              model: newMessage.model,
              assistant: newMessage.assistant,
              resTime: newMessage.resTime,
            }
          : m
      )
    );

    callLlmService(newMessage);
  };

  const handleQueryUpdate = (id, newQuery) => {
    // find the message with the given id
    const message = conversation.find((msg) => msg.id === id);

    if (message) {
      setConversation((conversation) =>
        conversation.map((msg) =>
          msg.id === id ? { ...msg, user: newQuery } : msg
        )
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newMsgId = 1;
    if (conversation.length > 0) {
      newMsgId = conversation[conversation.length - 1].id + 1;
    }
    setCurrentMsgId(newMsgId);

    const newMessage = {
      id: newMsgId,
      user: query,
      model: model,
      // assistant: "",
      assistant: "Thinking...",
      // assistant: initialAssistantMessage,
      resTime: 0,
    };

    if (conversation.length > 0) {
      setConversation([...conversation, newMessage]);
    } else {
      setConversation([newMessage]);
    }
    setQuery("");

    callLlmService(newMessage);
  };

  const callLlmService = async (message) => {
    // console.log(conversation);
    // get user query for the message id
    const query = message.user;
    const msgId = message.id;
    const startTime = new Date().getTime();

    let reqBody = {
      model: model,
      prompt: query,
      stream: true,
      includeHistory: includeHistory,
      systemPrompt: systemPrompt,
    };

    if (conversation.length > 0 && includeHistory) {
      reqBody = {
        ...reqBody,
        conversation: conversation,
      };
    }

    // console.log(JSON.stringify(reqBody));
    try {
      setWaitingResponse(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errBody = await response.json();
        console.error(errBody);
        setConversation((p) =>
          p.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  assistant: errBody.message,
                  model,
                  resTime: "0s",
                }
              : m
          )
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        if (done) {
          break;
        }

        const chunkValue = decoder.decode(value, { stream: true });
        try {
          // const chunkValue = decoder.decode(value);
          const cJson = JSON.parse(chunkValue);

          // console.log(cJson);
          if (cJson["response"]) {
            text += cJson["response"];
          }
          const endTime = new Date().getTime();
          const resTime = (endTime - startTime) / 1000;
          setConversation((p) =>
            p.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    systemPrompt,
                    assistant: text,
                    model,
                    resTime: `${resTime.toFixed(2)}s`,
                  }
                : m
            )
          );
        } catch (error) {
          console.error(error);
          console.log(chunkValue);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setWaitingResponse(false);
      setCurrentMsgId(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  const handleClearChat = () => {
    setConversation({});
  };

  return (
    <Box>
      <VStack h={"90vh"} bg={"gray.50"} py={4} px={2} borderRadius={"2rem"}>
        <Text
          fontFamily={"Gothic"}
          fontSize={"2.0rem"}
          fontWeight={"bold"}
          textAlign={"center"}
          color={"#000000"}
          bg={"#FFD7BE"}
          w={"100%"}
          p={2}
          borderRadius={"2rem"}
          textShadow={"2px 2px 4px #000000"}
        >
          Vox
        </Text>
        <VStack h={"100vh"} w={"100%"} bg={"blue.150"} overflowY={"auto"}>
          {conversation.length > 0 ? (
            conversation.map((m) => (
              <Box key={m.id} w={"100%"}>
                {m.user && (
                  <UserMsg
                    msg={m.user}
                    msgId={m.id}
                    waitingResponse={waitingResponse}
                    handleQueryUpdate={handleQueryUpdate}
                  />
                )}
                {m.assistant && (
                  <AssistantMsg
                    msg={m.assistant}
                    name={m.model}
                    convId={m.id}
                    resTime={m.resTime}
                    handleRepeat={handleResubmit}
                    waitingResponse={waitingResponse}
                    currentMsgId={currentMsgId}
                    defaultMsg={initialAssistantMessage}
                  />
                )}
              </Box>
            ))
          ) : (
            <Box w={"100%"} bg={"purple.50"}>
              <VStack h={"100vh"} w={"100%"} bg={"blue.150"} overflowY={"auto"}>
                {initialAssistantMessage}

                <Text fontSize={"lg"} color={"gray.600"} as={"i"}>
                  Start a conversation...
                </Text>
              </VStack>
            </Box>
          )}
        </VStack>

        <Box w={"100%"} bg={"green.50"}>
          <HStack bg={"green.50"}>
            <Textarea
              isDisabled={waitingResponse}
              placeholder="Enter your query here, Ctrl+Enter to send"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e)}
              borderRadius={"2rem"}
              h={"70%"}
              // resize={"none"}
              paddingTop={"2rem"}
            />
            {query && (
              <Button
                colorScheme={"purple"}
                type="submit"
                variant={"ghost"}
                isDisabled={!query || waitingResponse}
                onClick={(e) => handleSubmit(e)}
              >
                <IoMdSend size={40} />
              </Button>
            )}
          </HStack>
          <HStack>
            <ChatSettings
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              includeHistory={includeHistory}
              setIncludeHistory={setIncludeHistory}
              waitingResponse={waitingResponse}
            />
            <ModelSelect model={model} setModel={setModel} />
            <Spacer />
            {conversation.length > 0 && (
              <DownloadChat
                conversation={conversation}
                waitingResponse={waitingResponse}
              />
            )}
            {conversation.length > 0 && (
              <ClearChat
                handleClearChat={handleClearChat}
                waitingResponse={waitingResponse}
              />
            )}
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}
