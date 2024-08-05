import { useEffect, useState } from "react";
import { listModelsApi } from "./Constants";
import { Select } from "@chakra-ui/react";

export default function ModelSelect({ model, setModel }) {
  const [models, setModels] = useState([]);

  useEffect(function () {
    async function fetchModels() {
      const res = await fetch(listModelsApi);
      const body = await res.json();
      if (body["error"]) {
        console.error(body["message"]);
        setModels([]);
        return;
      }

      // console.log(body["message"]);
      setModels(body["data"].models);
      setModel(body["data"].models[0].name);
    }
    fetchModels();
  }, []);

  return (
    <Select
      value={model}
      size={"sm"}
      variant={"filled"}
      textColor={"orange.500"}
      maxW={"250px"}
      onChange={(e) => setModel(e.target.value)}
    >
      {models.length > 0 ? (
        models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name} ({m.details.parameter_size})
          </option>
        ))
      ) : (
        <option value="unknown">Loading...</option>
      )}
    </Select>
  );
}
