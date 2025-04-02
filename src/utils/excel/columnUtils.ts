// src/utils/excel/columnUtils.ts
const COLUMN_WIDTH_FACTOR = 1.2;
const MIN_COLUMN_WIDTH = 10;

/**
 * Ajusta el ancho de las columnas en función del contenido.
 * @param sheet La hoja de Excel.
 * @param headers Arreglo de encabezados.
 * @param registros Arreglo de registros (cada registro es un objeto).
 */
export function setColumnWidths(
  sheet: any,
  headers: string[],
  registros: Record<string, string>[]
): void {
  headers.forEach((header, colIndex) => {
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
