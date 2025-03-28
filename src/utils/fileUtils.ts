// src/utils/fileUtils.ts
import logger from "./logger";

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

export const MAX_SIZE = getMaxFileSize();

export function isValidPDF(file: File): boolean {
  const isPDFMime = file.type === "application/pdf";
  const isPDFExtension = file.name.toLowerCase().endsWith(".pdf");
  return (isPDFMime || isPDFExtension) && file.size <= MAX_SIZE;
}

export function validatePDFFiles(files: FileList): boolean {
  return Array.from(files).every((file) => isValidPDF(file));
}
