// src/utils/excel/excelUtils.ts
import XlsxPopulate from "xlsx-populate";
import { setColumnWidths } from "./columnUtils";
import { adjustRowHeights } from "./rowUtils";
import { sanitizarNombre } from "@/utils/pdf/pdfUtils";
import logger from "@/utils/logger";

export interface ExcelStats {
  totalProcesados: number;
  totalExitosos: number;
  totalFallidos: number;
  fallidos: Array<{ fileName: string; error: string }>;
}

/**
 * Función auxiliar para eliminar etiquetas HTML de un string.
 * @param htmlString Cadena que puede contener HTML.
 * @returns Cadena limpia sin etiquetas HTML.
 */
function stripHtmlTags(htmlString: string): string {
  return htmlString.replace(/<[^>]*>/g, "");
}

/**
 * Genera un archivo Excel con dos hojas:
 *  - "Datos": Contiene los registros exitosos.
 *  - "Estadisticas": Muestra el resumen de procesamiento (totales y lista de archivos fallidos).
 *
 * @param registros Datos a incluir en la hoja "Datos".
 * @param fileName Nombre base del archivo.
 * @param pdfFormat (Opcional) Formato de PDF.
 * @param stats (Opcional) Estadísticas: totalProcesados, totalExitosos, totalFallidos y fallidos.
 * @returns Un objeto con el buffer del Excel y el nombre codificado.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string,
  pdfFormat?: string,
  stats?: ExcelStats
): Promise<{ buffer: Buffer; encodedName: string }> {
  const workbook = await XlsxPopulate.fromBlankAsync();

  // Hoja "Datos"
  const dataSheet = workbook.sheet(0) as any;
  dataSheet.name("Datos");

  if (registros.length === 0) {
    dataSheet.cell(1, 1).value("No se encontraron datos para generar el Excel.");
  } else {
    // Los encabezados se obtienen de las claves del primer registro.
    const headers = Object.keys(registros[0]);
    headers.forEach((header, colIndex) => {
      dataSheet.cell(1, colIndex + 1).value(header);
    });
    // Insertar cada registro
    registros.forEach((registro, rowIndex) => {
      headers.forEach((header, colIndex) => {
        dataSheet.cell(rowIndex + 2, colIndex + 1).value(registro[header] || "");
      });
    });
    setColumnWidths(dataSheet, headers, registros);
    adjustRowHeights(dataSheet, registros);
  }

  // Hoja "Estadisticas": se crea si se proporcionan estadísticas
  if (stats) {
    const statsSheet = (workbook as any).addSheet("Estadisticas");
    statsSheet.name("Estadisticas");

    // Título
    statsSheet
      .cell(1, 1)
      .value("Estadísticas de Conversión")
      .style({ bold: true, fill: "ffffff" });
    // Totales
    statsSheet.cell(3, 1).value("Total Procesados:");
    statsSheet.cell(3, 2).value(stats.totalProcesados).style({ fill: "ffffff" });
    statsSheet.cell(4, 1).value("Total Exitosos:");
    statsSheet.cell(4, 2).value(stats.totalExitosos).style({ fill: "C6EFCE" }); // Verde claro
    statsSheet.cell(5, 1).value("Total Fallidos:");
    statsSheet.cell(5, 2).value(stats.totalFallidos).style({ fill: "FFC7CE" }); // Rojo claro

    // Encabezado para archivos fallidos
    statsSheet
      .cell(7, 1)
      .value("Archivos Fallidos")
      .style({ bold: true, fill: "ffffff" });
    statsSheet.cell(8, 1).value("Nombre Archivo");
    statsSheet.cell(8, 2).value("Error");

    let row = 9;
    stats.fallidos.forEach((fallo) => {
      // Se elimina el HTML del error antes de escribirlo
      const cleanError = stripHtmlTags(fallo.error);
      statsSheet.cell(row, 1).value(fallo.fileName);
      statsSheet.cell(row, 2).value(cleanError);
      row++;
    });
  } else {
    logger.info("No se proporcionaron estadísticas, por lo que no se creará la hoja 'Estadisticas'.");
  }

  const finalFileName = sanitizarNombre(fileName);
  const encodedName = encodeURIComponent(
    finalFileName.endsWith(".xlsx") ? finalFileName : `${finalFileName}.xlsx`
  );
  const buffer = await workbook.outputAsync();
  return { buffer, encodedName };
}
