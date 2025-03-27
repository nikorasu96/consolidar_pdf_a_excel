// src/utils/fileUtils.ts

/**
 * Obtiene el tamaño máximo de archivo permitido desde la variable de entorno.
 * Valida que sea un número y, en caso contrario, utiliza un valor por defecto (5 MB).
 */
function getMaxFileSize(): number {
  const defaultSize = 5 * 1024 * 1024; // 5 MB
  const envValue = process.env.NEXT_PUBLIC_MAX_FILE_SIZE;

  if (!envValue) {
    console.warn("NEXT_PUBLIC_MAX_FILE_SIZE no está definida. Usando 5MB por defecto.");
    return defaultSize;
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Valor de NEXT_PUBLIC_MAX_FILE_SIZE inválido: "${envValue}". Usando 5MB por defecto.`);
    return defaultSize;
  }

  return parsed;
}

// Asigna el tamaño máximo (en bytes) obtenido o 5MB por defecto si es inválido.
export const MAX_SIZE = getMaxFileSize();

/**
 * Función que valida si un archivo es un PDF y no excede el tamaño máximo permitido.
 * Además de validar el tipo MIME, se valida la extensión del archivo como respaldo.
 * @param file - Archivo a validar.
 * @returns true si el archivo es un PDF válido y su tamaño es aceptable; false en caso contrario.
 */
export function isValidPDF(file: File): boolean {
  // Validamos el tipo MIME y la extensión del archivo (.pdf, ignorando mayúsculas)
  const isPDFMime = file.type === "application/pdf";
  const isPDFExtension = file.name.toLowerCase().endsWith(".pdf");
  return (isPDFMime || isPDFExtension) && file.size <= MAX_SIZE;
}

/**
 * Función que valida un FileList de archivos PDF.
 * Verifica cada archivo usando isValidPDF.
 * @param files - Lista de archivos a validar.
 * @returns true si todos los archivos son PDF válidos; false si alguno no lo es.
 */
export function validatePDFFiles(files: FileList): boolean {
  return Array.from(files).every((file) => isValidPDF(file));
}
