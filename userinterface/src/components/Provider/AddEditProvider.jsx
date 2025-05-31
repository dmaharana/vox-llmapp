import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  VStack,
  CheckboxGroup,
  Checkbox,
  InputGroup,
  InputRightElement,
  Text,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { useSelector } from "react-redux";
import { fetchModels } from "../../api/providerApi";

function AddEditProvider({
  isOpen,
  onClose,
  onSave,
  isEditing = false,
  providerToEdit,
  existingNames = [],
}) {
  const supportedProviders = useSelector(
    (state) => state.provider.supportedProviders
  );

  // State management
  const [formData, setFormData] = useState({
    provider_name: "",
    name: "",
    endpoint: "",
    api_key: "",
  });
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [modelFilter, setModelFilter] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const toast = useToast();
  const [showApiKey, setShowApiKey] = useState(false);

  const isFormIncomplete =
    formData.name === "" ||
    formData.endpoint === "" ||
    formData.provider_name === "";
  const canSaveProvider = !isFormIncomplete && selectedModels.length > 0;
  const resetModels = () => {
    setModels([]);
    setSelectedModels([]);
    setModelFilter("");
    setIsLoadingModels(false);
  };
  const resetForm = () => {
    setFormData({ provider_name: "", name: "", endpoint: "", api_key: "" });
    resetModels();
  };

  // Pre-populate form for editing
  useEffect(() => {
    if (isEditing && providerToEdit) {
      setFormData({
        provider_name: providerToEdit.provider_name || "",
        name: providerToEdit.name || "",
        endpoint: providerToEdit.endpoint || "",
        api_key: providerToEdit.api_key || "",
      });
      setSelectedModels(providerToEdit.models || []);
      setModels(providerToEdit.models || []);
    } else {
      // Reset form for adding new provider
      resetForm();
    }
  }, [isEditing, providerToEdit]);

  // Handle provider selection
  const handleProviderChange = (e) => {
    const selectedProvider = supportedProviders.find(
      (p) => p.name === e.target.value
    );

    // Set name to provider name if name is empty
    if (isEditing) {
      setFormData({
        ...formData,
        provider_name: selectedProvider?.name,
        endpoint: selectedProvider?.endpoint,
        api_key: "",
      });
    } else {
      setFormData({
        ...formData,
        name: selectedProvider?.name,
        provider_name: selectedProvider?.name,
        endpoint: selectedProvider?.endpoint,
        api_key: "",
      });
    }
    // reset models
    resetModels();
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Simulate fetching models
  const handleFetchModels = async () => {
    if (!formData.provider_name) {
      toast({
        title: "Error",
        description: "Please select a provider first",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const provider = supportedProviders.find(
      (p) => p.name === formData.provider_name
    );
    if (!provider) {
      toast({
        title: "Error",
        description: "Provider not found",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoadingModels(true);
    const models = await fetchModels(
      provider.provider_id,
      formData.endpoint,
      formData.api_key
    );

    if (models.length === 0) {
      toast({
        title: "Error",
        description: "No models found",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsLoadingModels(false);
      return;
    }

    setModels(models);
    setIsLoadingModels(false);

    toast({
      title: "Success",
      description: "Models fetched successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Filter models based on search
  const filteredModels = models.filter((model) =>
    model.toLowerCase().includes(modelFilter.toLowerCase())
  );

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.provider_name) {
      toast({
        title: "Error",
        description: "Provider is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check for unique name, excluding the current provider's name in edit mode
    const otherNames = isEditing
      ? existingNames.filter((name) => name !== providerToEdit?.name)
      : existingNames;
    if (otherNames.includes(formData.name)) {
      toast({
        title: "Error",
        description: "Name must be unique",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Prepare provider data
    const providerData = {
      ...formData,
      models: selectedModels,
      id: isEditing ? providerToEdit.id : undefined, // Include ID for editing
    };

    // Call onSave with provider data and isEditing flag
    onSave(providerData, isEditing);

    // Reset form and close drawer
    resetForm();
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="md"
      closeOnInteractOutside={false}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {isEditing ? "Edit Provider" : "Add New Provider"}
        </DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              {/* Provider Selection */}
              <FormControl isRequired>
                <FormLabel>Provider</FormLabel>
                <Select
                  name="provider_name"
                  value={formData.provider_name}
                  onChange={handleProviderChange}
                  placeholder="Select provider"
                >
                  {supportedProviders.map((provider) => (
                    <option key={provider.name} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Name Input */}
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter unique name"
                />
                {isEditing && formData.name === providerToEdit?.name ? (
                  <Text color="green.500" fontSize="sm" mt={1}>
                    Valid name
                  </Text>
                ) : (
                  existingNames.includes(formData.name) && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      Name already exists
                    </Text>
                  )
                )}
              </FormControl>

              {/* Service Endpoint */}
              <FormControl isRequired>
                <FormLabel>Service Endpoint</FormLabel>
                <Input
                  name="endpoint"
                  value={formData.endpoint}
                  onChange={handleInputChange}
                  placeholder="Enter service endpoint"
                />
              </FormControl>

              {/* API Key */}
              <FormControl>
                <FormLabel>API Key</FormLabel>
                <InputGroup size="md">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    placeholder="Enter API key"
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {/* Models Section */}
              <FormControl isRequired>
                <FormLabel>Models</FormLabel>
                <Button
                  onClick={() => handleFetchModels()}
                  colorScheme="teal"
                  isLoading={isLoadingModels}
                  mb={4}
                  isDisabled={isFormIncomplete}
                >
                  Fetch Models
                </Button>

                {models.length > 0 && (
                  <>
                    {/* Model Filter */}
                    <InputGroup mb={4}>
                      <Input
                        placeholder="Filter models..."
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                      />
                      <InputRightElement>
                        <SearchIcon />
                      </InputRightElement>
                    </InputGroup>

                    {/* Model Selection */}
                    <CheckboxGroup
                      value={selectedModels}
                      onChange={setSelectedModels}
                      alignItems="flex-start"
                      pl={4}
                    >
                      <VStack spacing={2} align="flex-start">
                        {filteredModels.map((model) => (
                          <Checkbox key={model} value={model} id={model}>
                            {model}
                          </Checkbox>
                        ))}
                      </VStack>
                    </CheckboxGroup>
                    {filteredModels.length === 0 && (
                      <Text color="gray.500">No models match your filter</Text>
                    )}
                  </>
                )}
              </FormControl>
            </VStack>
          </form>
        </DrawerBody>

        <DrawerFooter>
          {/* Action Buttons */}
          <HStack width="full" justify="space-between" mb={4}>
            <Button
              colorScheme="blue"
              width="48%"
              isDisabled={!canSaveProvider}
              onClick={handleSubmit}
            >
              {isEditing ? "Update" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              width="48%"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default AddEditProvider;
