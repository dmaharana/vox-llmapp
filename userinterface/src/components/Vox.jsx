// import { Container, Row, Col, InputGroup, Form, Button } from "react-bootstrap";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  IconButton,
  Stack,
  SimpleGrid,
  Text,
  Textarea,
  HStack,
  Icon,
} from "@chakra-ui/react";
// import {
//   //   FaSun,
//   //   FaMoon,
//   //   FaFacebook,
//   //   FaTwitter,
//   //   FaWhatsapp,
//   FaTelegram,
// } from "react-icons/fa";
import { ChatIcon } from "@chakra-ui/icons";

export default function Vox() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse(null);
    const reqBody = {
      model: "llama3:latest",
      prompt: query,
      stream: true,
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        // console.log(`rtxt: ${value}, done: ${doneReading}`);

        // const decodedChunk = decoder.decode(value, { stream: true });

        done = doneReading;
        if (done) {
          break;
        }
        const chunkValue = decoder.decode(value);
        const cJson = JSON.parse(chunkValue);
        console.log(cJson);
        text += cJson["response"];
        setResponse(text);
        // console.log(text);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center">
      {response ? (
        <HStack>
          <Box
            p={4}
            color="black"
            w="500px"
            h="500px"
            bg="gray.50"
            borderWidth={1}
            borderRadius={8}
            boxShadow="lg"
          >
            <Textarea
              value={response}
              w="500px"
              h="500px"
              bg="gray.50"
            ></Textarea>
          </Box>
        </HStack>
      ) : null}
      <HStack>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query here"
          size="lg"
          width="500px"
          height="50px"
        ></Textarea>

        <Button
          onClick={(e) => {
            handleSubmit(e);
          }}
          colorScheme="teal"
          size="lg"
        >
          <ChatIcon />
        </Button>
      </HStack>
    </Flex>
  );
}
