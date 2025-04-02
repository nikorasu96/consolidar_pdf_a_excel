// src/components/ExcelFileUpload.tsx
"use client";

import React, { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import useFileUpload from "@/hooks/useFileUpload";

// Función de validación para archivos Excel (.xlsx)
const validateExcelFiles = (files: FileList): boolean => {
  return Array.from(files).every((file) => file.name.toLowerCase().endsWith(".xlsx"));
};

interface ExcelFileUploadProps {
  onFilesChange: (files: FileList | null) => void;
  clearTrigger: boolean;
}

export default function ExcelFileUpload({ onFilesChange, clearTrigger }: ExcelFileUploadProps) {
  const { files, error, handleFileChange, clearFiles } = useFileUpload(validateExcelFiles);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

  useEffect(() => {
    if (clearTrigger && inputRef.current) {
      inputRef.current.value = "";
      clearFiles();
    }
  }, [clearTrigger, clearFiles]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
  };

  // Handlers para Drag & Drop
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
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
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

      {files && (
        <div className="mt-2 d-flex justify-content-center" style={{ maxHeight: "150px", overflowY: "auto" }}>
          <ul className="list-group text-center" style={{ width: "fit-content" }}>
            {Array.from(files).map((file, index) => (
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
