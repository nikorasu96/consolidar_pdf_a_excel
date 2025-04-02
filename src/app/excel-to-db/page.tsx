"use client";

import Link from "next/link";
import { useState } from "react";
import ExcelFileUpload from "@/components/ExcelFileUpload";
import readXlsxFile from "read-excel-file";
import logger from "@/utils/logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

export default function ExcelToDBPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [pdfFormat, setPdfFormat] = useState<PDFFormat | null>(null);
  const [clearFileInput, setClearFileInput] = useState(false);
  const [previewData, setPreviewData] = useState<any[][] | null>(null);
  const [dbResponse, setDbResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (fileList: FileList | null) => {
    setFiles(fileList);
    setPreviewData(null);
    setDbResponse(null);
  };

  const handleLimpiar = () => {
    setClearFileInput(true);
    setTimeout(() => setClearFileInput(false), 0);
    setFiles(null);
    setPreviewData(null);
    setDbResponse(null);
    setPdfFormat(null);
  };

  const handlePreview = async () => {
    if (files && files.length > 0) {
      const file = files[0];
      try {
        const rows = await readXlsxFile(file);
        setPreviewData(rows);
      } catch (error) {
        logger.error("Error al leer el archivo Excel:", error);
      }
    }
  };

  const handleIngresarDatos = async () => {
    if (!files || files.length === 0) {
      alert("No se ha seleccionado ningún archivo Excel.");
      return;
    }
    if (!pdfFormat) {
      alert("Por favor, selecciona un formato.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("excel", files[0]);
    formData.append("pdfFormat", pdfFormat);
    try {
      const response = await fetch("/api/excel/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setDbResponse("Datos ingresados correctamente en la base de datos.");
      } else {
        setDbResponse("Error al ingresar datos: " + data.error);
      }
    } catch (error) {
      setDbResponse("Error al comunicarse con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5 position-relative">
      {/* Contenedor principal de la tarjeta para subir el Excel */}
      <div className="card shadow-sm">
        <div className="card-header bg-secondary text-white text-center py-3">
          <h3 className="mb-0">Cargar Archivo Excel</h3>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <label className="form-label fw-bold">Selecciona el formato de Excel:</label>
            <div className="btn-group d-flex flex-wrap">
              <button
                type="button"
                className={`btn ${pdfFormat === "CERTIFICADO_DE_HOMOLOGACION" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                onClick={() => setPdfFormat("CERTIFICADO_DE_HOMOLOGACION")}
                disabled={loading}
              >
                Homologación
              </button>
              <button
                type="button"
                className={`btn ${pdfFormat === "CRT" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                onClick={() => setPdfFormat("CRT")}
                disabled={loading}
              >
                CRT
              </button>
              <button
                type="button"
                className={`btn ${pdfFormat === "SOAP" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                onClick={() => setPdfFormat("SOAP")}
                disabled={loading}
              >
                SOAP
              </button>
              <button
                type="button"
                className={`btn ${pdfFormat === "PERMISO_CIRCULACION" ? "btn-primary" : "btn-outline-primary"} flex-fill m-1`}
                onClick={() => setPdfFormat("PERMISO_CIRCULACION")}
                disabled={loading}
              >
                Permiso de Circulación
              </button>
            </div>
          </div>

          <ExcelFileUpload onFilesChange={handleFileChange} clearTrigger={clearFileInput} />

          <div className="d-flex justify-content-center gap-3 mt-4">
            <button className="btn btn-success" onClick={handlePreview} disabled={loading || !files}>
              {loading ? "Procesando..." : "Vista Previa del Excel"}
            </button>
            <button className="btn btn-primary" onClick={handleIngresarDatos} disabled={loading || !files}>
              {loading ? "Ingresando datos..." : "Ingresar Datos a la BD"}
            </button>
            <button className="btn btn-secondary" onClick={handleLimpiar} disabled={loading}>
              Limpiar
            </button>
          </div>

          {previewData && (
            <div className="mt-4">
              <h5 className="text-center mb-3">Vista Previa del Excel</h5>
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
            </div>
          )}

          {dbResponse && (
            <div className="alert alert-info text-center mt-4">
              {dbResponse}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/">
              <button className="btn btn-outline-info">
                Volver al Convertor PDF a Excel
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* INICIO: Overlay de "Sitio en Construcción" */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999 }}
      >
        <div className="text-center text-white">
          <h1>Sitio en Construcción</h1>
          <p>
            La funcionalidad para ingresar datos de Excel a la Base de Datos se encuentra en desarrollo.
            Por favor, regresa más tarde.
          </p>
          <Link href="/">
            <button className="btn btn-primary">Volver a Inicio</button>
          </Link>
        </div>
      </div>
      {/* FIN: Overlay de "Sitio en Construcción" */}
      {/* ======================================================== */}
    </div>
  );
}
