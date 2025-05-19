import React, { useState } from 'react';
import {
  Box,
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
  SimpleGrid,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

const AddProvider = ({ onSave }) => {
  // Sample provider data
  const providers = [
    { name: 'Provider A', endpoint: 'https://api.provider-a.com' },
    { name: 'Provider B', endpoint: 'https://api.provider-b.com' },
    { name: 'Provider C', endpoint: '' },
  ];

  // State management
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    endpoint: '',
    apiKey: '',
  });
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [modelFilter, setModelFilter] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [existingNames, setExistingNames] = useState([]); // Simulated existing names
  const toast = useToast();

  // Handle provider selection
  const handleProviderChange = (e) => {
    const selectedProvider = providers.find((p) => p.name === e.target.value);
    setFormData({
      ...formData,
      provider: e.target.value,
      endpoint: selectedProvider?.endpoint || '',
    });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Simulate fetching models
  const fetchModels = async () => {
    if (!formData.provider) {
      toast({
        title: 'Error',
        description: 'Please select a provider first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoadingModels(true);
    // Simulate API call
    setTimeout(() => {
      const sampleModels = [
        'Model 1',
        'Model 2',
        'Model 3',
        'Advanced Model',
        'Basic Model',
      ];
      setModels(sampleModels);
      setIsLoadingModels(false);
      toast({
        title: 'Success',
        description: 'Models fetched successfully',
        status: 'success',
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
    if (!formData.provider) {
      toast({
        title: 'Error',
        description: 'Provider is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (existingNames.includes(formData.name)) {
      toast({
        title: 'Error',
        description: 'Name must be unique',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Prepare provider data
    const providerData = {
      ...formData,
      models: selectedModels,
    };

    // Call onSave with provider data
    onSave(providerData);

    // Update local existing names
    setExistingNames([...existingNames, formData.name]);

    // Reset form
    setFormData({ provider: '', name: '', endpoint: '', apiKey: '', models: [] });
    setSelectedModels([]);
    setModels([]);
    setModelFilter('');
  };

  return (
    <Box p={6} maxW="600px" mx="auto" bg="white" borderRadius="md" shadow="md">
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          {/* Provider Selection */}
          <FormControl isRequired>
            <FormLabel>Provider</FormLabel>
            <Select
              name="provider"
              value={formData.provider}
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
            {existingNames.includes(formData.name) && (
              <Text color="red.500" fontSize="sm" mt={1}>
                Name already exists
              </Text>
            )}
          </FormControl>

          {/* Service Endpoint */}
          <FormControl>
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
            <Input
              name="apiKey"
              value={formData.apiKey}
              onChange={handleInputChange}
              placeholder="Enter API key"
            />
          </FormControl>

          {/* Models Section */}
          <FormControl>
            <FormLabel>Models</FormLabel>
            <Button
              onClick={fetchModels}
              colorScheme="teal"
              isLoading={isLoadingModels}
              mb={4}
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
                >
                  <SimpleGrid columns={[1, 2]} spacing={2}>
                    {filteredModels.map((model) => (
                      <Checkbox key={model} value={model}>
                        {model}
                      </Checkbox>
                    ))}
                  </SimpleGrid>
                </CheckboxGroup>
                {filteredModels.length === 0 && (
                  <Text color="gray.500">No models match your filter</Text>
                )}
              </>
            )}
          </FormControl>

          {/* Submit Button */}
          <Button type="submit" colorScheme="teal" width="full">
            Save Provider
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default AddProvider;