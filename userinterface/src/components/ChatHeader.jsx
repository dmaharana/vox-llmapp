import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { HStack, IconButton, Text, Avatar, Box } from "@chakra-ui/react";
import { MoonIcon, SunIcon, TimeIcon } from "@chakra-ui/icons";

import { useSelector } from "react-redux";
import { DEFAULT_MESSAGES } from "./Constants";
import { useColorModeValue } from "@chakra-ui/react";
import appIcon from "/vox.png";

export default function ChatHeader({ toggleColorMode, colorMode }) {
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);
  const bgText = useColorModeValue("blue.900", "blue.100");
  const bgHeader = useColorModeValue("blue.100", "blue.600");
  const bgHeaderButton = useColorModeValue("blue.200", "blue.700");
  const [isHovering, setIsHovering] = useState(false);

  const [now, setNow] = useState(new Date());
  // const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  // const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone });
  // const dateString = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone });
  // const dayString = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateString = now.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayString = now.toLocaleDateString("en-US", { weekday: "long" });

  useEffect(() => {
    let timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPromptSuffix = () => {
    if (systemPrompt === DEFAULT_MESSAGES.SYSTEM_PROMPT) {
      return "";
    }

    const matchedPrompt = prompts?.find((p) => p.content === systemPrompt);
    return matchedPrompt ? ` as ${matchedPrompt.name}` : ` as Custom Prompt`;
  };

  return (
    <>
      <HStack
        w="100%"
        py={1}
        pr={2}
        pl={2}
        bg={bgHeader}
        justifyContent="space-between"
        alignItems="center"
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <HStack flex="0 1 auto" position="relative">
          <Box
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <Avatar size={"xs"} name="Assistant" src={appIcon} mb={1} mr={2} />
            {isHovering && (
              <Text
                position="absolute"
                left="100%"
                top="50%"
                transform="translateY(-50%)"
                ml={2}
                fontFamily="Raleway, sans-serif"
                fontSize="1.2rem"
                fontWeight="bold"
                color={bgText}
                whiteSpace="nowrap"
                zIndex={1001}
              >
                {DEFAULT_MESSAGES.APP_TITLE}
                <span style={{ fontSize: "0.8rem" }}>{getPromptSuffix()}</span>
              </Text>
            )}
          </Box>
        </HStack>

        <HStack flex="1" justifyContent="center" spacing={1}>
          <TimeIcon boxSize={3} />
          <span
            className="font-semibold tracking-widest text-sm text-gray-700 dark:text-gray-200"
            style={{ letterSpacing: "0.08em" }}
          >
            {timeString}
          </span>
          <span className="text-[4px] text-gray-500 dark:text-gray-400 font-normal">
            · {dateString} · {dayString}
          </span>
        </HStack>

        <IconButton
          aria-label="Toggle dark mode"
          icon={colorMode === "light" ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
          variant="ghost"
          size="sm"
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
  colorMode: PropTypes.oneOf(["light", "dark"]).isRequired,
};
