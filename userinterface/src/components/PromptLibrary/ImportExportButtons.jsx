import { Button, HStack, Input } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { PiUploadLight } from "react-icons/pi";

export function ImportExportButtons({
  handleExportPrompts,
  handleImportPrompts,
  fileInputRef
}) {
  return (
    <HStack spacing={3}>
      <Button
        leftIcon={<DownloadIcon />}
        onClick={handleExportPrompts}
        variant="outline"
        title="Export all prompts as JSON"
      >
        Export
      </Button>
      <Button
        leftIcon={<PiUploadLight />}
        onClick={() => fileInputRef.current.click()}
        variant="outline"
        title="Import prompts from JSON file"
      >
        Import
      </Button>
      <Input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files[0]) {
            handleImportPrompts(e.target.files[0]);
            e.target.value = null;
          }
        }}
        accept=".json"
      />
    </HStack>
  );
}
