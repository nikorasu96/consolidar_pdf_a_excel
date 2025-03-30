"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import { validatePDFFiles } from "../utils/fileUtils";
import { saveAs } from "file-saver";
import readXlsxFile from "read-excel-file";
import logger from "../utils/logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

/**
 * Convierte segundos totales en un string "Xh Ym Zs" o "Ym Zs".
 */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

export default function Home() {
  // Estados principales
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  // Para vista previa del Excel
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("consolidado.xlsx");
  const [isExpanded, setIsExpanded] = useState(false);

  // Resumen de resultados
  const [totalProcesados, setTotalProcesados] = useState(0);
  const [totalExitosos, setTotalExitosos] = useState(0);
  const [totalFallidos, setTotalFallidos] = useState(0);

  // Listas finales
  const [exitosos, setExitosos] = useState<
    Array<{ fileName: string; datos: Record<string, string>; titulo?: string }>
  >([]);
  const [fallidos, setFallidos] = useState<
    Array<{ fileName: string; error: string }>
  >([]);

  // Mensajes
  const [formatMessage, setFormatMessage] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Tiempo total y progreso en tiempo real
  const [duration, setDuration] = useState<number | null>(null);
  const [progressCount, setProgressCount] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);

  // ❗ Formato PDF seleccionado: inicia en null
  const [pdfFormat, setPdfFormat] = useState<PDFFormat | null>(null);

  // Para limpiar el FileUpload
  const [clearFileInput, setClearFileInput] = useState(false);

  /**
   * Reset de todos los estados de resultado.
   */
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
    // Asignamos el formato
    setPdfFormat(format);
    resetResults();
  };

  /**
   * Limpia todo y NOTA: no definimos pdfFormat ("CERTIFICADO_DE_HOMOLOGACION")
   * así arranca sin ningún botón seleccionado.
   */
  const handleLimpiar = () => {
    setClearFileInput(true);
    setTimeout(() => setClearFileInput(false), 0);
    setFiles(null);
    resetResults();
    //pdfFormat permanece en null
    setPdfFormat(null);
  };

  /**
   * Envía los archivos al endpoint /api/convert y procesa la respuesta SSE.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      alert("No se han seleccionado archivos.");
      return;
    }

    // ❗ Si no se ha seleccionado formato, no continuamos
    if (!pdfFormat) {
      alert("Por favor, selecciona un formato antes de convertir.");
      return;
    }

    // Validación previa
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

      // Lectura del stream SSE
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decodificamos chunk
        partial += decoder.decode(value, { stream: true });
        // Cada evento SSE se separa por doble salto de línea
        const events = partial.split("\n\n");
        partial = events.pop() || ""; // lo que sobra se queda en partial

        // Procesamos cada evento SSE
        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.trim().split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const jsonString = line.replace(/^data:\s?/, "");
              if (!jsonString.trim()) continue;
              const data = JSON.parse(jsonString);

              // Evento parcial de progreso
              if (data.progress !== undefined && data.total !== undefined) {
                setProgressCount(data.progress);
                if (data.successes !== undefined) setTotalExitosos(data.successes);
                if (data.failures !== undefined) setTotalFallidos(data.failures);
                setEstimatedSeconds(Math.round(data.estimatedMsLeft / 1000));
              }

              // Evento final
              if (data.final) {
                if (data.final.error) {
                  // Error global (por ejemplo, no se encontraron datos)
                  setApiError(data.final.error);
                }

                // Resumen final
                setTotalProcesados(data.final.totalProcesados);
                setTotalExitosos(data.final.totalExitosos);
                setTotalFallidos(data.final.totalFallidos);
                setFormatMessage(data.final.message || "");

                // Listas de éxitos/fallas
                if (data.final.exitosos) {
                  setExitosos(data.final.exitosos);
                }
                if (data.final.fallidos) {
                  setFallidos(data.final.fallidos);
                }

                // Si hay Excel
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

                  // Cargamos la vista previa
                  const rows = await readXlsxFile(blob);
                  setPreviewData(rows);
                } else {
                  setExcelBlob(null);
                  setPreviewData(null);
                }

                // Terminamos la lectura SSE
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

  /**
   * Descarga el Excel generado.
   */
  const handleDownload = () => {
    if (excelBlob) {
      saveAs(excelBlob, fileName);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header text-center bg-gradient bg-primary text-white">
              <h2 className="mb-0">Consolidar PDFs a Excel</h2>
            </div>
            <div className="card-body">
              {/* Mensaje de error general */}
              {apiError && (
                <div className="alert alert-warning text-center">{apiError}</div>
              )}

              {/* Mensaje de formato */}
              {formatMessage && (
                <div className="alert alert-info text-center">{formatMessage}</div>
              )}

              <form onSubmit={handleSubmit}>
                {/* FileUpload (deshabilitado si está cargando) */}
                <div
                  style={{
                    pointerEvents: loading ? "none" : "auto",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <FileUpload onFilesChange={handleFileChange} clearTrigger={clearFileInput} />
                </div>

                {/* Cantidad de archivos seleccionados */}
                {files && files.length > 0 && (
                  <div className="my-3 text-center">
                    <span className="badge bg-info text-dark fs-5">
                      Archivos seleccionados: {files.length}
                    </span>
                  </div>
                )}

                {/* Botones de formato (ninguno seleccionado inicialmente) */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Selecciona el formato de PDF:</label>
                  <div className="btn-group d-flex flex-wrap">
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "CERTIFICADO_DE_HOMOLOGACION"
                          ? "btn-primary"
                          : "btn-outline-primary"
                        } flex-fill m-1`}
                      onClick={() => handleFormatChange("CERTIFICADO_DE_HOMOLOGACION")}
                      disabled={loading}
                    >
                      CERTIFICADO DE HOMOLOGACIÓN
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "CRT" ? "btn-primary" : "btn-outline-primary"
                        } flex-fill m-1`}
                      onClick={() => handleFormatChange("CRT")}
                      disabled={loading}
                    >
                      Certificado de Revisión Técnica (CRT)
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "SOAP" ? "btn-primary" : "btn-outline-primary"
                        } flex-fill m-1`}
                      onClick={() => handleFormatChange("SOAP")}
                      disabled={loading}
                    >
                      SOAP (Seguro Obligatorio)
                    </button>
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "PERMISO_CIRCULACION"
                          ? "btn-primary"
                          : "btn-outline-primary"
                        } flex-fill m-1`}
                      onClick={() => handleFormatChange("PERMISO_CIRCULACION")}
                      disabled={loading}
                    >
                      Permiso de Circulación
                    </button>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="d-flex justify-content-center gap-3 mt-4">
                  <button type="submit" className="btn btn-success px-4" disabled={loading}>
                    {loading ? "Procesando..." : "Convertir"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary px-4"
                    onClick={handleLimpiar}
                    disabled={loading}
                  >
                    Limpiar
                  </button>
                </div>
              </form>

              {/* Bloque de progreso en tiempo real y/o resumen final */}
              {(loading || totalProcesados || totalExitosos || totalFallidos || duration !== null) && (
                <div className="mt-4">
                  <h5 className="text-center">Resumen de Procesamiento</h5>
                  <div className="row text-center">
                    {/* Procesados */}
                    <div className="col">
                      <p className="mb-0 fw-bold">Procesados</p>
                      <p>
                        {loading && files
                          ? `${progressCount} de ${files.length}`
                          : totalProcesados}
                      </p>
                    </div>
                    {/* Exitosos */}
                    <div className="col">
                      <p className="mb-0 fw-bold text-success">Exitosos</p>
                      <p>{totalExitosos}</p>
                    </div>
                    {/* Fallidos */}
                    <div className="col">
                      <p className="mb-0 fw-bold text-danger">Fallidos</p>
                      <p>{totalFallidos}</p>
                    </div>
                    {/* Estimado o Duración */}
                    {loading ? (
                      <div className="col">
                        <p className="mb-0 fw-bold">Estimado</p>
                        <p>{formatTime(estimatedSeconds)}</p>
                      </div>
                    ) : duration !== null ? (
                      <div className="col">
                        <p className="mb-0 fw-bold">Duración</p>
                        <p>{duration.toFixed(2)} s</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Panel de Archivos Exitosos */}
              {exitosos.length > 0 && (
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: "#d4edda" }}>
                  <h5 className="text-center">Archivos Exitosos</h5>
                  <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <ul className="list-group text-center">
                      {exitosos.map((item, index) => (
                        <li key={index} className="list-group-item">
                          {item.fileName}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Panel de Archivos Fallidos */}
              {fallidos.length > 0 && (
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: "#f8d7da" }}>
                  <h5 className="text-center">Archivos Fallidos</h5>
                  <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <ul className="list-group text-center">
                      {fallidos.map((item, index) => (
                        <li key={index} className="list-group-item">
                          {item.fileName} -{" "}
                          <span
                            style={{ backgroundColor: "yellow", fontWeight: "bold" }}
                            dangerouslySetInnerHTML={{ __html: item.error }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}


              {/* Vista previa del Excel */}
              {previewData && (
                <div className="mt-4">
                  <h5 className="mb-3 text-center">Vista Previa del Excel</h5>
                  <div
                    className="table-responsive"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                  >
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
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setIsExpanded(true)}
                    >
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
        </div>
      </div>

      {/* Modal para Vista Expandida del Excel */}
      {isExpanded && previewData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center"
          style={{ zIndex: 1050 }}
        >
          <div
            className="bg-white p-4 rounded shadow"
            style={{ width: "90%", maxHeight: "90%", overflowY: "auto" }}
          >
            <button
              className="btn btn-danger position-absolute top-0 end-0 m-3"
              onClick={() => setIsExpanded(false)}
            >
              Cerrar Vista
            </button>
            <h4 className="mb-3 text-center">Vista Expandida del Excel</h4>
            <div className="table-responsive">
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
          </div>
        </div>
      )}
    </div>
  );
}
