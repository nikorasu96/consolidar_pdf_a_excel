// src/utils/excelUtils.ts

import XlsxPopulate, { Sheet } from "xlsx-populate";

const COLUMN_WIDTH_FACTOR = 1.2;
const MIN_COLUMN_WIDTH = 10;
const BASE_ROW_HEIGHT = 15;
const WRAP_TEXT_FACTOR = 1.0;

function setColumnWidths(
  sheet: Sheet,
  encabezados: string[],
  registros: Record<string, string>[]
): void {
  encabezados.forEach((header, colIndex) => {
    let maxLength = header.length;
    registros.forEach((registro) => {
      const valor = registro[header] ? registro[header].toString() : "";
      if (valor.length > maxLength) {
        maxLength = valor.length;
      }
    });
    const width = Math.max(maxLength * COLUMN_WIDTH_FACTOR, MIN_COLUMN_WIDTH);
    sheet.column(colIndex + 1).width(width);
  });
}

function adjustRowHeightsForWrapText(
  sheet: Sheet,
  registros: Record<string, string>[],
  estadoColIndex: number
): void {
  sheet.column(estadoColIndex).style("wrapText", true);
  const colWidth = sheet.column(estadoColIndex).width();
  for (let row = 2; row <= registros.length + 1; row++) {
    const cellValue = sheet.cell(row, estadoColIndex).value();
    if (typeof cellValue === "string") {
      const textLength = cellValue.length;
      const approximateCharsPerLine = colWidth * WRAP_TEXT_FACTOR;
      const lineCount = Math.max(1, Math.ceil(textLength / approximateCharsPerLine));
      sheet.row(row).height(BASE_ROW_HEIGHT * lineCount);
    }
  }
}

/**
 * Genera un archivo Excel a partir de un arreglo de registros.
 * Si no hay registros, se lanza un error con un mensaje más claro.
 * Se añade un parámetro pdfFormat para personalizar el mensaje según el botón.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string,
  pdfFormat?: string
): Promise<{ buffer: Buffer; encodedName: string }> {
  // Si no hay registros, lanzamos un error diferenciado según el pdfFormat
  if (registros.length === 0) {
    let errorMsg = "No se encontraron datos para generar el Excel. Verifica que los PDFs correspondan al formato seleccionado.";
    if (pdfFormat === "CERTIFICADO_DE_HOMOLOGACION") {
      errorMsg = "No se encontraron datos para generar el Excel. Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
    } else if (pdfFormat === "CRT") {
      errorMsg = "No se encontraron datos para generar el Excel. Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
    }
    throw new Error(errorMsg);
  }

  const encabezados = Object.keys(registros[0]);
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  // Encabezados en la primera fila
  encabezados.forEach((header, colIndex) => {
    sheet.cell(1, colIndex + 1).value(header);
  });

  // Escribimos los registros
  registros.forEach((registro, rowIndex) => {
    encabezados.forEach((header, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(registro[header] || "");
    });
  });

  // Ajuste de anchos
  setColumnWidths(sheet, encabezados, registros);

  // Ajuste de altura si existe la columna "Estado"
  const estadoIndex = encabezados.findIndex((header) => header === "Estado");
  if (estadoIndex !== -1) {
    adjustRowHeightsForWrapText(sheet, registros, estadoIndex + 1);
  }

  const encodedName = encodeURIComponent(
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );

  const buffer = await workbook.outputAsync();
  return { buffer, encodedName };
}
