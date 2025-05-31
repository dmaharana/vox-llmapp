import axios from 'axios';

export const fetchSupportedProviders = async () => {
  try {
    const response = await axios.get('/api/supported-providers');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching supported providers:', error);
    throw error;
  }
};

export const fetchProviders = async () => {
  try {
    const response = await axios.get('/api/providers');
    const { providers = [], defaultProvider = null } = response.data.data;
    return {
      providers,
      defaultProvider
    };
  } catch (error) {
    console.error('Error fetching providers:', error);
    return {
      providers: [],
      defaultProvider: null
    };
  }
};

// get models, query params: provider & provider_url & api_key in custom header "X-Api-Key"
export const fetchModels = async (provider, provider_url, api_key) => {
  try {
    const response = await axios.get('/api/models', {
      params: {
        provider,
        provider_url,
      },
      headers: {
        'X-Api-Key': api_key
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};
