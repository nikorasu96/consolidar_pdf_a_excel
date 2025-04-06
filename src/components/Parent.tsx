import React, { useCallback } from "react";
import FileUpload from "./FileUpload";

interface ParentProps {
  onFilesChange?: (files: FileList | null) => void;
  clearTrigger?: boolean;
  disabled?: boolean;
}

export default function Parent({ onFilesChange, clearTrigger = false, disabled = false }: ParentProps) {
  const handleFilesChange = useCallback((files: FileList | null) => {
    if (onFilesChange) {
      onFilesChange(files);
    }
  }, [onFilesChange]);

  return (
    <div>
      <FileUpload onFilesChange={handleFilesChange} clearTrigger={clearTrigger} disabled={disabled} />
    </div>
  );
}
