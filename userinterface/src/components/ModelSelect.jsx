import { useEffect, useState } from "react";
import { Select } from "@chakra-ui/react";
import { useSelector } from "react-redux";

export default function ModelSelect({ model, setModel, onModelSelect }) {
  const [models, setModels] = useState([]);
  const providers = useSelector((state) => state.provider.providers);

  // models will be fetched from the providers
  useEffect(
    function () {
      const models = providers.flatMap((p) =>
        p.models.map((m) => ({
          name: m,
          providerId: p.id,
          providerName: p.name,
        }))
      );
      setModels(models);

      // sort models by provider name
      models.sort((a, b) => a.providerName.localeCompare(b.providerName));

      if (models.length > 0 && !model) {
        handleModelSelect(models[0]);
      }
    },
    [providers]
  );

  const handleModelSelect = (selectedModel) => {
    setModel(selectedModel.name);
    // Pass both model and provider information to parent
    onModelSelect &&
      onModelSelect({
        modelName: selectedModel.name,
        providerId: selectedModel.providerId,
        providerName: selectedModel.providerName,
      });
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    const modelObj = models.find((m) => m.name === model);
    if (!modelObj) return;
    setModel(modelObj.name);
    handleModelSelect(modelObj);
  };

  return (
    <Select
      value={model}
      size={"sm"}
      variant={"filled"}
      textColor={"orange.500"}
      maxW={"250px"}
      onChange={handleModelChange}
    >
      {models.length > 0 ? (
        models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.providerName}/{m.name}
          </option>
        ))
      ) : (
        <option value="unknown">Add a provider first</option>
      )}
    </Select>
  );
}
