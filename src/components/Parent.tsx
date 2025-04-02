// src/components/Parent.tsx
import React, { useCallback, useState } from "react";
import FileUpload from "./FileUpload";

export default function Parent() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Memoizamos la función para evitar cambios de referencia en cada render
  const handleFilesChange = useCallback((files: FileList | null) => {
    setSelectedFiles(files);
  }, []);

  return (
    <div>
      <h1>Sube tus archivos</h1>
      <FileUpload onFilesChange={handleFilesChange} clearTrigger={false} disabled={false} />
      {selectedFiles && <p>Archivos seleccionados: {selectedFiles.length}</p>}
    </div>
  );
}
