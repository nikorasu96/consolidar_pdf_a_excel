// src/utils/pdf/fileUtils.ts
import logger from "../logger";

/**
 * Obtiene el tamaño máximo permitido para un PDF (por defecto 5MB).
 * Si NEXT_PUBLIC_MAX_FILE_SIZE está definido y es válido, se usa ese valor.
 */
function getMaxFileSize(): number {
  const defaultSize = 5 * 1024 * 1024; // 5MB
  const envValue = process.env.NEXT_PUBLIC_MAX_FILE_SIZE;
  if (!envValue) {
    logger.warn("NEXT_PUBLIC_MAX_FILE_SIZE no está definida. Usando 5MB por defecto.");
    return defaultSize;
  }
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultSize : parsed;
}

export const MAX_SIZE = getMaxFileSize();

/**
 * Valida que el archivo sea un PDF mediante el MIME type y la extensión, y que no supere el tamaño máximo.
 */
export function isValidPDF(file: File): boolean {
  const isPDFMime = file.type === "application/pdf";
  const isPDFExtension = file.name.toLowerCase().endsWith(".pdf");
  return (isPDFMime || isPDFExtension) && file.size <= MAX_SIZE;
}

/**
 * Verifica que el contenido del archivo PDF comience con "%PDF-".
 */
export async function isPDFContentValid(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const header = new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer.slice(0, 5)));
    return header === "%PDF-";
  } catch (error) {
    logger.warn("Error validando contenido PDF:", error);
    return false;
  }
}

/**
 * Valida un FileList para asegurarse de que todos los archivos sean PDFs válidos.
 */
export function validatePDFFiles(files: FileList): boolean {
  return Array.from(files).every((file) => isValidPDF(file));
}
