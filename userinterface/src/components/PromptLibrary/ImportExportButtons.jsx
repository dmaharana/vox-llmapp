import { Button, HStack, IconButton, Input, Tooltip } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { PiUploadLight } from "react-icons/pi";
import { DEFAULT_MESSAGES } from "../Constants";

export function ImportExportButtons({
  handleExportPrompts,
  handleImportPrompts,
  fileInputRef,
}) {
  return (
    <HStack spacing={3}>
      <Tooltip label={DEFAULT_MESSAGES.exportPrompts}>
        <IconButton
          icon={<DownloadIcon />}
          onClick={handleExportPrompts}
          variant="outline"
        />
      </Tooltip>

      <Tooltip label={DEFAULT_MESSAGES.importPrompts}>
        <IconButton
          icon={<PiUploadLight />}
          onClick={() => fileInputRef.current.click()}
          variant="outline"
        />
      </Tooltip>

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
