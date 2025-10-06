import { FormControl, FormLabel, Switch, Tooltip } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { setChatMode } from "../../store/userSlice";
import InfoIconMessage from "../InfoIconMessage";

function ChatModeSwitch() {
  const dispatch = useDispatch();
  const { chatMode } = useSelector((state) => state.user);

  const handleChange = (e) => {
    const newMode = e.target.checked ? "formal" : "informal";
    dispatch(setChatMode(newMode));
  };

  return (
    <FormControl display="flex" alignItems="center">
      <FormLabel htmlFor="chat-mode" mb="0">
        Formal Mode
      </FormLabel>
      <Switch
        id="chat-mode"
        onChange={handleChange}
        isChecked={chatMode === "formal"}
        size="md"
      />
      <InfoIconMessage
        message={
          chatMode === "formal"
            ? "Assistant will maintain a formal, professional tone"
            : "Assistant will use a more casual, friendly tone"
        }
      />
    </FormControl>
  );
}

export default ChatModeSwitch; 