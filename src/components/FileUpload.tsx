"use client";

import React, { useRef, useEffect, useCallback, ChangeEvent, DragEvent, useState } from "react";
import useFileUpload from "@/hooks/useFileUpload";

interface FileUploadProps {
  onFilesChange: (files: FileList | null) => void;
  clearTrigger: boolean;
  disabled?: boolean;
}

export default function FileUpload({ onFilesChange, clearTrigger, disabled = false }: FileUploadProps) {
  // Puedes pasarle una función de validación si la necesitas; aquí dejamos sin validación personalizada
  const { files, error, handleFileChange, clearFiles } = useFileUpload();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevFilesRef = useRef<FileList | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Callback para manejar el cambio del input
  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
  }, [handleFileChange]);

  // Notifica al padre solo cuando 'files' realmente cambie
  useEffect(() => {
    if (files !== prevFilesRef.current) {
      onFilesChange(files);
      prevFilesRef.current = files;
    }
  }, [files, onFilesChange]);

  // Limpia el input cuando clearTrigger es true
  useEffect(() => {
    if (clearTrigger && inputRef.current) {
      inputRef.current.value = "";
      clearFiles();
    }
  }, [clearTrigger, clearFiles]);

  // Handlers para Drag & Drop
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const triggerFileSelect = () => {
    if (disabled) return;
    inputRef.current?.click();
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
        onChange={onChange}
        disabled={disabled}
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
