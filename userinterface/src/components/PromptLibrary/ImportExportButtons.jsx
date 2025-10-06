import { HStack, IconButton, Input, Tooltip } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { PiUploadLight } from "react-icons/pi";
import { DEFAULT_MESSAGES } from "../Constants";

export function ImportExportButtons({
  exportLabel,
  importLabel,
  handleExport,
  handleImport,
  fileInputRef,
  enableDownload,
}) {
  return (
    <HStack spacing={3}>
      <Tooltip label={exportLabel}>
        <IconButton
          icon={<DownloadIcon />}
          onClick={() => handleExport()}
          variant="outline"
          isDisabled={!enableDownload}
        />
      </Tooltip>

      <Tooltip label={importLabel}>
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
            handleImport(e.target.files[0]);
            e.target.value = null;
          }
        }}
        accept=".json"
      />
    </HStack>
  );
}
