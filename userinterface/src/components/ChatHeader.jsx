import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { HStack, IconButton, Text, Avatar } from "@chakra-ui/react";
import { MoonIcon, SunIcon, TimeIcon } from "@chakra-ui/icons";

import { useSelector } from "react-redux";
import { DEFAULT_MESSAGES } from "./Constants";
import { useColorModeValue } from "@chakra-ui/react";
import appIcon from "/vox.png";

export default function ChatHeader({
  toggleColorMode,
  colorMode,
}) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const bgText = useColorModeValue("blue.900", "blue.100");
  const bgHeader = useColorModeValue("blue.100", "blue.600");
  const bgHeaderButton = useColorModeValue("blue.200", "blue.700");

  const [now, setNow] = useState(new Date());
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone });
  const dateString = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone });
  const dayString = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });

  useEffect(() => {
    let timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    <>
      <HStack
        w="100%"
        py={2}
        pr={2}
        pl={2}
        bg={bgHeader}
        justifyContent="space-between"
        alignItems="center"
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <HStack flex="0 1 auto">
          <Avatar
            size={"sm"}
            name="Assistant"
            src={appIcon}
            mb={2}
            mr={3}
            //bg={avatarBg}
          />
          <Text
            fontFamily="Raleway, sans-serif"
            fontSize="1.5rem"
            fontWeight="bold"
            color={bgText}
          >
            {DEFAULT_MESSAGES.APP_TITLE}
            <span style={{ fontSize: '1rem' }}>
              {getPromptSuffix()}
            </span>
          </Text>
        </HStack>

        <HStack flex="1" justifyContent="center">
          <TimeIcon />
          <span className="font-semibold tracking-widest text-xs text-gray-700 dark:text-gray-200" style={{ letterSpacing: '0.08em' }}>{timeString}</span>
          <span className="text-[8px] text-gray-500 dark:text-gray-400 font-normal">· {dateString} · {dayString}</span>
        </HStack>

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
    </>
  );
}

ChatHeader.propTypes = {
  toggleColorMode: PropTypes.func.isRequired,
  colorMode: PropTypes.oneOf(['light', 'dark']).isRequired,
};