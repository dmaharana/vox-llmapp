import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setProviders } from "../store/providerSlice";
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
import { AddIcon } from "@chakra-ui/icons";
import { ProviderSearch } from "./Provider/ProviderSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";
import { ProviderItem } from "./Provider/ProviderItem";
import generateUUID from "./scripts/utils";

export default function ProviderManagement({ isOpen, onClose }) {
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onClose: onDeleteDialogClose,
  } = useDisclosure();
  const dispatch = useDispatch();
  const providers = useSelector((state) => state.provider.providers);

  const cancelRef = useRef();
  const fileInputRef = useRef();
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderConfig, setNewProviderConfig] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editName, setEditName] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const initialLoadComplete = useRef(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [showImportAlert, setShowImportAlert] = useState(false);

  useEffect(() => {
    const savedProviders = localStorage.getItem("providers");
    if (savedProviders) {
      const parsedProviders = JSON.parse(savedProviders);
      if (parsedProviders.length > 0) {
        dispatch(setProviders(parsedProviders));
        return;
      }
    }

    fetch("/api/providers")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch providers");
        return response.json();
      })
      .then((data) => {
        const serverProviders = data.providers || [];
        const providersWithIds = serverProviders.map((provider) => ({
          ...provider,
          id: provider.id || generateUUID(),
          name: String(provider.name || "Unnamed Provider"),
          config: String(provider.config || ""),
        }));
        localStorage.setItem("providers", JSON.stringify(providersWithIds));
        dispatch(setProviders(providersWithIds));
      })
      .catch((error) => console.error("Provider fetch error:", error));
  }, [dispatch]);

  useEffect(() => {
    if (providers.length > 0 && !initialLoadComplete.current) {
      initialLoadComplete.current = true;
    }
  }, [providers]);

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
      localStorage.setItem("providers", JSON.stringify(providers));
    }
  }, [providers]);

  const handleDeleteProvider = (providerId) => {
    setProviderToDelete(providerId);
    onDeleteDialogOpen();
  };

  const confirmDelete = () => {
    dispatch(setProviders(providers.filter((p) => p.id !== providerToDelete)));
    onDeleteDialogClose();
    setProviderToDelete(null);
  };

  const handleExportProviders = () => {
    const blob = new Blob([JSON.stringify(providers, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `providers_export_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProviders = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedProviders = JSON.parse(e.target.result);

        if (!Array.isArray(importedProviders)) {
          throw new Error("Invalid format: Expected array of providers");
        }

        const validatedProviders = importedProviders.map((provider) => ({
          id: provider.id || generateUUID(),
          name: String(provider.name || "Unnamed Provider"),
          config: String(provider.config || ""),
        }));

        dispatch(setProviders(validatedProviders));
        setImportStatus("success");
        setImportMessage("Providers imported successfully!");
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

  const handleAddProvider = async () => {
    if (newProviderName && newProviderConfig) {
      const newProvider = {
        id: generateUUID(),
        name: newProviderName,
        config: newProviderConfig,
      };
      dispatch(setProviders([...providers, newProvider]));
      setNewProviderName("");
      setNewProviderConfig("");
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
        <ModalHeader>Provider Management</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Box maxH="60vh" overflowY="auto" pr={2}>
            <ProviderSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showAddProvider={showAddProvider}
              setShowAddProvider={setShowAddProvider}
            />

            {showAddProvider ? (
              <Box pb={4}>
                <Input
                  placeholder="Provider name"
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  mb={3}
                />
                <Textarea
                  placeholder="Provider configuration"
                  value={newProviderConfig}
                  onChange={(e) => setNewProviderConfig(e.target.value)}
                  mb={3}
                />
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={handleAddProvider}
                    isDisabled={!newProviderName || !newProviderConfig}
                    mt={3}
                  >
                    Add Provider
                  </Button>
                </Box>
              </Box>
            ) : null}

            <VStack spacing={4} align="stretch">
              {providers
                ?.filter((provider) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    provider.name.toLowerCase().includes(query) ||
                    provider.config.toLowerCase().includes(query)
                  );
                })
                .map((provider) => (
                  <ProviderItem
                    key={provider.id}
                    provider={provider}
                    searchQuery={searchQuery}
                    isEditing={editingProvider === provider.id}
                    onEdit={(id) => {
                      setEditingProvider(id);
                      setEditName(provider.name);
                      setEditConfig(provider.config);
                    }}
                    onSaveEdit={(id, name, config) => {
                      dispatch(
                        setProviders(
                          providers.map((p) =>
                            p.id === id ? { ...p, name, config } : p
                          )
                        )
                      );
                      setEditingProvider(null);
                    }}
                    onDelete={handleDeleteProvider}
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
              handleExportProviders={handleExportProviders}
              handleImportProviders={handleImportProviders}
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
              Delete Provider
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this provider? This action cannot
              be undone.
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
