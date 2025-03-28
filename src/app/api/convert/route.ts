// src/app/api_convert/route.ts
import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "@/utils/pdfUtils";
import { generateExcel } from "@/utils/excelUtils";
import { isValidPDF, isPDFContentValid } from "@/utils/fileUtils";
import logger from "@/utils/logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

export const runtime = "nodejs";
const limit = pLimit(5);

type ConversionSuccess = {
  fileName: string;
  datos: Record<string, string>;
  titulo?: string;
  regexes?: Record<string, RegExp> | null;
};

type ConversionFailure = {
  fileName: string;
  error: string;
};

function isFulfilled(
  res: PromiseSettledResult<ConversionSuccess>
): res is PromiseFulfilledResult<ConversionSuccess> {
  return res.status === "fulfilled";
}

function groupByFileName<T extends { fileName: string }>(items: T[]): Array<{ fileName: string; count: number }> {
  const map: Record<string, number> = {};
  for (const item of items) {
    map[item.fileName] = (map[item.fileName] || 0) + 1;
  }
  return Object.entries(map).map(([fileName, count]) => ({ fileName, count }));
}

function groupFailures(failures: ConversionFailure[]) {
  const map: Record<string, { count: number; error: string }> = {};
  for (const f of failures) {
    if (!map[f.fileName]) {
      map[f.fileName] = { count: 0, error: f.error };
    }
    map[f.fileName].count += 1;
  }
  return Object.entries(map).map(([fileName, info]) => ({
    fileName,
    count: info.count,
    error: info.error,
  }));
}

/**
 * Procesa el PDF directamente sin usar un worker.
 */
async function processPDFDirect(file: File, pdfFormat: PDFFormat, returnRegex: boolean): Promise<ConversionSuccess> {
  const result = await procesarPDF(file, pdfFormat, returnRegex);
  return {
    fileName: file.name,
    datos: result.datos,
    titulo: result.titulo,
    regexes: result.regexes || null,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("pdf") as File[];
    const pdfFormat = formData.get("pdfFormat") as PDFFormat;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo PDF" },
        { status: 400 }
      );
    }

    // Validamos cada archivo: tipo, tamaño y contenido
    for (const file of files) {
      if (!isValidPDF(file)) {
        return NextResponse.json(
          { error: `El archivo ${file.name} no es válido o excede el tamaño permitido.` },
          { status: 400 }
        );
      }
      if (!(await isPDFContentValid(file))) {
        return NextResponse.json(
          { error: `El contenido del archivo ${file.name} no es válido.` },
          { status: 400 }
        );
      }
    }

    // Activa el retorno de regex solo para PERMISO_CIRCULACION.
    const returnRegex = pdfFormat === "PERMISO_CIRCULACION";

    // Se procesa cada archivo directamente sin usar worker
    const conversionResults = await Promise.allSettled<ConversionSuccess>(
      files.map((file) => limit(() => processPDFDirect(file, pdfFormat, returnRegex)))
    );

    const exitosos = conversionResults.filter(isFulfilled).map((res) => res.value);
    const fallidos: ConversionFailure[] = conversionResults
      .map((res, index) => {
        if (res.status === "rejected") {
          return {
            fileName: files[index].name,
            error: (res as PromiseRejectedResult).reason.message,
          };
        }
        return null;
      })
      .filter(Boolean) as ConversionFailure[];

    // Mensajes personalizados por formato
    let formatMessage = "";
    switch (pdfFormat) {
      case "CERTIFICADO_DE_HOMOLOGACION":
        formatMessage = "Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
        break;
      case "CRT":
        formatMessage = "Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
        break;
      case "SOAP":
        formatMessage = "Este botón es para PDF SOAP (Seguro Obligatorio). Por favor, coloque solo el PDF correspondiente a este formato.";
        break;
      case "PERMISO_CIRCULACION":
        formatMessage = "Este botón es para Permisos de Circulación. Por favor, sube solo archivos PDF correspondientes a este tipo de documento.";
        break;
    }

    const registros = exitosos.map((r) => r.datos);
    const groupedExitosos = groupByFileName(exitosos);
    const groupedFallidos = groupFailures(fallidos);

    if (exitosos.length === 0) {
      let errorMsg =
        "No se encontraron datos para generar el Excel. Verifica que los PDFs correspondan al formato seleccionado.";
      switch (pdfFormat) {
        case "CERTIFICADO_DE_HOMOLOGACION":
          errorMsg = "No se encontraron datos para generar el Excel. Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
          break;
        case "CRT":
          errorMsg = "No se encontraron datos para generar el Excel. Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
          break;
        case "SOAP":
          errorMsg = "No se encontraron datos para generar el Excel. Este botón es para PDF SOAP. Por favor, coloque solo el PDF correspondiente a este formato.";
          break;
        case "PERMISO_CIRCULACION":
          errorMsg = "No se encontraron datos para generar el Excel. Este botón es para Permisos de Circulación. Por favor, coloque solo el PDF correspondiente a este formato.";
          break;
      }

      return NextResponse.json(
        {
          error: errorMsg,
          totalProcesados: files.length,
          totalExitosos: 0,
          totalFallidos: fallidos.length,
          exitosos: groupedExitosos,
          fallidos: groupedFallidos,
          excel: null,
          fileName: null,
          message: formatMessage,
        },
        { status: 200 }
      );
    }

    let tituloExtraido: string | undefined;
    if (files.length === 1 && exitosos[0]?.titulo) {
      tituloExtraido = exitosos[0].titulo;
    }

    const nombreArchivo =
      files.length === 1 && tituloExtraido
        ? sanitizarNombre(tituloExtraido)
        : "CONSOLIDADO_CERTIFICADOS";

    const { buffer: excelBuffer, encodedName } = await generateExcel(
      registros,
      nombreArchivo,
      pdfFormat
    );

    return NextResponse.json({
      totalProcesados: files.length,
      totalExitosos: exitosos.length,
      totalFallidos: fallidos.length,
      exitosos: groupedExitosos,
      fallidos: groupedFallidos,
      detalles: exitosos,
      excel: excelBuffer.toString("base64"),
      fileName: encodedName,
      message: formatMessage,
    });
  } catch (error: any) {
    logger.error("Error procesando los PDFs:", error);
    const errorMessage =
      typeof error?.message === "string"
        ? error.message
        : "Error procesando los PDFs. Por favor, inténtalo más tarde.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
