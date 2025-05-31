import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setProviders,
  getSupportedProviders,
  getProviders,
} from "../store/providerSlice";
import ShowAlert from "./ShowAlert";
import {
  Box,
  HStack,
  useDisclosure,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  IconButton,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { ProviderSearch } from "./Provider/ProviderSearch";
import { ImportExportButtons } from "./PromptLibrary/ImportExportButtons";
import AddEditProvider from "./Provider/AddEditProvider";
import generateUUID from "./scripts/utils";
import { DEFAULT_MESSAGES } from "./Constants";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";

export default function ProviderManagement() {
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onClose: onDeleteDialogClose,
  } = useDisclosure();
  const dispatch = useDispatch();
  const providers = useSelector((state) => state.provider.providers);

  useEffect(() => {
    dispatch(getSupportedProviders());
  }, [dispatch]);

  const cancelRef = useRef();
  const fileInputRef = useRef();
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const initialLoadComplete = useRef(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  // const [showImportAlert, setShowImportAlert] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertStatus, setAlertStatus] = useState(null);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const showProviders = providers.length > 0;

  useEffect(() => {
    const savedProviders = localStorage.getItem("providers");
    if (savedProviders) {
      try {
        const parsedProviders = JSON.parse(savedProviders);
        if (parsedProviders.length > 0) {
          dispatch(setProviders(parsedProviders));
          return;
        }
      } catch (error) {
        localStorage.removeItem("providers");
        setAlertStatus("error");
        setAlertTitle("Failed to load providers");
        setAlertMessage("Failed to parse saved providers");
        setShowAlert(true);
      }
    }

    dispatch(getProviders())
      .unwrap()
      .then(({ providers, defaultProvider }) => {
        let providersToStore = providers;

        if (defaultProvider && (!providers || providers.length === 0)) {
          providersToStore = [defaultProvider];
        }

        const providersWithIds = providersToStore.map((provider) => ({
          id: provider.id || generateUUID(),
          name: String(provider.name || "Unnamed Provider"),
          provider_name: String(provider.provider_name || ""),
          endpoint: String(provider.endpoint || ""),
          api_key: String(provider.api_key || ""),
          models: provider.models || [],
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
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

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
    if (providers.length === 0) {
      setShowAlert(true);
      setAlertMessage("No providers to export");
      setAlertStatus("error");

      return;
    }
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
    
    setShowAlert(true);
    setAlertMessage("Providers exported successfully");
    setAlertStatus("success");
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
          provider_name: String(provider.provider_name || ""),
          endpoint: String(provider.endpoint || ""),
          api_key: String(provider.api_key || ""),
          models: provider.models || [],
        }));

        dispatch(setProviders(validatedProviders));
        setAlertStatus("success");
        setAlertMessage("Providers imported successfully!");
        setShowAlert(true);
      } catch (error) {
        console.error("Import error:", error);
        setAlertStatus("error");
        setAlertMessage("Failed to import: Invalid file format");
        setShowAlert(true);
      }
    };
    reader.readAsText(file);
  };

  const handleAddProvider = (providerData, isEditing) => {
    if (isEditing) {
      // Update existing provider
      dispatch(
        setProviders(
          providers.map((p) =>
            p.id === providerData.id
              ? {
                  id: p.id,
                  name: providerData.name,
                  provider_name: providerData.provider_name,
                  endpoint: providerData.endpoint,
                  api_key: providerData.api_key,
                  models: providerData.models,
                }
              : p,
          ),
        ),
      );
    } else {
      // Add new provider
      const newProvider = {
        id: generateUUID(),
        name: providerData.name,
        provider_name: providerData.provider_name,
        endpoint: providerData.endpoint,
        api_key: providerData.api_key,
        models: providerData.models,
      };
      dispatch(setProviders([...providers, newProvider]));
    }
    setShowAddProvider(false); // Close the drawer
    setEditingProvider(null); // Clear editing state
  };

  const handleEditProvider = (providerId) => {
    const provider = providers.find((p) => p.id === providerId);
    setEditingProvider(provider);
    setShowAddProvider(true);
  };

  const content = (
    <Box maxH={"50vh"} overflowY="auto" pr={2}>
      <ProviderSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showAddProvider={showAddProvider}
        setShowAddProvider={setShowAddProvider}
        editingProvider={editingProvider}
      />

      {showProviders ? (
        <Table variant="simple" size="sm" layout="fixed" maxH="50vh" overflowY="auto" striped="dark">
          <Thead>
            <Tr>
              <Th width="20%">Name</Th>
              <Th width="20%">Provider</Th>
              <Th width="50%">Endpoint</Th>
              <Th width="20%" textAlign="right">Actions</Th>
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
                  <Td
                    overflowX="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {provider.endpoint}
                  </Td>
                  <Td>
                    <HStack spacing={1} justify="flex-end">
                      <Tooltip label={DEFAULT_MESSAGES.editProviderMessage}>
                        <IconButton
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleEditProvider(provider.id)}
                          icon={<EditIcon />}
                        />
                      </Tooltip>
                      <Tooltip label={DEFAULT_MESSAGES.deleteProviderMessage}>
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDeleteProvider(provider.id)}
                          icon={<DeleteIcon />}
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
          </Tbody>
        </Table>
      ) : (
        <Text textAlign="center" mt={10} fontSize="lg" color="gray.500">
          {DEFAULT_MESSAGES.addProviderMessage}
        </Text>
      )}
    </Box>
  );

  
  return (
    <VStack spacing={6} align="stretch">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Provider Management</Text> 
      {content}
        {
          showAlert && (
            <ShowAlert
              status={alertStatus}
              title={alertTitle}
              message={alertMessage}
              resetStates={() => setShowAlert(false)}
            />
          )
        }
        <Box mt={4}>
          <HStack spacing={3} justify="flex-end">
            <ImportExportButtons
              exportLabel={DEFAULT_MESSAGES.exportProviders}
              importLabel={DEFAULT_MESSAGES.importProviders}
              handleExport={handleExportProviders}
              handleImport={handleImportProviders}
              fileInputRef={fileInputRef}
              enableDownload={providers.length > 0}
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
                Delete Provider
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to delete this provider? This action
                cannot be undone.
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

        <AddEditProvider
          isOpen={showAddProvider}
          onClose={() => {
            setShowAddProvider(false);
            setEditingProvider(null);
          }}
          onSave={handleAddProvider}
          isEditing={editingProvider}
          providerToEdit={editingProvider}
          existingNames={providers.map((p) => p.name)}
        />
      </VStack>
    );
}
