"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import { validatePDFFiles } from "../utils/fileUtils";
import { saveAs } from "file-saver";
import readXlsxFile from "read-excel-file";
import logger from "../utils/logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

export default function Home() {
  // Estados para el manejo de archivos, carga y resultados
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  // Datos para la vista previa del Excel
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("consolidado.xlsx");
  const [isExpanded, setIsExpanded] = useState(false);

  // Resumen de resultados
  const [totalProcesados, setTotalProcesados] = useState(0);
  const [totalExitosos, setTotalExitosos] = useState(0);
  const [totalFallidos, setTotalFallidos] = useState(0);

  // Listas de archivos procesados exitosamente y fallidos
  const [groupedExitosos, setGroupedExitosos] = useState<
    Array<{ fileName: string; count: number }>
  >([]);
  const [groupedFallidos, setGroupedFallidos] = useState<
    Array<{ fileName: string; count: number; error: string }>
  >([]);

  // Mensajes extra
  const [formatMessage, setFormatMessage] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Para medir el tiempo de procesamiento
  const [duration, setDuration] = useState<number | null>(null);

  // Formato PDF seleccionado
  const [pdfFormat, setPdfFormat] = useState<PDFFormat>("CERTIFICADO_DE_HOMOLOGACION");

  // Para limpiar el FileUpload
  const [clearFileInput, setClearFileInput] = useState(false);

  /**
   * Resetea los resultados y los estados asociados.
   */
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
    setDuration(null);
  };

  /**
   * Maneja el cambio de archivos en el componente FileUpload.
   */
  const handleFileChange = (files: FileList | null) => {
    setFiles(files);
    resetResults();
  };

  /**
   * Maneja el cambio de formato PDF seleccionado.
   */
  const handleFormatChange = (format: PDFFormat) => {
    setPdfFormat(format);
    resetResults();
  };

  /**
   * Limpia los archivos subidos, resetea todo y vuelve al formato por defecto.
   */
  const handleLimpiar = () => {
    setClearFileInput(true);
    setTimeout(() => setClearFileInput(false), 0);
    setFiles(null);
    resetResults();
    setPdfFormat("CERTIFICADO_DE_HOMOLOGACION");
  };

  /**
   * Envía los archivos seleccionados al endpoint /api/convert y procesa la respuesta.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    // Validación de PDFs
    if (!validatePDFFiles(files)) {
      alert("Uno o más archivos no son válidos.");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

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

      // Si la respuesta no es OK, se muestra un error y se detiene.
      if (!res.ok) {
        alert(data.error);
        setLoading(false);
        return;
      }

      // Mensaje de error de API (opcional)
      if (data.error) {
        setApiError(data.error);
      }

      // Datos de resumen
      setTotalProcesados(data.totalProcesados);
      setTotalExitosos(data.totalExitosos);
      setTotalFallidos(data.totalFallidos);
      setGroupedExitosos(data.exitosos);
      setGroupedFallidos(data.fallidos);
      setFormatMessage(data.message);

      // Si se generó un Excel, se procesa para vista previa
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
      // Se mide el tiempo total de proceso
      const endTime = Date.now();
      setDuration((endTime - startTime) / 1000);
    }
  };

  /**
   * Descarga el archivo Excel generado.
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
              {/* Mensajes de error y de formato */}
              {apiError && (
                <div className="alert alert-warning text-center">{apiError}</div>
              )}
              {formatMessage && (
                <div className="alert alert-info text-center">{formatMessage}</div>
              )}

              {/* Form principal */}
              <form onSubmit={handleSubmit}>
                <FileUpload onFilesChange={handleFileChange} clearTrigger={clearFileInput} />

                {/* Selección de formato */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Selecciona el formato de PDF:</label>
                  <div className="btn-group d-flex flex-wrap">
                    <button
                      type="button"
                      className={`btn ${pdfFormat === "CERTIFICADO_DE_HOMOLOGACION" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                      onClick={() => handleFormatChange("CERTIFICADO_DE_HOMOLOGACION")}
                      disabled={loading}
                    >
                      CERTIFICADO DE HOMOLOGACIÓN
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

              {/* Resumen de procesamiento */}
              {(totalProcesados || totalExitosos || totalFallidos || duration !== null) && (
                <div className="mt-4">
                  <h5 className="text-center">Resumen de Procesamiento</h5>
                  <div className="row text-center">
                    <div className="col">
                      <p className="mb-0 fw-bold">Procesados</p>
                      <p>{totalProcesados}</p>
                    </div>
                    <div className="col">
                      <p className="mb-0 fw-bold text-success">Exitosos</p>
                      <p>{totalExitosos}</p>
                    </div>
                    <div className="col">
                      <p className="mb-0 fw-bold text-danger">Fallidos</p>
                      <p>{totalFallidos}</p>
                    </div>
                    {duration !== null && (
                      <div className="col">
                        <p className="mb-0 fw-bold">Duración</p>
                        <p>{duration.toFixed(2)} s</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Archivos Exitosos: Fondo Verde Claro */}
              {groupedExitosos.length > 0 && (
                <div
                  className="mt-4 p-3 rounded"
                  style={{ backgroundColor: "#d4edda" }} 
                >
                  <h5 className="text-center">Archivos Exitosos</h5>
                  <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <ul className="list-group text-center">
                      {groupedExitosos.map((item, index) => (
                        <li key={index} className="list-group-item">
                          {item.fileName}
                          {item.count > 1 && ` (x${item.count})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Archivos Fallidos: Fondo Rojo Claro */}
              {groupedFallidos.length > 0 && (
                <div
                  className="mt-4 p-3 rounded"
                  style={{ backgroundColor: "#f8d7da" }}
                >
                  <h5 className="text-center">Archivos Fallidos</h5>
                  <div className="table-responsive" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <ul className="list-group text-center">
                      {groupedFallidos.map((item, index) => (
                        <li key={index} className="list-group-item">
                          {item.fileName}
                          {item.count > 1 && ` (x${item.count})`} - {item.error}
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
                          {previewData[0]?.map((header, index) => (
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

      {/* Modal de Vista Expandida del Excel */}
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
                    {previewData[0]?.map((header, index) => (
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
