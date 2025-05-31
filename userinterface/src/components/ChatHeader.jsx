import PropTypes from "prop-types";
import { HStack, IconButton, Text } from "@chakra-ui/react";
import { MoonIcon, SunIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useSelector } from "react-redux";
import { DEFAULT_MESSAGES } from "./Constants";
import { useColorModeValue } from "@chakra-ui/react";

export default function ChatHeader({
  toggleColorMode,
  colorMode,
  toggleSidebar,
}) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const bgText = useColorModeValue("blue.900", "blue.100");
  const bgHeader = useColorModeValue("blue.100", "blue.600");
  const bgHeaderButton = useColorModeValue("blue.200", "blue.700");

  const getPromptSuffix = () => {
    if (systemPrompt === DEFAULT_MESSAGES.SYSTEM_PROMPT) {
      return "";
    }
    
    const matchedPrompt = prompts?.find(p => p.content === systemPrompt);
    return matchedPrompt 
      ? ` as ${matchedPrompt.name}`
      : ` as Custom Prompt`;
  };

  return (
    <HStack
      w="100%"
      py={2}
      pr={2}
      pl={0}
      bg={bgHeader}
      justifyContent="space-between"
      alignItems="center"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <IconButton
        aria-label="Toggle sidebar"
        icon={<HamburgerIcon />}
        size="sm"
        onClick={toggleSidebar}
        variant="ghost"
        mr={2}
        color={bgText}
        sx={{
          _hover: {
            backgroundColor: bgHeaderButton,
          },
        }}
      />

      <Text
        fontFamily="Raleway, sans-serif"
        fontSize="2.0rem"
        fontWeight="bold"
        textAlign="center"
        color={bgText}
        flex="1"
      >
        {DEFAULT_MESSAGES.APP_TITLE}
        {getPromptSuffix()}
      </Text>

      <IconButton
        aria-label="Toggle dark mode"
        icon={colorMode === "light" ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        size="lg"
        color={bgText}
        sx={{
          _hover: {
            backgroundColor: bgHeaderButton,
          },
        }}
      />
    </HStack>
  );
}

ChatHeader.propTypes = {
  toggleColorMode: PropTypes.func.isRequired,
  colorMode: PropTypes.oneOf(['light', 'dark']).isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};