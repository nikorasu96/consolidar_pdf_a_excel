// src/app/api/convert/route.ts

import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "../../../utils/pdfUtils";
import { generateExcel } from "../../../utils/excelUtils";

// Especifica que se usará el runtime de Node.js para acceder a APIs nativas de Node.
export const runtime = "nodejs";

// Se crea un limitador de concurrencia para procesar hasta 3 PDFs al mismo tiempo.
const limit = pLimit(3);

/**
 * Función que maneja la solicitud POST al endpoint /api/convert.
 * Recibe los archivos PDF, los procesa para extraer datos y genera un archivo Excel consolidado.
 */
export async function POST(request: Request) {
  try {
    // Se obtiene el FormData enviado en la solicitud.
    const formData = await request.formData();
    const files = formData.getAll("pdf") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo PDF" },
        { status: 400 }
      );
    }

    // Procesa cada archivo PDF de forma concurrente pero limitado a 3 procesos al mismo tiempo.
    const resultados = await Promise.all(
      files.map((file) => limit(() => procesarPDF(file)))
    );

    // Se extraen los datos de cada PDF para consolidarlos.
    const registros = resultados.map((r) => r.datos);
    let tituloExtraido: string | undefined;
    // Si se procesa un solo archivo y se extrae un título, se utiliza ese título para nombrar el archivo Excel.
    if (files.length === 1 && resultados[0].titulo) {
      tituloExtraido = resultados[0].titulo;
    }

    const nombreArchivo =
      files.length === 1 && tituloExtraido
        ? sanitizarNombre(tituloExtraido)
        : "CONSOLIDADO_CERTIFICADOS_HOMOLOGADOS";

    // Se genera el archivo Excel a partir de los registros extraídos.
    const { buffer: excelBuffer, encodedName } = await generateExcel(
      registros,
      nombreArchivo
    );

    // Se retorna la respuesta con el archivo Excel, configurando los encabezados para descarga.
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`
      }
    });
  } catch (error) {
    console.error("Error procesando los PDFs:", error);
    return NextResponse.json(
      { error: "Error procesando los PDFs" },
      { status: 500 }
    );
  }
}
