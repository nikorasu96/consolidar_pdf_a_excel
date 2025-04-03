import React, { useCallback, useState } from "react";
import FileUpload from "./FileUpload";

interface ParentProps {
  onFilesChange?: (files: FileList | null) => void;
  clearTrigger?: boolean;
  disabled?: boolean;
}

export default function Parent({ onFilesChange, clearTrigger = false, disabled = false }: ParentProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleFilesChange = useCallback((files: FileList | null) => {
    setSelectedFiles(files);
    if (onFilesChange) {
      onFilesChange(files);
    }
  }, [onFilesChange]);

  return (
    <div>
      <FileUpload onFilesChange={handleFilesChange} clearTrigger={clearTrigger} disabled={disabled} />
      {selectedFiles && <p>Archivos seleccionados: {selectedFiles.length}</p>}
    </div>
  );
}
