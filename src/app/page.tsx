// src/app/page.tsx

"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import { validatePDFFiles } from "../utils/fileUtils";

/**
 * Página principal de la aplicación.
 * Permite al usuario cargar archivos PDF, validarlos y enviarlos al endpoint de conversión.
 */
export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  // Callback para actualizar el estado de los archivos seleccionados.
  const handleFileChange = (files: FileList | null) => {
    setFiles(files);
  };

  // Función que se ejecuta al enviar el formulario.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    // Validación adicional de los archivos.
    if (!validatePDFFiles(files)) {
      alert("Uno o más archivos no son válidos.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    // Agrega cada archivo PDF al FormData.
    Array.from(files).forEach((file) => {
      formData.append("pdf", file);
    });

    try {
      // Llama al endpoint de API que se encarga de convertir los PDFs a Excel.
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Error procesando los archivos");
        setLoading(false);
        return;
      }

      // Procesa el encabezado para determinar el nombre del archivo Excel a descargar.
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      let fileName = "consolidado.xlsx";
      const matchUTF8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const matchSimple = contentDisposition.match(/filename="([^"]+)"/i);
      if (matchUTF8 && matchUTF8[1]) {
        fileName = decodeURIComponent(matchUTF8[1]);
      } else if (matchSimple && matchSimple[1]) {
        fileName = matchSimple[1];
      }

      // Crea un blob a partir de la respuesta y simula la descarga del archivo.
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error:", error);
      alert("Ocurrió un error");
    } finally {
      setLoading(false);
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
        </div>
      </div>
    </div>
  );
}
