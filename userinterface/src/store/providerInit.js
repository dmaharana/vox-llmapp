import { setProviders, getProviders } from "./providerSlice";
import generateUUID from "../components/scripts/utils";

export const initializeProviders = async (store) => {
  // First try to load from localStorage
  const savedProviders = localStorage.getItem("providers");
  if (savedProviders) {
    try {
      const parsedProviders = JSON.parse(savedProviders);
      if (parsedProviders.length > 0) {
        store.dispatch(setProviders(parsedProviders));
        return;
      }
    } catch (error) {
      console.error("Failed to parse saved providers:", error);
      localStorage.removeItem("providers");
    }
  }

  // If no valid providers in localStorage, fetch from API
  try {
    const result = await store.dispatch(getProviders()).unwrap();
    const { providers, defaultProvider } = result;
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
      enabled: provider.enabled !== false,
    }));

    localStorage.setItem("providers", JSON.stringify(providersWithIds));
    store.dispatch(setProviders(providersWithIds));
  } catch (error) {
    console.error("Failed to initialize providers:", error);
  }
}; 