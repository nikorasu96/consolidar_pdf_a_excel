"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import { validatePDFFiles } from "../utils/fileUtils";
import { saveAs } from "file-saver";
import readXlsxFile from "read-excel-file";
import logger from "../utils/logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("consolidado.xlsx");
  const [isExpanded, setIsExpanded] = useState(false);

  const [totalProcesados, setTotalProcesados] = useState(0);
  const [totalExitosos, setTotalExitosos] = useState(0);
  const [totalFallidos, setTotalFallidos] = useState(0);
  const [groupedExitosos, setGroupedExitosos] = useState<
    Array<{ fileName: string; count: number }>
  >([]);
  const [groupedFallidos, setGroupedFallidos] = useState<
    Array<{ fileName: string; count: number; error: string }>
  >([]);
  const [formatMessage, setFormatMessage] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Usamos PDFFormat como tipo para el formato seleccionado
  const [pdfFormat, setPdfFormat] = useState<PDFFormat>("CERTIFICADO_DE_HOMOLOGACION");

  const [clearFileInput, setClearFileInput] = useState(false);

  const resetResults = () => {
    setPreviewData(null);
    setExcelBlob(null);
    setFileName("consolidado.xlsx");
    setTotalProcesados(0);
    setTotalExitosos(0);
    setTotalFallidos(0);
    setGroupedExitosos([]);
    setGroupedFallidos([]);
    setFormatMessage("");
    setApiError(null);
    setIsExpanded(false);
  };

  const handleFileChange = (files: FileList | null) => {
    setFiles(files);
    resetResults();
  };

  const handleFormatChange = (format: PDFFormat) => {
    setPdfFormat(format);
    resetResults();
  };

  const handleLimpiar = () => {
    setClearFileInput(true);
    setTimeout(() => setClearFileInput(false), 0);
    setFiles(null);
    resetResults();
    setPdfFormat("CERTIFICADO_DE_HOMOLOGACION");
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
    formData.append("pdfFormat", pdfFormat);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        setLoading(false);
        return;
      }

      if (data.error) {
        setApiError(data.error);
      }

      setTotalProcesados(data.totalProcesados);
      setTotalExitosos(data.totalExitosos);
      setTotalFallidos(data.totalFallidos);
      setGroupedExitosos(data.exitosos);
      setGroupedFallidos(data.fallidos);
      setFormatMessage(data.message);

      if (data.excel) {
        const byteCharacters = atob(data.excel);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        setExcelBlob(blob);
        setFileName(decodeURIComponent(data.fileName));

        const rows = await readXlsxFile(blob);
        setPreviewData(rows);
      } else {
        setExcelBlob(null);
        setPreviewData(null);
      }
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
            <FileUpload onFilesChange={handleFileChange} clearTrigger={clearFileInput} />
            <div className="mb-3">
              <label className="form-label">Selecciona el formato de PDF:</label>
              <div className="btn-group">
                <button
                  type="button"
                  className={pdfFormat === "CERTIFICADO_DE_HOMOLOGACION" ? "btn btn-primary" : "btn btn-outline-primary"}
                  onClick={() => handleFormatChange("CERTIFICADO_DE_HOMOLOGACION")}
                >
                  CERTIFICADO DE HOMOLOGACIÓN
                </button>
                <button
                  type="button"
                  className={pdfFormat === "CRT" ? "btn btn-primary" : "btn btn-outline-primary"}
                  onClick={() => handleFormatChange("CRT")}
                >
                  Certificado de Revisión Técnica (CRT)
                </button>
                <button
                  type="button"
                  className={pdfFormat === "SOAP" ? "btn btn-primary" : "btn btn-outline-primary"}
                  onClick={() => handleFormatChange("SOAP")}
                >
                  SOAP (Seguro Obligatorio)
                </button>
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Procesando..." : "Convertir"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleLimpiar} disabled={loading}>
                Limpiar
              </button>
            </div>
          </form>

          {apiError && (
            <div className="mt-4 alert alert-warning">{apiError}</div>
          )}

          {formatMessage && (
            <div className="mt-4 alert alert-info">{formatMessage}</div>
          )}

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

          <div className="mt-4">
            <h3>Resumen de Procesamiento</h3>
            <p>Total Procesados: {totalProcesados}</p>
            <p>Total Exitosos: {totalExitosos}</p>
            <p>Total Fallidos: {totalFallidos}</p>
          </div>

          {groupedExitosos.length > 0 && (
            <div className="mt-4">
              <h4>Archivos Convertidos (Exitosos)</h4>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                <ul className="list-group">
                  {groupedExitosos.map((item, index) => (
                    <li key={index} className="list-group-item">
                      {item.fileName} {item.count > 1 && `(x${item.count})`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {groupedFallidos.length > 0 && (
            <div className="mt-4">
              <h4>Archivos Fallidos</h4>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                <ul className="list-group">
                  {groupedFallidos.map((item, index) => (
                    <li key={index} className="list-group-item">
                      {item.fileName} {item.count > 1 && `(x${item.count})`} - {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

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
