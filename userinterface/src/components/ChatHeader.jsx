import { HStack, IconButton, Text } from "@chakra-ui/react";
import { MoonIcon, SunIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useSelector } from "react-redux";
import { DEFAULT_MESSAGES } from "./Constants";
import { useColorModeValue } from "@chakra-ui/react";

export default function ChatHeader({
  toggleColorMode,
  colorMode,
  setIsLibraryOpen,
  toggleSidebar,
}) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const bgText = useColorModeValue("blue.900", "blue.100");
  const bgHeader = useColorModeValue("blue.100", "blue.600");

  return (
    <HStack
      w="100%"
      p={2}
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
            backgroundColor: bgHeader,
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
        {(() => {
          if (systemPrompt !== DEFAULT_MESSAGES.SYSTEM_PROMPT) {
            const matchedPrompt = prompts?.find(
              (p) => p.content === systemPrompt,
            );
            if (matchedPrompt) {
              return ` as ${matchedPrompt.name}`;
            } else {
              return ` as Custom Prompt`;
            }
          }
          return "";
        })()}
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
            backgroundColor: bgHeader,
          },
        }}
      />
    </HStack>
  );
}
