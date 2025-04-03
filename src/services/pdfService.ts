// src/services/pdfService.ts
import pLimit from "p-limit";
import { procesarPDF } from "@/utils/pdf/pdfUtils";
import { generateExcel, ExcelStats } from "@/utils/excel/excelUtils"; // <-- Usamos la función generateExcel
import logger from "@/utils/logger";
import type { PDFFormat } from "@/types/pdfFormat";

export type ConversionSuccess = {
  fileName: string;
  datos: Record<string, string>;
  titulo?: string;
  regexes?: Record<string, RegExp> | null;
};

export type ConversionFailure = {
  fileName: string;
  error: string;
};

type SettledSuccess<T> = { status: "fulfilled"; value: T };
type SettledFailure = { status: "rejected"; reason: string };
export type SettledResult<T> = SettledSuccess<T> | SettledFailure;

interface ProcessOptions {
  files: File[];
  pdfFormat: PDFFormat;
  returnRegex: boolean;
  onEvent: (data: any) => void;
}

/**
 * Procesa un arreglo de archivos PDF con concurrencia limitada.
 * Emite eventos de progreso y retorna un arreglo de resultados "settled" para cada archivo.
 */
export async function processPDFFiles({
  files,
  pdfFormat,
  returnRegex,
  onEvent,
}: ProcessOptions): Promise<SettledResult<ConversionSuccess>[]> {
  const limit = pLimit(5);
  const totalFiles = files.length;
  let processedCount = 0;
  let successesCount = 0;
  let failuresCount = 0;
  let totalTimeSoFar = 0;

  const promises: Array<Promise<SettledResult<ConversionSuccess>>> = files.map((file) =>
    limit(async () => {
      const fileStart = Date.now();
      try {
        const result = await procesarPDF(file, pdfFormat, returnRegex);
        processedCount++;
        successesCount++;
        const fileEnd = Date.now();
        const fileTime = fileEnd - fileStart;
        totalTimeSoFar += fileTime;
        const avgTimePerFile = totalTimeSoFar / processedCount;
        const remaining = totalFiles - processedCount;
        const estimatedMsLeft = Math.round(avgTimePerFile * remaining);

        onEvent({
          progress: processedCount,
          total: totalFiles,
          file: file.name,
          status: "fulfilled",
          estimatedMsLeft,
          successes: successesCount,
          failures: failuresCount,
        });

        return {
          status: "fulfilled",
          value: {
            fileName: file.name,
            ...result, // { datos, titulo, regexes }
          },
        } as SettledSuccess<ConversionSuccess>;
      } catch (error: any) {
        processedCount++;
        failuresCount++;
        const fileEnd = Date.now();
        const fileTime = fileEnd - fileStart;
        totalTimeSoFar += fileTime;
        const avgTimePerFile = totalTimeSoFar / processedCount;
        const remaining = totalFiles - processedCount;
        const estimatedMsLeft = Math.round(avgTimePerFile * remaining);

        let errorMsg = error.message || "Error desconocido";
        if (errorMsg.includes("Se detectó que pertenece a:")) {
          errorMsg = errorMsg.replace(
            /Se detectó que pertenece a:\s*(.*)/,
            '<span style="background-color: yellow; font-weight: bold;">Se detectó que pertenece a: $1</span>'
          );
        }

        onEvent({
          progress: processedCount,
          total: totalFiles,
          file: file.name,
          status: "rejected",
          error: errorMsg,
          estimatedMsLeft,
          successes: successesCount,
          failures: failuresCount,
        });

        return {
          status: "rejected",
          reason: errorMsg,
        } as SettledFailure;
      }
    })
  );

  return await Promise.all(promises);
}

/**
 * Genera un Excel a partir de los resultados exitosos y, opcionalmente, incluye la hoja de estadísticas.
 * Llama internamente a generateExcel (definida en excelUtils.ts).
 */
export async function generateExcelFromResults(
  successes: ConversionSuccess[],
  pdfFormat: PDFFormat,
  stats?: ExcelStats
): Promise<{ excelBuffer: Buffer; fileName: string }> {
  // Determinar nombre base del archivo
  let baseFileName = "";
  switch (pdfFormat) {
    case "CERTIFICADO_DE_HOMOLOGACION":
      baseFileName = "Certificado de Homologación";
      break;
    case "CRT":
      baseFileName = "Certificado de Revisión Técnica (CRT)";
      break;
    case "SOAP":
      baseFileName = "Seguro Obligatorio (SOAP)";
      break;
    case "PERMISO_CIRCULACION":
      baseFileName = "Permiso de Circulación";
      break;
    default:
      baseFileName = "Consolidado";
  }

  // Si hay un solo registro y extrajo un título, usarlo
  let tituloExtraido: string | undefined;
  if (successes.length === 1 && successes[0]?.titulo) {
    tituloExtraido = successes[0].titulo;
  }
  const nombreArchivo = successes.length === 1 && tituloExtraido
    ? tituloExtraido
    : baseFileName;

  // Preparar los registros para la hoja "Datos"
  const registros = successes.map((r) => ({
    "Nombre PDF": r.fileName,
    ...r.datos,  // Los campos extraídos del PDF
  })) as Array<{ [key: string]: any }>;

  // Llamamos a la función "generateExcel" que está en excelUtils.ts
  const { buffer, encodedName } = await generateExcel(registros, nombreArchivo, pdfFormat, stats);

  return { excelBuffer: buffer, fileName: encodedName };
}
