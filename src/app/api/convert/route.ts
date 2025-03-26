// src/app/api/convert/route.ts

import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "../../../utils/pdfUtils";
import { generateExcel } from "../../../utils/excelUtils";

// Se especifica que se usará el runtime de Node.js.
export const runtime = "nodejs";

// Limita la concurrencia a 3 procesos simultáneos.
const limit = pLimit(3);

// Clases de error personalizadas para diferenciar tipos de error.
class ValidationError extends Error {}
class ExtractionError extends Error {}
class ExcelGenerationError extends Error {}

/**
 * Endpoint POST para procesar y convertir PDFs a un archivo Excel consolidado.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("pdf") as File[];
    if (!files || files.length === 0) {
      throw new ValidationError("No se proporcionó ningún archivo PDF");
    }

    for (const file of files) {
      if (file.type !== "application/pdf") {
        throw new ValidationError(`El archivo ${file.name} no es un PDF válido.`);
      }
    }

    const resultados = await Promise.all(
      files.map((file) => limit(() => procesarPDF(file)))
    );
    console.log(`Procesados ${resultados.length} archivos PDF exitosamente.`);

    const registros = resultados.map((r) => r.datos);
    let tituloExtraido: string | undefined;
    if (files.length === 1 && resultados[0].titulo) {
      tituloExtraido = resultados[0].titulo;
    }
    const nombreArchivo =
      files.length === 1 && tituloExtraido
        ? sanitizarNombre(tituloExtraido)
        : "CONSOLIDADO_CERTIFICADOS_HOMOLOGADOS";

    const { buffer: excelBuffer, encodedName } = await generateExcel(
      registros,
      nombreArchivo
    );

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error: unknown) {
    console.error("Error procesando los PDFs:", error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof ExtractionError) {
      return NextResponse.json(
        { error: "Error extrayendo datos de alguno de los PDFs" },
        { status: 422 }
      );
    } else if (error instanceof ExcelGenerationError) {
      return NextResponse.json(
        { error: "Error generando el archivo Excel" },
        { status: 500 }
      );
    } else if (error instanceof Error) {
      return NextResponse.json(
        { error: "Error procesando los PDFs: " + error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json({ error: "Error procesando los PDFs" }, { status: 500 });
    }
  }
}
