// app/api/convert/route.ts

import { NextResponse } from "next/server";
import logger from "@/utils/logger";
import type { PDFFormat } from "../../../types/pdfFormat";
// Importamos el tipo SettledFailure desde pdfService.ts
import type { SettledFailure } from "@/services/pdfService";

import {
  processPDFFiles,
  generateExcelFromResults,
} from "@/services/pdfService";

export const runtime = "nodejs";

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

    const returnRegex = pdfFormat === "PERMISO_CIRCULACION";
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        // Procesa los PDFs
        const results = await processPDFFiles({
          files,
          pdfFormat,
          returnRegex,
          onEvent: sendEvent,
        });

        // Separamos los resultados en éxitos y fallos
        const successes = results.filter((r) => r.status === "fulfilled") as {
          status: "fulfilled";
          value: any;
        }[];
        const failures = results.filter(r => r.status === "rejected") as SettledFailure[];

        // Mapeamos correctamente usando las propiedades del objeto reason
        const fallidos = failures.map((f) => ({
          fileName: f.reason.fileName,
          error: f.reason.error,
        }));

        // Si no hay éxitos, generamos Excel con estadísticas
        if (successes.length === 0) {
          const stats = {
            totalProcesados: files.length,
            totalExitosos: 0,
            totalFallidos: failures.length,
            fallidos: fallidos,
          };

          const { excelBuffer, fileName } = await generateExcelFromResults(
            [],
            pdfFormat,
            stats
          );
          sendEvent({
            final: {
              totalProcesados: files.length,
              totalExitosos: 0,
              totalFallidos: failures.length,
              exitosos: [],
              fallidos: fallidos,
              excel: excelBuffer.toString("base64"),
              fileName,
            },
          });
          controller.close();
          return;
        }

        // Construir objeto de estadísticas a partir de los resultados
        const stats = {
          totalProcesados: files.length,
          totalExitosos: successes.length,
          totalFallidos: failures.length,
          fallidos: fallidos,
        };

        // Generar el Excel pasando el objeto stats para que se genere la hoja "Estadisticas"
        const { excelBuffer, fileName } = await generateExcelFromResults(
          successes.map((s) => s.value),
          pdfFormat,
          stats
        );

        sendEvent({
          final: {
            totalProcesados: files.length,
            totalExitosos: successes.length,
            totalFallidos: failures.length,
            exitosos: successes.map((s) => s.value),
            fallidos: fallidos,
            excel: excelBuffer.toString("base64"),
            fileName,
          },
        });
        controller.close();
      },
    });

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
