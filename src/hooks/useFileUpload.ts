// src/hooks/useFileUpload.ts
import { useState, useCallback } from "react";

export default function useFileUpload(validateFiles?: (files: FileList) => boolean) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) {
        setFiles(null);
        setError(null);
        return;
      }
      if (validateFiles && !validateFiles(newFiles)) {
        setError("Uno o más archivos no son válidos.");
        setFiles(null);
        return;
      }
      setFiles(newFiles);
      setError(null);
    },
    [validateFiles]
  );

  const clearFiles = useCallback(() => {
    setFiles(null);
    setError(null);
  }, []);

  return { files, error, handleFileChange, clearFiles };
}
