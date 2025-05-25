import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setPrompts, setSystemPrompt } from "../store/promptSlice";
import ShowAlert from "./ShowAlert";
import {
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
import { PromptSearch } from "./PromptLibrary/PromptSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";
import { PromptItem } from "./PromptLibrary/PromptItem";
import { AddPromptForm } from "./PromptLibrary/AddPromptForm";
import generateUUID from "./scripts/utils";
import { DEFAULT_MESSAGES } from "./Constants";

export default function PromptLibrary({ isOpen, onClose, isEmbedded = false }) {
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onClose: onDeleteDialogClose,
  } = useDisclosure();
  const dispatch = useDispatch();
  const prompts = useSelector((state) => state.prompt.prompts);
  const systemPrompt = useSelector((state) => state.prompt.systemPrompt);

  const cancelRef = useRef(null);
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
  const [importMessage, setImportMessage] = useState("");
  const [showImportAlert, setShowImportAlert] = useState(false);
  const enableDownload = prompts.length > 0;

  useEffect(() => {
    const savedPrompts = localStorage.getItem("prompts");
    if (savedPrompts) {
      const parsedPrompts = JSON.parse(savedPrompts);
      if (parsedPrompts.length > 0) {
        // sort the prompts by name
        parsedPrompts.sort((a, b) => a.name.localeCompare(b.name));
        dispatch(setPrompts(parsedPrompts));
        return;
      }
    }

    fetch("/api/prompts")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch prompts");
        return response.json();
      })
      .then((data) => {
        const serverPrompts = data.prompts || [];
        const promptsWithIds = serverPrompts.map((prompt) => ({
          ...prompt,
          id: prompt.id || generateUUID(),
          name: String(prompt.name || "Unnamed Prompt"),
          content: String(prompt.content || ""),
        }));
        localStorage.setItem("prompts", JSON.stringify(promptsWithIds));
        dispatch(setPrompts(promptsWithIds));
      })
      .catch((error) => console.error("Prompt fetch error:", error));
  }, [dispatch]);

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
    dispatch(setPrompts(prompts.filter((p) => p.id !== promptToDelete)));
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

        dispatch(setPrompts(validatedPrompts));
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

      // add the new prompt to the prompts array
      const updatedPrompts = [...prompts, newPrompt];

      // sort the prompts by name
      updatedPrompts.sort((a, b) => a.name.localeCompare(b.name));

      dispatch(setPrompts(updatedPrompts));
      setNewPromptName("");
      setNewPromptContent("");
    }
  };

  const content = (
    <Box maxH={isEmbedded ? "50vh" : "60vh"} overflowY="auto" pr={2}>
      <PromptSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showAddPrompt={showAddPrompt}
        setShowAddPrompt={setShowAddPrompt}
      />

      {showAddPrompt && (
        <AddPromptForm
          showAddPrompt={showAddPrompt}
          newPromptName={newPromptName}
          setNewPromptName={setNewPromptName}
          newPromptContent={newPromptContent}
          setNewPromptContent={setNewPromptContent}
          onSave={handleAddPrompt}
          setShowAddPrompt={setShowAddPrompt}
          prompts={prompts}
        />
      )}

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
                dispatch(
                  setPrompts(
                    prompts.map((p) =>
                      p.id === id ? { ...p, name, content } : p,
                    ),
                  ),
                );
                setEditingPrompt(null);
              }}
              onDelete={(id) => handleDeletePrompt(id)}
              onUse={(content) => {
                dispatch(setSystemPrompt(content));
                if (!isEmbedded) {
                  onClose();
                }
              }}
            />
          ))}
      </VStack>
    </Box>
  );

  {
    showImportAlert && (
      <ShowAlert
        status={importStatus}
        title={
          importStatus === "success" ? "Import Successful" : "Import Error"
        }
        message={importMessage}
        resetStates={() => setShowImportAlert(false)}
      />
    );
  }

  if (isEmbedded) {
    return (
      <>
        {content}

        <Box mt={4}>
          <HStack spacing={3} justify="flex-end">
            <ImportExportButtons
              exportLabel={DEFAULT_MESSAGES.exportPrompts}
              importLabel={DEFAULT_MESSAGES.importPrompts}
              handleExport={handleExportPrompts}
              handleImport={handleImportPrompts}
              fileInputRef={fileInputRef}
              enableDownload={enableDownload}
            />
          </HStack>
        </Box>

        <AlertDialog
          isOpen={isDeleteDialogOpen}
          leastDestructiveRef={cancelRef}
          onClose={onDeleteDialogClose}
          motionPreset="slideInBottom"
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete Prompt
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to delete this prompt? This action cannot
                be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button
                  ref={cancelRef}
                  onClick={onDeleteDialogClose}
                  colorScheme="gray"
                >
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </>
    );
  }
}
