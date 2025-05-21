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

function AddProvider({
  isOpen,
  onClose,
  onSave,
  isEditing = false,
  providerToEdit,
  existingNames = [],
}) {
  // Sample provider data
  const providers = [
    { name: "Ollama", endpoint: "http://localhost:11434" },
    { name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1" },
    { name: "Groq", endpoint: "https://api.groq.com/openai/api/v1" },
    {
      name: "Gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    },
    { name: "Open AI Complaint", endpoint: "" },
    { name: "Provider A", endpoint: "https://api.provider-a.com" },
    { name: "Provider B", endpoint: "https://api.provider-b.com" },
  ];

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
      setModels(providerToEdit.models || []); // Pre-populate models
    } else {
      // Reset form for adding new provider
      setFormData({ provider_name: "", name: "", endpoint: "", api_key: "" });
      setSelectedModels([]);
      setModels([]);
      setModelFilter("");
    }
  }, [isEditing, providerToEdit]);

  // Handle provider selection
  const handleProviderChange = (e) => {
    const selectedProvider = providers.find((p) => p.name === e.target.value);
    
      setFormData({
        ...formData,
        name: selectedProvider?.name,
        provider_name: selectedProvider?.name,
        endpoint: selectedProvider?.endpoint,
      });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Simulate fetching models
  const fetchModels = async () => {
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

    setIsLoadingModels(true);
    // Simulate API call
    setTimeout(() => {
      const sampleModels = [
        "Model 1",
        "Model 2",
        "Model 3",
        "Advanced Model",
        "Basic Model",
      ];
      setModels(sampleModels);
      setIsLoadingModels(false);
      toast({
        title: "Success",
        description: "Models fetched successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }, 1000);
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
    setFormData({ provider_name: "", name: "", endpoint: "", api_key: "" });
    setSelectedModels([]);
    setModels([]);
    setModelFilter("");
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({ provider_name: "", name: "", endpoint: "", api_key: "" });
    setSelectedModels([]);
    setModels([]);
    setModelFilter("");
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
                  {providers.map((provider) => (
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
                  onClick={fetchModels}
                  colorScheme="teal"
                  isLoading={isLoadingModels}
                  mb={4}
                  isDisabled={
                    formData.name === "" ||
                    formData.endpoint === "" ||
                    formData.provider_name === "" ||
                    isLoadingModels
                  }
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
              isDisabled={
                formData.name === "" ||
                formData.endpoint === "" ||
                formData.provider_name === "" ||
                isLoadingModels ||
                selectedModels.length === 0
              }
              onClick={handleSubmit}
            >
              {isEditing ? "Update Provider" : "Save Provider"}
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

export default AddProvider;
