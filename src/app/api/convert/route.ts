// src/app/api/convert/route.ts

import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "../../../utils/pdfUtils";
import { generateExcel } from "../../../utils/excelUtils";
import { isValidPDF } from "../../../utils/fileUtils";

export const runtime = "nodejs";

// Limitador de concurrencia para evitar saturar el servidor.
const limit = pLimit(3);

export async function POST(request: Request) {
  try {
    // Se obtiene el FormData de la solicitud.
    const formData = await request.formData();
    const files = formData.getAll("pdf") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo PDF" },
        { status: 400 }
      );
    }

    // Validar cada archivo en el servidor.
    for (const file of files) {
      if (!isValidPDF(file)) {
        return NextResponse.json(
          {
            error: `El archivo ${file.name} no es válido o excede el tamaño permitido.`,
          },
          { status: 400 }
        );
      }
    }

    // Procesar cada PDF con concurrencia limitada.
    const resultados = await Promise.all(
      files.map((file) => limit(() => procesarPDF(file)))
    );

    // Extraer registros de cada PDF.
    const registros = resultados.map((r) => r.datos);

    // Si hay un solo archivo y se extrae un título, se usa para el nombre final.
    let tituloExtraido: string | undefined;
    if (files.length === 1 && resultados[0].titulo) {
      tituloExtraido = resultados[0].titulo;
    }
    const nombreArchivo =
      files.length === 1 && tituloExtraido
        ? sanitizarNombre(tituloExtraido)
        : "CONSOLIDADO_CERTIFICADOS_HOMOLOGADOS";

    // Generar el Excel con los registros extraídos.
    const { buffer: excelBuffer, encodedName } = await generateExcel(
      registros,
      nombreArchivo
    );

    // Retornar la respuesta con el archivo Excel generado.
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error: any) {
    console.error("Error procesando los PDFs:", error);
    return NextResponse.json(
      { error: "Error procesando los PDFs. Por favor, inténtalo más tarde." },
      { status: 500 }
    );
  }
}
