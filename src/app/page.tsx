"use client";

import Link from "next/link";
import { useState } from "react";
import FileUpload from "../components/FileUpload";
import InstructionsModal from "../components/InstructionsModal";
import { validatePDFFiles } from "../utils/pdf/fileUtils";
import { saveAs } from "file-saver";
import readXlsxFile from "read-excel-file";
import logger from "../utils/logger";
import type { PDFFormat } from "@/types/pdfFormat";

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
}

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
  const [exitosos, setExitosos] = useState<
    Array<{ fileName: string; datos: Record<string, string>; titulo?: string }>
  >([]);
  const [fallidos, setFallidos] = useState<Array<{ fileName: string; error: string }>>([]);
  const [formatMessage, setFormatMessage] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [progressCount, setProgressCount] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [pdfFormat, setPdfFormat] = useState<PDFFormat | null>(null);
  const [clearFileInput, setClearFileInput] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const resetResults = () => {
    setPreviewData(null);
    setExcelBlob(null);
    setFileName("consolidado.xlsx");
    setTotalProcesados(0);
    setTotalExitosos(0);
    setTotalFallidos(0);
    setExitosos([]);
    setFallidos([]);
    setFormatMessage("");
    setApiError(null);
    setIsExpanded(false);
    setDuration(null);
    setProgressCount(0);
    setEstimatedSeconds(0);
  };

  const handleFileChange = (fileList: FileList | null) => {
    setFiles(fileList);
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
    setPdfFormat(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      alert("No se han seleccionado archivos.");
      return;
    }
    if (!pdfFormat) {
      alert("Por favor, selecciona un formato antes de convertir.");
      return;
    }
    if (!validatePDFFiles(files)) {
      alert("Uno o más archivos no son válidos.");
      return;
    }
    setLoading(true);
    setApiError(null);
    const startTime = Date.now();

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("pdf", file);
    });
    formData.append("pdfFormat", pdfFormat);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      if (!response.ok || !response.body) {
        throw new Error("Error en la respuesta del servidor");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        const events = partial.split("\n\n");
        partial = events.pop() || "";
        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.trim().split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const jsonString = line.replace(/^data:\s?/, "");
              if (!jsonString.trim()) continue;
              const data = JSON.parse(jsonString);

              if (data.progress !== undefined && data.total !== undefined) {
                setProgressCount(data.progress);
                if (data.successes !== undefined) setTotalExitosos(data.successes);
                if (data.failures !== undefined) setTotalFallidos(data.failures);
                setEstimatedSeconds(Math.round(data.estimatedMsLeft / 1000));
              }

              if (data.final) {
                if (data.final.error) {
                  setApiError(data.final.error);
                }
                setTotalProcesados(data.final.totalProcesados);
                setTotalExitosos(data.final.totalExitosos);
                setTotalFallidos(data.final.totalFallidos);
                setFormatMessage(data.final.message || "");
                if (data.final.exitosos) {
                  setExitosos(data.final.exitosos);
                }
                if (data.final.fallidos) {
                  setFallidos(data.final.fallidos);
                }
                if (data.final.excel) {
                  const byteCharacters = atob(data.final.excel);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  });
                  setExcelBlob(blob);
                  setFileName(decodeURIComponent(data.final.fileName));
                  const rows = await readXlsxFile(blob);
                  setPreviewData(rows);
                } else {
                  setExcelBlob(null);
                  setPreviewData(null);
                }
                reader.cancel();
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error:", error);
      alert("Ocurrió un error");
    } finally {
      setLoading(false);
      const endTime = Date.now();
      setDuration((endTime - startTime) / 1000);
    }
  };

  return (
    <div className="container my-5">
      {showInstructions && (
        <InstructionsModal onClose={() => setShowInstructions(false)} />
      )}

      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white text-center py-3">
              <h2 className="mb-0">Conversor de PDFs a Excel</h2>
            </div>
            <div className="card-body">
              {apiError && (
                <div className="alert alert-warning text-center">{apiError}</div>
              )}
              {formatMessage && (
                <div className="alert alert-info text-center">{formatMessage}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <FileUpload onFilesChange={handleFileChange} clearTrigger={clearFileInput} disabled={loading} />
                </div>

                {files && files.length > 0 && (
                  <div className="mb-3 text-center">
                    <span className="badge bg-info text-dark fs-5">
                      Archivos seleccionados: {files.length}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-bold">Selecciona el formato de PDF:</label>
                  <div className="btn-group d-flex flex-wrap">
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "CERTIFICADO_DE_HOMOLOGACION" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                      onClick={() => handleFormatChange("CERTIFICADO_DE_HOMOLOGACION")}
                      disabled={loading}
                    >
                      Certificado de Homologación
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "CRT" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                      onClick={() => handleFormatChange("CRT")}
                      disabled={loading}
                    >
                      Certificado de Revisión Técnica (CRT)
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "SOAP" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                      onClick={() => handleFormatChange("SOAP")}
                      disabled={loading}
                    >
                      SOAP (Seguro Obligatorio)
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "PERMISO_CIRCULACION" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                      onClick={() => handleFormatChange("PERMISO_CIRCULACION")}
                      disabled={loading}
                    >
                      Permiso de Circulación
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-center gap-3 mb-4">
                  <button type="submit" className="btn btn-success px-4" disabled={loading}>
                    {loading ? "Procesando..." : "Convertir"}
                  </button>
                  <button type="button" className="btn btn-secondary px-4" onClick={handleLimpiar} disabled={loading}>
                    Limpiar
                  </button>
                </div>
              </form>

              {(loading || totalProcesados || totalExitosos || totalFallidos || duration !== null) && (
                <div className="mt-4">
                  <h5 className="text-center mb-3">Resumen de Procesamiento</h5>
                  <div className="row text-center">
                    <div className="col-6 col-md-3 mb-2">
                      <p className="fw-bold">Procesados</p>
                      <p>{loading && files ? `${progressCount} de ${files.length}` : totalProcesados}</p>
                    </div>
                    <div className="col-6 col-md-3 mb-2">
                      <p className="fw-bold text-success">Exitosos</p>
                      <p>{totalExitosos}</p>
                    </div>
                    <div className="col-6 col-md-3 mb-2">
                      <p className="fw-bold text-danger">Fallidos</p>
                      <p>{totalFallidos}</p>
                    </div>
                    <div className="col-6 col-md-3 mb-2">
                      {loading ? (
                        <>
                          <p className="fw-bold">Estimado</p>
                          <p>{formatTime(estimatedSeconds)}</p>
                        </>
                      ) : duration !== null ? (
                        <>
                          <p className="fw-bold">Duración</p>
                          <p>{duration.toFixed(2)} s</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {exitosos.length > 0 && (
                <div
                  className="mt-4 p-3 rounded"
                  style={{ backgroundColor: "#d4edda" }}
                >
                  <h5 className="text-center mb-2">Archivos Exitosos</h5>
                  <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                    <ul className="list-group">
                      {exitosos.map((item, index) => (
                        <li key={index} className="list-group-item text-center">
                          {item.fileName}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              )}

              {fallidos.length > 0 && (
                <div
                  className="mt-4 p-3 rounded"
                  style={{ backgroundColor: "#f8d7da" }}
                >
                  <h5 className="text-center mb-2">Archivos Fallidos</h5>
                  <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                    <ul className="list-group">
                      {fallidos.map((item, index) => (
                        <li key={index} className="list-group-item text-center">
                          <span dangerouslySetInnerHTML={{ __html: item.fileName }} /> -{" "}
                          <span dangerouslySetInnerHTML={{ __html: item.error }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              )}

              {previewData && (
                <div className="mt-4">
                  <h5 className="mb-3 text-center">Vista Previa del Excel</h5>
                  <div className="table-responsive overflow-auto" style={{ maxHeight: "400px" }}>
                    <table className="table table-bordered table-striped table-sm">
                      <thead className="table-light">
                        <tr>
                          {previewData[0]?.map((header: string, idx: number) => (
                            <th key={idx}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
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
                    <button className="btn btn-success" onClick={() => { if (excelBlob) saveAs(excelBlob, fileName); }}>
                      Descargar Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* <div className="text-center mt-4">
        <Link href="/excel-to-db">
          <button className="btn btn-info">
            Ingresar Datos de Excel a la BD
          </button>
        </Link>
      </div> */}

      {isExpanded && previewData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center"
          style={{ zIndex: 1050 }}
        >
          <div
            className="bg-white rounded shadow w-100"
            style={{ maxWidth: "90%", maxHeight: "90%", overflow: "auto", position: "relative" }}
          >
            {/* Encabezado sticky para el botón de cerrar */}
            <div className="sticky-top bg-white p-2 d-flex justify-content-end" style={{ zIndex: 3 }}>
              <button className="btn btn-danger" onClick={() => setIsExpanded(false)}>
                Cerrar Vista
              </button>
            </div>

            <div className="p-4">
              <h4 className="mb-3 text-center">Vista Expandida del Excel</h4>
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-sm">
                  <thead className="table-light">
                    <tr>
                      {previewData[0]?.map((header: string, idx: number) => (
                        <th
                          key={idx}
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#fff",
                            zIndex: 2,
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, cellIndex: number) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
