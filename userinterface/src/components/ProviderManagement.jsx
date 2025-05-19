import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setProviders } from "../store/providerSlice";
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import { ProviderSearch } from "./Provider/ProviderSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";
import { ProviderItem } from "./Provider/ProviderItem";
import AddProvider from "./Provider/AddProvider"; // Import the AddProvider component
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editName, setEditName] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const [editProvider, setEditProvider] = useState(null);
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

  const handleAddProvider = (providerData) => {
    const newProvider = {
      id: generateUUID(),
      provider_name: providerData.provider,
      name: providerData.name,
      endpoint: providerData.endpoint,
      api_key: providerData.apiKey,
      models: providerData.models,
    };
    dispatch(setProviders([...providers, newProvider]));
    setShowAddProvider(false); // Close the add provider form
  };

  const handleEditProvider = (providerId) => {
    const provider = providers.find((p) => p.id === providerId);
    setEditProvider(provider);
    setShowAddProvider(true);
    setEditName(provider.name);
    setEditConfig(provider.api_key);
  };

  console.log("providers", providers);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      scrollBehavior="inside"
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent maxW="container.md">
        <ModalHeader>Provider Management</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Box maxH="80vh" overflowY="auto" pr={2}>
            <ProviderSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showAddProvider={showAddProvider}
              setShowAddProvider={setShowAddProvider}
            />

            {showAddProvider ? (
              <Box pb={4}>
                <AddProvider
                  onSave={handleAddProvider}
                  onCancel={() => setShowAddProvider(false)}
                  editProvider={editProvider}
                  editName={editName}
                  editConfig={editConfig}
                />
              </Box>
            ) : null}

            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Provider</Th>
                  <Th>Endpoint</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {providers
                  ?.filter((provider) => {
                    const query = searchQuery.toLowerCase();
                    return (
                      provider.name.toLowerCase().includes(query) ||
                      provider.provider_name.toLowerCase().includes(query)
                    );
                  })
                  .map((provider) => (
                    <Tr key={provider.id}>
                      <Td>{provider.name}</Td>
                      <Td>{provider.provider_name}</Td>
                      <Td>{provider.endpoint}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleEditProvider(provider.id);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            Delete
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
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