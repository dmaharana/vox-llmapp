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
  useDisclosure,
  Box,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  IconButton,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { PiUploadLight } from "react-icons/pi";
import { PromptSearch } from "./PromptLibrary/PromptSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";

import { useRef } from "react";

export default function PromptLibrary({
  systemPrompt,
  setSystemPrompt,
  isOpen,
  onClose,
}) {
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onClose: onDeleteDialogClose,
  } = useDisclosure();
  const cancelRef = useRef();
  const fileInputRef = useRef();
  const [promptToDelete, setPromptToDelete] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    const savedPrompts = localStorage.getItem("prompts");
    if (savedPrompts) {
      const parsedPrompts = JSON.parse(savedPrompts);
      if (parsedPrompts.length > 0) {
        setPrompts(parsedPrompts);
        return;
      }
    }

    console.log("No prompts found in localStorage, fetching from server...");

    // Fetch default prompts from server if localStorage is empty or has empty array
    fetch("/api/prompts")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch prompts");
        return response.json();
      })
      .then((data) => {
        const serverPrompts = data.prompts || [];
        const promptsWithIds = serverPrompts.map((prompt) => ({
          ...prompt,
          id: prompt.id || crypto.randomUUID(),
        }));
        localStorage.setItem("prompts", JSON.stringify(promptsWithIds));
        setPrompts(promptsWithIds);
      })
      .catch((error) => console.error("Prompt fetch error:", error));
  }, []);

  // Mark initial load complete after first valid prompts load
  useEffect(() => {
    if (prompts.length > 0 && !initialLoadComplete.current) {
      initialLoadComplete.current = true;
    }
  }, [prompts]);

  // Save prompts to localStorage whenever they change after initial load
  useEffect(() => {
    if (initialLoadComplete.current) {
      localStorage.setItem("prompts", JSON.stringify(prompts));
    }
  }, [prompts]);

  const handleDeletePrompt = (promptId) => {
    setPromptToDelete(promptId);
    onDeleteDialogOpen();
  };

  const confirmDelete = () => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptToDelete));
    onDeleteDialogClose();
    setPromptToDelete(null);
  };

  const handleExportPrompts = () => {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompts_export_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportPrompts = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPrompts = JSON.parse(e.target.result);

        if (!Array.isArray(importedPrompts)) {
          throw new Error("Invalid format: Expected array of prompts");
        }

        const validatedPrompts = importedPrompts.map((prompt) => ({
          id: prompt.id || crypto.randomUUID(),
          name: prompt.name || "Unnamed Prompt",
          content: prompt.content || "",
        }));

        setPrompts(validatedPrompts);
        alert("Prompts imported successfully!");
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import prompts: Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  const handleAddPrompt = async () => {
    if (newPromptName && newPromptContent) {
      const newPrompt = {
        id: crypto.randomUUID(),
        name: newPromptName,
        content: newPromptContent,
      };
      setPrompts((prev) => [...prev, newPrompt]);
      setNewPromptName("");
      setNewPromptContent("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      scrollBehavior="inside"
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>System Prompts Library</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box maxH="60vh" overflowY="auto" pr={2}>
            <PromptSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showAddPrompt={showAddPrompt}
              setShowAddPrompt={setShowAddPrompt}
            />

            {showAddPrompt ? (
              <Box pb={4}>
                <Input
                  placeholder="Prompt name"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  mb={3}
                />
                <Textarea
                  placeholder="Prompt content"
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  mb={3}
                />
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={handleAddPrompt}
                    isDisabled={!newPromptName || !newPromptContent}
                    mt={3}
                  >
                    Add Prompt
                  </Button>
                </Box>
              </Box>
            ) : null}

            <VStack spacing={4} align="stretch">
              {prompts
                .filter((prompt) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    prompt.name.toLowerCase().includes(query) ||
                    prompt.content.toLowerCase().includes(query)
                  );
                })
                .map((prompt, index) => (
                  <Box
                    key={prompt.id || index}
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                  >
                    <HStack justify="space-between">
                      {editingPrompt === prompt.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          size="sm"
                          fontWeight="bold"
                        />
                      ) : (
                        <Text fontWeight="bold">{prompt.name}</Text>
                      )}
                      <HStack>
                        {editingPrompt === prompt.id ? (
                          <>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => {
                                setPrompts(
                                  prompts.map((p) =>
                                    p.id === prompt.id
                                      ? {
                                          ...p,
                                          name: editName,
                                          content: editContent,
                                        }
                                      : p
                                  )
                                );
                                setEditingPrompt(null);
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPrompt(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
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
                              icon={<EditIcon />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              aria-label="Edit prompt"
                              onClick={() => {
                                setEditingPrompt(prompt.id);
                                setEditName(prompt.name);
                                setEditContent(prompt.content);
                              }}
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Delete prompt"
                              onClick={() => handleDeletePrompt(prompt.id)}
                            />
                          </>
                        )}
                      </HStack>
                    </HStack>
                    {editingPrompt === prompt.id ? (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        fontSize="sm"
                        mt={2}
                        resize="vertical"
                      />
                    ) : (
                      <Text fontSize="sm" mt={2}>
                        {(() => {
                          if (!searchQuery) return prompt.content;
                          const regex = new RegExp(`(${searchQuery})`, "gi");
                          return prompt.content
                            .split(regex)
                            .map((part, i) =>
                              i % 2 === 1 ? <mark key={i}>{part}</mark> : part
                            );
                        })()}
                      </Text>
                    )}
                  </Box>
                ))}
            </VStack>
          </Box>
        </ModalBody>
        <ModalFooter>
          <ImportExportButtons
            handleExportPrompts={handleExportPrompts}
            handleImportPrompts={handleImportPrompts}
            fileInputRef={fileInputRef}
          />
          <Button colorScheme="blue" onClick={onClose}>
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
              Are you sure you want to delete this prompt? This action cannot be
              undone.
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
