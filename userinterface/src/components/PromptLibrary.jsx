import { useState, useEffect } from "react";
import { Textarea } from "@chakra-ui/react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  useDisclosure,
  Box,
  Divider,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { AddIcon, DragHandleIcon, DeleteIcon } from "@chakra-ui/icons";
import { useRef } from "react";
import { DEFAULT_MESSAGES } from "./Constants";

export default function PromptLibrary({
  systemPrompt,
  setSystemPrompt,
  isOpen,
  onClose,
}) {
  const { 
    isOpen: isDeleteDialogOpen, 
    onOpen: onDeleteDialogOpen, 
    onClose: onDeleteDialogClose 
  } = useDisclosure();
  const cancelRef = useRef();
  const [promptToDelete, setPromptToDelete] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const response = await fetch("/api/prompts");
        const data = await response.json();
        setPrompts(data.prompts || []);
      } catch (error) {
        console.error("Error fetching prompts:", error);
      }
    }
    fetchPrompts();
  }, []);

  const handleDeletePrompt = (index) => {
    setPromptToDelete(index);
    onDeleteDialogOpen();
  };

  const confirmDelete = () => {
    setPrompts(prompts.filter((_, i) => i !== promptToDelete));
    onDeleteDialogClose();
    setPromptToDelete(null);
  };

  const handleAddPrompt = () => {
    if (newPromptName && newPromptContent) {
      setPrompts([
        ...prompts,
        { name: newPromptName, content: newPromptContent },
      ]);
      setNewPromptName("");
      setNewPromptContent("");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>System Prompts Library</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box maxH="60vh" overflowY="auto" pr={2}>
            <VStack spacing={4} align="stretch">
            {prompts.map((prompt, index) => (
              <Box key={index} p={2} borderWidth="1px" borderRadius="md">
                <HStack justify="space-between">
                  <Text fontWeight="bold">{prompt.name}</Text>
                  <HStack>
                    <IconButton
                      icon={<DragHandleIcon />}
                      size="sm"
                      variant="ghost"
                      aria-label="Reorder"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        setSystemPrompt(prompt.content);
                        onClose();
                      }}
                    >
                      Use
                    </Button>
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      aria-label="Delete prompt"
                      onClick={() => handleDeletePrompt(index)}
                    />
                  </HStack>
                </HStack>
                <Text fontSize="sm" mt={2}>
                  {prompt.content}
                </Text>
              </Box>
            ))}
          </VStack>

          <Divider my={4} />

          <VStack spacing={3} align="stretch">
            <Text fontWeight="bold">Add New Prompt</Text>
            <Input
              placeholder="Prompt name"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
            />
            <Textarea
              placeholder="Prompt content"
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
            />
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={handleAddPrompt}
            >
              Add Prompt
            </Button>
          </VStack>
        </Box>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>

      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Prompt
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteDialogClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Modal>
  );
}
