// src/utils/excelUtils.ts

import XlsxPopulate, { Sheet } from "xlsx-populate";

// --- Constantes de configuración ---
const COLUMN_WIDTH_FACTOR = 1.2;  // Factor para el cálculo automático del ancho
const MIN_COLUMN_WIDTH = 10;     // Ancho mínimo de columna
const BASE_ROW_HEIGHT = 15;      // Altura base de cada fila en puntos
const WRAP_TEXT_FACTOR = 1.0;    // Factor para estimar cuántos caracteres caben en una línea

/**
 * Ajusta el ancho de las columnas según la longitud máxima de los datos.
 */
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

/**
 * Ajusta la altura de las filas para la columna "Estado" cuando wrapText está activo.
 */
function adjustRowHeightsForWrapText(
  sheet: Sheet,
  registros: Record<string, string>[],
  estadoColIndex: number
): void {
  // Activa el ajuste de texto en la columna "Estado".
  sheet.column(estadoColIndex).style("wrapText", true);

  // Obtenemos el ancho calculado de la columna (en "caracteres" aproximados de Excel).
  const colWidth = sheet.column(estadoColIndex).width();

  // Para cada fila con datos (comienza en la fila 2 hasta la última).
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
 * - Ajusta el ancho de las columnas según la longitud del contenido.
 * - En la columna "Estado", habilita wrapText y ajusta la altura de las filas de forma flexible.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string
): Promise<{ buffer: Buffer; encodedName: string }> {
  if (registros.length === 0) {
    throw new Error("No hay registros para generar el Excel.");
  }

  // Obtiene los encabezados desde el primer registro.
  const encabezados = Object.keys(registros[0]);

  // Crea un libro de Excel en blanco.
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  // Escribe los encabezados en la primera fila.
  encabezados.forEach((header, colIndex) => {
    sheet.cell(1, colIndex + 1).value(header);
  });

  // Escribe cada registro en las filas siguientes.
  registros.forEach((registro, rowIndex) => {
    encabezados.forEach((header, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(registro[header] || "");
    });
  });

  // Ajuste de anchos de columna.
  setColumnWidths(sheet, encabezados, registros);

  // Ajuste de altura de filas para la columna "Estado".
  const estadoIndex = encabezados.findIndex((header) => header === "Estado");
  if (estadoIndex !== -1) {
    adjustRowHeightsForWrapText(sheet, registros, estadoIndex + 1);
  }

  // Prepara el nombre del archivo con codificación segura.
  const encodedName = encodeURIComponent(
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );

  // Genera el buffer final.
  const buffer = await workbook.outputAsync();
  return { buffer, encodedName };
}
