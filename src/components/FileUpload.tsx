// components/FileUpload.tsx
"use client";

import React, { useState, useRef, useEffect, DragEvent } from "react";
import { isValidPDF } from "../utils/fileUtils";

interface FileUploadProps {
  onFilesChange: (files: FileList | null) => void;
  clearTrigger: boolean;
  disabled?: boolean; // Nueva prop
}

export default function FileUpload({ onFilesChange, clearTrigger, disabled = false }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (clearTrigger && inputRef.current) {
      inputRef.current.value = "";
      setSelectedFiles([]);
      setError(null);
      onFilesChange(null);
    }
  }, [clearTrigger, onFilesChange]);

  const handleFiles = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        if (!isValidPDF(fileArray[i])) {
          setError(`El archivo ${fileArray[i].name} no es un PDF válido o excede el tamaño permitido.`);
          if (inputRef.current) inputRef.current.value = "";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(disabled) return;
    handleFiles(e.target.files);
  };

  // Manejo de eventos Drag & Drop
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    if(disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if(disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const triggerFileSelect = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border rounded p-4 text-center ${dragActive ? "bg-light" : ""} ${disabled ? "opacity-50" : ""}`}
        style={{ borderStyle: "dashed", cursor: disabled ? "not-allowed" : "pointer" }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        <p className="fw-bold mb-1">Arrastra y suelta tus archivos PDF aquí</p>
        <p className="text-muted small mb-3">(o haz clic para seleccionarlos manualmente)</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ pointerEvents: "none" }}
        >
          <i className="bi bi-upload me-2"></i>
          Seleccionar Archivos
        </button>
      </div>

      <input
        id="pdf-upload"
        ref={inputRef}
        type="file"
        name="pdf"
        accept="application/pdf"
        multiple
        className="d-none"
        onChange={handleChange}
        disabled={disabled}  // Deshabilita el input si corresponde
      />

      {error && (
        <div className="alert alert-danger mt-2" role="alert">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div
          className="mt-2 d-flex justify-content-center"
          style={{ maxHeight: "150px", overflowY: "auto" }}
        >
          <ul className="list-group text-center" style={{ width: "fit-content" }}>
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
