// src/app/page.tsx
"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import { validatePDFFiles } from "../utils/fileUtils";
import { saveAs } from "file-saver";
import readXlsxFile from "read-excel-file";
import logger from "../utils/logger"; // Importamos el logger

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("consolidado.xlsx");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    setFiles(files);
    // Reinicia la vista previa al cambiar los archivos
    setPreviewData(null);
    setExcelBlob(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    if (!validatePDFFiles(files)) {
      alert("Uno o más archivos no son válidos.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("pdf", file);
    });

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Error procesando los archivos");
        setLoading(false);
        return;
      }

      // Extracción robusta del nombre de archivo desde el header
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      let extractedFileName = "consolidado.xlsx";
      const matchUTF8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const matchSimple = contentDisposition.match(/filename="([^"]+)"/i);
      if (matchUTF8 && matchUTF8[1]) {
        extractedFileName = decodeURIComponent(matchUTF8[1]);
      } else if (matchSimple && matchSimple[1]) {
        extractedFileName = matchSimple[1];
      }
      setFileName(extractedFileName);

      // Obtiene el blob del Excel
      const blob = await res.blob();
      setExcelBlob(blob);

      // Utiliza readXlsxFile para parsear el blob y obtener los datos en formato de array
      const rows = await readXlsxFile(blob);
      setPreviewData(rows);
    } catch (error) {
      logger.error("Error:", error);
      alert("Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (excelBlob) {
      saveAs(excelBlob, fileName);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="text-center mb-4">Consolidar PDFs a Excel</h1>
          <form onSubmit={handleSubmit}>
            <FileUpload onFilesChange={handleFileChange} />
            <div className="d-grid gap-2 mt-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Procesando..." : "Convertir"}
              </button>
            </div>
          </form>
          {previewData && (
            <div className="mt-5">
              <h2 className="mb-3">Vista Previa del Excel</h2>
              <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      {previewData[0] &&
                        previewData[0].map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <button className="btn btn-outline-secondary" onClick={() => setIsExpanded(true)}>
                  Expandir Vista
                </button>
                <button className="btn btn-success" onClick={handleDownload}>
                  Descargar Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de vista expandida */}
      {isExpanded && previewData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 10000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="bg-white p-4"
            style={{
              width: "90%",
              height: "90%",
              overflow: "auto",
              position: "relative",
            }}
          >
            <button
              className="btn btn-danger position-absolute"
              style={{ top: 10, right: 10 }}
              onClick={() => setIsExpanded(false)}
            >
              Cerrar Vista
            </button>
            <h2 className="mb-3">Vista Expandida del Excel</h2>
            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead>
                  <tr>
                    {previewData[0] &&
                      previewData[0].map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
