// src/utils/excelUtils.ts

import XlsxPopulate from "xlsx-populate";

/**
 * Función para generar un archivo Excel a partir de un arreglo de registros.
 * Escribe los encabezados y cada registro en celdas correspondientes y ajusta el ancho de las columnas.
 *
 * @param registros - Array de objetos donde cada objeto representa una fila de datos.
 * @param fileName - Nombre base para el archivo Excel.
 * @returns Objeto con el buffer del archivo Excel y el nombre del archivo codificado.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string
): Promise<{ buffer: Buffer; encodedName: string }> {
  if (registros.length === 0) {
    throw new Error("No hay registros para generar el Excel.");
  }
  // Se obtienen los encabezados a partir de las claves del primer registro.
  const encabezados = Object.keys(registros[0]);

  // Se crea un libro de Excel en blanco.
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  // Escribir los encabezados en la primera fila.
  encabezados.forEach((header, col) => {
    sheet.cell(1, col + 1).value(header);
  });

  // Escribir cada registro en las filas siguientes.
  registros.forEach((registro, rowIndex) => {
    encabezados.forEach((header, col) => {
      sheet.cell(rowIndex + 2, col + 1).value(registro[header] || "");
    });
  });

  // Ajusta el ancho de las columnas en base a la longitud del contenido.
  const factor = 1.2;
  encabezados.forEach((header, colIndex) => {
    let maxLength = header.length;
    registros.forEach((registro) => {
      const valor = registro[header] ? registro[header].toString() : "";
      if (valor.length > maxLength) {
        maxLength = valor.length;
      }
    });
    const width = Math.max(maxLength * factor, 10);
    sheet.column(colIndex + 1).width(width);
  });

  // Se codifica el nombre del archivo y se genera el buffer final.
  const encodedName = encodeURIComponent(
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );
  const buffer = await workbook.outputAsync();

  return { buffer, encodedName };
}
