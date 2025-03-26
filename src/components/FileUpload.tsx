// src/components/FileUpload.tsx

"use client"; // Indica que este componente se renderiza en el lado del cliente.

import React, { useState } from "react";
import { isValidPDF } from "../utils/fileUtils";

interface FileUploadProps {
  // Función callback que se llama cuando cambia la selección de archivos.
  onFilesChange: (files: FileList | null) => void;
}

/**
 * Componente para la carga de archivos PDF.
 * Permite seleccionar múltiples archivos, valida cada uno y muestra un mensaje de error en caso de fallo.
 */
export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  // Función que se ejecuta al cambiar la selección de archivos.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Recorre cada archivo y valida si es un PDF válido.
      for (let i = 0; i < files.length; i++) {
        if (!isValidPDF(files[i])) {
          // En caso de error, se muestra un mensaje y se limpia la selección.
          setError(`El archivo ${files[i].name} no es un PDF válido o excede el tamaño permitido.`);

          e.target.value = "";
          onFilesChange(null);
          return;
        }
      }
      setError(null);
    }
    onFilesChange(files);
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
    </div>
  );
}
