import AssistantHistoryMessage from "./AssistantHistoryMessage";

// if response is regenerated then the existing assistant message will be saved into the history object with the same conversation id, so that the history can be shown to the user

function AssistantHistory({ conversation }) {
  const count = conversation?.length;

  return (
    <>
      {count > 0 ? (
        <>
          {conversation
            ?.slice()
            ?.reverse()
            ?.map((msg, index) => (
              <AssistantHistoryMessage
                key={`${msg.id}_${index}`}
                msg={msg}
                count={count}
                index={index}
              />
            ))}
        </>
      ) : null}
    </>
  );
}

export default AssistantHistory;
