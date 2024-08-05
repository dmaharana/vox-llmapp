import { Box, Switch, Tooltip, FormControl, FormLabel } from "@chakra-ui/react";
import InfoIconMessage from "./InfoIconMessage";
import { DEFAULT_MESSAGES } from "./Constants";

function IncludeHistorySwitch({
  includeHistory,
  setIncludeHistory,
  waitingResponse,
}) {
  const handleChange = (e) => {
    setIncludeHistory(e.target.checked);
  };

  return (
    <FormControl display="flex" alignItems="center">
      <FormLabel htmlFor="email-alerts" mb="0">
        Enable chat history?
      </FormLabel>
      <Switch
        id="enable-chat-history"
        onChange={handleChange}
        isChecked={includeHistory}
        size="md"
        isDisabled={waitingResponse}
      />
      <InfoIconMessage
        message={
          includeHistory
            ? DEFAULT_MESSAGES.CHAT_HISTORY_ON_MSG
            : DEFAULT_MESSAGES.CHAT_HISTORY_OFF_MSG
        }
      />
    </FormControl>
  );
}

export default IncludeHistorySwitch;
