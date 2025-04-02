// src/utils/excel/rowUtils.ts
const BASE_ROW_HEIGHT = 15;
const WRAP_TEXT_FACTOR = 1.0;

/**
 * Ajusta la altura de las filas en función del contenido de la primera columna.
 * @param sheet La hoja de Excel.
 * @param registros Arreglo de registros.
 */
export function adjustRowHeights(
  sheet: any,
  registros: Record<string, string>[]
): void {
  registros.forEach((registro, rowIndex) => {
    const cellValue = sheet.cell(rowIndex + 2, 1).value();
    if (typeof cellValue === "string") {
      const textLength = cellValue.length;
      // Asumimos un promedio de 20 caracteres por línea; ajustar si es necesario.
      const approximateCharsPerLine = 20 * WRAP_TEXT_FACTOR;
      const lineCount = Math.max(1, Math.ceil(textLength / approximateCharsPerLine));
      sheet.row(rowIndex + 2).height(BASE_ROW_HEIGHT * lineCount);
    }
  });
}
