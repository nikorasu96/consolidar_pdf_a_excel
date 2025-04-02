"use client";

import React, { useState, useRef, useEffect, DragEvent } from "react";

interface ExcelFileUploadProps {
  onFilesChange: (files: FileList | null) => void;
  clearTrigger: boolean;
}

export default function ExcelFileUpload({ onFilesChange, clearTrigger }: ExcelFileUploadProps) {
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
        if (!fileArray[i].name.toLowerCase().endsWith(".xlsx")) {
          setError(`El archivo ${fileArray[i].name} no es un archivo Excel válido (.xlsx).`);
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
    handleFiles(e.target.files);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const triggerFileSelect = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border rounded p-4 text-center ${dragActive ? "bg-light" : ""}`}
        style={{ borderStyle: "dashed", cursor: "pointer" }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        <p className="fw-bold mb-1">Arrastra y suelta tu archivo Excel (.xlsx) aquí</p>
        <p className="text-muted small mb-3">(o haz clic para seleccionarlo manualmente)</p>
        <button type="button" className="btn btn-primary" style={{ pointerEvents: "none" }}>
          <i className="bi bi-upload me-2"></i>
          Seleccionar Archivo
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        name="excel"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="d-none"
        onChange={handleChange}
      />

      {error && (
        <div className="alert alert-danger mt-2" role="alert">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-2 d-flex justify-content-center" style={{ maxHeight: "150px", overflowY: "auto" }}>
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
