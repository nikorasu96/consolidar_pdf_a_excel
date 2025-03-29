// src/utils/fileUtils.ts

import logger from "./logger";

/**
 * Obtiene el tamaño máximo permitido para los archivos. 
 * Si la variable de entorno no está definida o es inválida, se usa 5MB por defecto.
 */
function getMaxFileSize(): number {
  const defaultSize = 5 * 1024 * 1024; // 5MB
  const envValue = process.env.NEXT_PUBLIC_MAX_FILE_SIZE;
  if (!envValue) {
    logger.warn("NEXT_PUBLIC_MAX_FILE_SIZE no está definida. Usando 5MB por defecto.");
    return defaultSize;
  }
  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    logger.warn(`Valor de NEXT_PUBLIC_MAX_FILE_SIZE inválido: "${envValue}". Usando 5MB por defecto.`);
    return defaultSize;
  }
  return parsed;
}

/**
 * Tamaño máximo permitido para un PDF (por defecto, 5MB).
 * Si configuras NEXT_PUBLIC_MAX_FILE_SIZE en .env.local, se usará ese valor.
 */
export const MAX_SIZE = getMaxFileSize();

/**
 * Verifica si un archivo tiene tipo MIME y/o extensión de PDF
 * y además no excede el tamaño máximo permitido.
 */
export function isValidPDF(file: File): boolean {
  const isPDFMime = file.type === "application/pdf";
  const isPDFExtension = file.name.toLowerCase().endsWith(".pdf");
  return (isPDFMime || isPDFExtension) && file.size <= MAX_SIZE;
}

/**
 * Verifica que el contenido de un archivo realmente comience con "%PDF-",
 * lo cual indica que es un PDF válido. Lee los primeros 5 bytes y los compara.
 */
export async function isPDFContentValid(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Leer los primeros 5 bytes y decodificarlos
    const header = new TextDecoder("utf-8").decode(
      new Uint8Array(arrayBuffer.slice(0, 5))
    );
    // Verificar que el encabezado sea "%PDF-"
    return header === "%PDF-";
  } catch (error) {
    logger.warn("Error validando contenido PDF:", error);
    return false;
  }
}

/**
 * Valida un conjunto de archivos para confirmar que todos sean PDFs válidos.
 * Retorna true solo si todos cumplen las condiciones de isValidPDF().
 */
export function validatePDFFiles(files: FileList): boolean {
  return Array.from(files).every((file) => isValidPDF(file));
}
