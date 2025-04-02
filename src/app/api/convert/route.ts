import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "@/utils/pdfUtils";
import { generateExcel } from "@/utils/excelUtils";
import { isValidPDF, isPDFContentValid } from "@/utils/fileUtils";
import logger from "@/utils/logger";
import type { PDFFormat } from "../../../../types/pdfFormat";

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

/**
 * Retorna un mensaje estándar según el botón/formato seleccionado.
 */
function getFormatMessage(pdfFormat: PDFFormat): string {
  switch (pdfFormat) {
    case "CERTIFICADO_DE_HOMOLOGACION":
      return "Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
    case "CRT":
      return "Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
    case "SOAP":
      return "Este botón es para PDF SOAP (Seguro Obligatorio). Por favor, coloque solo el PDF correspondiente a este formato.";
    case "PERMISO_CIRCULACION":
      return "Este botón es para Permisos de Circulación. Por favor, sube solo archivos PDF correspondientes a este tipo de documento.";
    default:
      return "";
  }
}

/**
 * Procesa un PDF directamente (sin worker).
 */
async function processPDFDirect(
  file: File,
  pdfFormat: PDFFormat,
  returnRegex: boolean
): Promise<ConversionSuccess> {
  // procesarPDF lanza error si el formato real no coincide con el esperado
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
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
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

    // Para Permiso de Circulación retornamos también los regex
    const returnRegex = pdfFormat === "PERMISO_CIRCULACION";
    const totalFiles = files.length;

    // Contadores y tiempo
    let processedCount = 0;
    let successesCount = 0;
    let failuresCount = 0;
    let totalTimeSoFar = 0; // en ms

    // Codificador para SSE
    const encoder = new TextEncoder();

    // Creamos un ReadableStream para SSE
    const stream = new ReadableStream({
      async start(controller) {
        /**
         * Envía un evento SSE con formato "data: {...}\n\n"
         */
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Procesamiento concurrente con p-limit
        const promises = files.map((file) =>
          limit(async () => {
            const fileStart = Date.now();
            try {
              const result = await processPDFDirect(file, pdfFormat, returnRegex);
              processedCount++;
              successesCount++;

              const fileEnd = Date.now();
              const fileTime = fileEnd - fileStart;
              totalTimeSoFar += fileTime;

              // Cálculo de tiempo restante (estimado)
              const avgTimePerFile = totalTimeSoFar / processedCount;
              const remaining = totalFiles - processedCount;
              const estimatedMsLeft = Math.round(avgTimePerFile * remaining);

              // Emitimos evento SSE con progreso
              sendEvent({
                progress: processedCount,
                total: totalFiles,
                file: file.name,
                status: "fulfilled",
                estimatedMsLeft,
                successes: successesCount,
                failures: failuresCount,
              });

              return { status: "fulfilled", value: result } as PromiseFulfilledResult<ConversionSuccess>;
            } catch (error: any) {
              processedCount++;
              failuresCount++;

              const fileEnd = Date.now();
              const fileTime = fileEnd - fileStart;
              totalTimeSoFar += fileTime;

              // Cálculo de tiempo restante (estimado)
              const avgTimePerFile = totalTimeSoFar / processedCount;
              const remaining = totalFiles - processedCount;
              const estimatedMsLeft = Math.round(avgTimePerFile * remaining);

              let errorMsg = error.message || "Error desconocido";
              // Si el mensaje contiene "Se detectó que pertenece a:", lo reemplazamos por una versión con fondo amarillo y negrita.
              if (errorMsg.includes("Se detectó que pertenece a:")) {
                errorMsg = errorMsg.replace(
                  /Se detectó que pertenece a:\s*(.*)/,
                  '<span style="background-color: yellow; font-weight: bold;">Se detectó que pertenece a: $1</span>'
                );
              }

              // Evento SSE de error para este archivo
              sendEvent({
                progress: processedCount,
                total: totalFiles,
                file: file.name,
                status: "rejected",
                error: errorMsg,
                estimatedMsLeft,
                successes: successesCount,
                failures: failuresCount,
              });

              return { status: "rejected", reason: error } as PromiseRejectedResult;
            }
          })
        );

        // Esperamos a que terminen todos
        const conversionResults = await Promise.all(promises);

        // Extraemos éxitos y fallas
        const exitosos = conversionResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<ConversionSuccess>).value);

        const fallidos = conversionResults
          .map((r, index) => {
            if (r.status === "rejected") {
              return {
                fileName: files[index].name,
                error: (r as PromiseRejectedResult).reason.message,
              } as ConversionFailure;
            }
            return null;
          })
          .filter(Boolean) as ConversionFailure[];

        // Si no hubo ningún éxito
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

          // Enviamos evento final con el detalle de fallidos
          sendEvent({
            final: {
              error: errorMsg,
              totalProcesados: totalFiles,
              totalExitosos: 0,
              totalFallidos: failuresCount,
              exitosos: [],
              fallidos,
              excel: null,
              fileName: null,
              message: getFormatMessage(pdfFormat),
            },
          });
          controller.close();
          return;
        }

        // Sí hubo éxitos => generamos el Excel
        let tituloExtraido: string | undefined;
        if (exitosos.length === 1 && exitosos[0]?.titulo) {
          tituloExtraido = exitosos[0].titulo;
        }

        const nombreArchivo =
          (exitosos.length === 1 && tituloExtraido)
            ? sanitizarNombre(tituloExtraido)
            : "CONSOLIDADO_CERTIFICADOS";

        const registros = exitosos.map((r) => r.datos);
        const { buffer: excelBuffer, encodedName } = await generateExcel(registros, nombreArchivo, pdfFormat);

        // Evento final con el Excel y los fallidos
        sendEvent({
          final: {
            totalProcesados: totalFiles,
            totalExitosos: successesCount,
            totalFallidos: failuresCount,
            exitosos,
            fallidos,
            excel: excelBuffer.toString("base64"),
            fileName: encodedName,
            message: getFormatMessage(pdfFormat),
          },
        });

        controller.close();
      },
    });

    // Retornamos el SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
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
