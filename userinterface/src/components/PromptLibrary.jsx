import { useState, useEffect, useRef } from "react";
import ShowAlert from "./ShowAlert";
import {
  Textarea,
  Input,
  Box,
  VStack,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { PromptSearch } from "./PromptLibrary/PromptSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";
import { PromptItem } from "./PromptLibrary/PromptItem";

export default function PromptLibrary({
  systemPrompt,
  setSystemPrompt,
  isOpen,
  prompts,
  setPrompts,
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
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const initialLoadComplete = useRef(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState(""); // Corrected typo here
  const [showImportAlert, setShowImportAlert] = useState(false);

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
          name: String(prompt.name || "Unnamed Prompt"),
          content: String(prompt.content || ""),
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

  useEffect(() => {
    if (showImportAlert) {
      const timer = setTimeout(() => {
        setShowImportAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showImportAlert]);

  // Save prompts to localStorage whenever prompts state changes after initial load
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
          id: prompt.id || generateUUID(),
          name: String(prompt.name || "Unnamed Prompt"),
          content: String(prompt.content || ""),
        }));

        setPrompts(validatedPrompts);
        setImportStatus("success");
        setImportMessage("Prompts imported successfully!");
        setShowImportAlert(true);
      } catch (error) {
        console.error("Import error:", error);
        setImportStatus("error");
        setImportMessage("Failed to import: Invalid file format");
        setShowImportAlert(true);
      }
    };
    reader.readAsText(file);
  };

  const handleAddPrompt = async () => {
    if (newPromptName && newPromptContent) {
      const newPrompt = {
        id: generateUUID(),
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
        <ModalBody pb={6}>
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
                ?.filter((prompt) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    prompt.name.toLowerCase().includes(query) ||
                    prompt.content.toLowerCase().includes(query)
                  );
                })
                .map((prompt) => (
                  <PromptItem
                    key={prompt.id}
                    prompt={prompt}
                    searchQuery={searchQuery}
                    isEditing={editingPrompt === prompt.id}
                    onEdit={(id) => {
                      setEditingPrompt(id);
                      setEditName(prompt.name);
                      setEditContent(prompt.content);
                    }}
                    onSaveEdit={(id, name, content) => {
                      setPrompts((prev) =>
                        prev.map((p) =>
                          p.id === id ? { ...p, name, content } : p
                        )
                      );
                      setEditingPrompt(null);
                    }}
                    onDelete={handleDeletePrompt}
                    onUse={(content) => {
                      setSystemPrompt(content);
                      onClose();
                    }}
                  />
                ))}
            </VStack>
          </Box>
        </ModalBody>

        {showImportAlert && (
          <ShowAlert
            status={importStatus}
            title={
              importStatus === "success" ? "Import Successful" : "Import Error"
            }
            message={importMessage}
            resetStates={() => setShowImportAlert(false)}
          />
        )}

        <ModalFooter>
          <HStack spacing={3}>
            <ImportExportButtons
              handleExportPrompts={handleExportPrompts}
              handleImportPrompts={handleImportPrompts}
              fileInputRef={fileInputRef}
            />
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </HStack>
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
