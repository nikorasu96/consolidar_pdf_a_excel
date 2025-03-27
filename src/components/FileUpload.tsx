// src/components/FileUpload.tsx

"use client";

import React, { useState } from "react";
import { isValidPDF } from "../utils/fileUtils";

interface FileUploadProps {
  onFilesChange: (files: FileList | null) => void;
}

export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        if (!isValidPDF(fileArray[i])) {
          setError(
            `El archivo ${fileArray[i].name} no es un PDF válido o excede el tamaño permitido.`
          );
          e.target.value = "";
          setSelectedFiles([]);
          onFilesChange(null);
          return;
        }
      }
      setError(null);
      setSelectedFiles(fileArray);
      onFilesChange(files);
    } else {
      setSelectedFiles([]);
      onFilesChange(null);
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor="pdf-upload" className="form-label">
        Selecciona tus archivos PDF:
      </label>
      <input
        id="pdf-upload"
        type="file"
        name="pdf"
        accept="application/pdf"
        multiple
        className="form-control"
        onChange={handleChange}
      />

      {error && (
        <div className="alert alert-danger mt-2" role="alert">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        // Contenedor con scroll vertical y altura máxima
        <div style={{ maxHeight: "200px", overflowY: "auto" }} className="mt-2">
          <ul className="list-group">
            {selectedFiles.map((file, index) => (
              <li key={index} className="list-group-item">
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
