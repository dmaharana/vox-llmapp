import { HStack, IconButton, Text } from "@chakra-ui/react";
import { MoonIcon, SunIcon, HamburgerIcon } from "@chakra-ui/icons";
import { DEFAULT_MESSAGES } from "./Constants";

export default function ChatHeader({
  toggleColorMode,
  colorMode,
  systemPrompt,
  prompts,
  setIsLibraryOpen,
  toggleSidebar,
}) {
  return (
    <HStack
      w="100%"
      p={2}
      borderRadius="2rem"
      bg="#FFD7BE"
      justifyContent="space-between"
      alignItems="center"
    >
      <IconButton
        aria-label="Toggle sidebar"
        icon={<HamburgerIcon />}
        size="sm"
        onClick={toggleSidebar}
        variant="ghost"
        mr={2}
        color="black"
        sx={{
          _hover: {
            backgroundColor: "#fcbf9e",
          },
        }}
      />

      <Text
        fontFamily="Gothic"
        fontSize="2.0rem"
        fontWeight="bold"
        textAlign="center"
        color="#000000"
        flex="1"
        textShadow="2px 2px 4px #000000"
      >
        {DEFAULT_MESSAGES.APP_TITLE}
        {(() => {
          if (systemPrompt !== DEFAULT_MESSAGES.SYSTEM_PROMPT) {
            const matchedPrompt = prompts?.find(
              (p) => p.content === systemPrompt
            );
            if (matchedPrompt) {
              return ` (${matchedPrompt.name})`;
            } else {
              return ` (Custom Prompt)`;
            }
          }
          return "";
        })()}
      </Text>

      <IconButton
        aria-label="Toggle dark mode"
        icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        size="lg"
        color="black"
        sx={{
          _hover: {
            backgroundColor: "#fcbf9e",
          },
        }}
      />
    </HStack>
  );
}
