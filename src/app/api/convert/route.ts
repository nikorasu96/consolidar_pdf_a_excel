import { NextResponse } from "next/server";
import pLimit from "p-limit";
import { procesarPDF, sanitizarNombre } from "../../../utils/pdfUtils";
import { generateExcel } from "../../../utils/excelUtils";
import { isValidPDF } from "../../../utils/fileUtils";
import logger from "../../../utils/logger";

export const runtime = "nodejs";

const limit = pLimit(3);

type ConversionSuccess = {
  fileName: string;
  datos: Record<string, string>;
  titulo?: string;
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

function groupByFileName<T extends { fileName: string }>(
  items: T[]
): Array<{ fileName: string; count: number }> {
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("pdf") as File[];
    const pdfFormat = formData.get("pdfFormat") as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo PDF" },
        { status: 400 }
      );
    }

    // Validar PDFs antes de procesar
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

    // Procesar con concurrencia limitada
    const conversionResults = await Promise.allSettled<ConversionSuccess>(
      files.map((file) =>
        limit(() =>
          procesarPDF(file, pdfFormat).then((result) => ({
            fileName: file.name,
            datos: result.datos,
            titulo: result.titulo,
          }))
        )
      )
    );

    // Separamos exitosos y fallidos
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

    // Mensaje de formato
    let formatMessage = "";
    if (pdfFormat === "CERTIFICADO_DE_HOMOLOGACION") {
      formatMessage =
        "Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
    } else if (pdfFormat === "CRT") {
      formatMessage =
        "Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
    }

    // Extraemos registros de los PDFs exitosos
    const registros = exitosos.map((r) => r.datos);

    // Agrupamos resultados
    const groupedExitosos = groupByFileName(exitosos);
    const groupedFallidos = groupFailures(fallidos);

    // Si no hubo ningún PDF exitoso, devolvemos un 200 con la info de fallidos
    // y un error que explique lo sucedido, PERO SIN generar Excel.
    if (exitosos.length === 0) {
      // Mensaje de error adicional
      let errorMsg =
        "No se encontraron datos para generar el Excel. Verifica que los PDFs correspondan al formato seleccionado.";
      if (pdfFormat === "CERTIFICADO_DE_HOMOLOGACION") {
        errorMsg =
          "No se encontraron datos para generar el Excel. Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
      } else if (pdfFormat === "CRT") {
        errorMsg =
          "No se encontraron datos para generar el Excel. Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
      }

      return NextResponse.json(
        {
          error: errorMsg,
          totalProcesados: files.length,
          totalExitosos: 0,
          totalFallidos: fallidos.length,
          exitosos: groupedExitosos, // estará vacío
          fallidos: groupedFallidos,
          excel: null,
          fileName: null,
          message: formatMessage,
        },
        { status: 200 }
      );
    }

    // Caso normal: al menos un archivo exitoso => generamos Excel
    let tituloExtraido: string | undefined;
    if (files.length === 1 && exitosos[0]?.titulo) {
      tituloExtraido = exitosos[0].titulo;
    }
    const nombreArchivo =
      files.length === 1 && tituloExtraido
        ? sanitizarNombre(tituloExtraido)
        : "CONSOLIDADO_CERTIFICADOS";

    // Generamos el Excel con la lista de registros (pdfFormat ya no es necesario aquí, pues no lanzamos error)
    const { buffer: excelBuffer, encodedName } = await generateExcel(registros, nombreArchivo);

    return NextResponse.json({
      totalProcesados: files.length,
      totalExitosos: exitosos.length,
      totalFallidos: fallidos.length,
      exitosos: groupedExitosos,
      fallidos: groupedFallidos,
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
