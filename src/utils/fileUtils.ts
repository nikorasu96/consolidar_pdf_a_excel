// src/utils/fileUtils.ts

// Se obtiene el tamaño máximo configurado (en bytes) desde la variable de entorno,
// o se utiliza 5MB por defecto.
export const MAX_SIZE = process.env.NEXT_PUBLIC_MAX_FILE_SIZE
  ? parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE)
  : 5 * 1024 * 1024; // 5MB

/**
 * Función que valida si un archivo es un PDF y si no excede el tamaño máximo permitido.
 * @param file - Archivo a validar.
 * @returns true si el archivo es PDF y su tamaño es válido; false en caso contrario.
 */
export function isValidPDF(file: File): boolean {
  return file.type === "application/pdf" && file.size <= MAX_SIZE;
}

/**
 * Función que valida un FileList de archivos PDF.
 * Recorre cada archivo y utiliza isValidPDF para verificar su validez.
 * @param files - Lista de archivos a validar.
 * @returns true si todos los archivos son PDF válidos; false si alguno no lo es.
 */
export function validatePDFFiles(files: FileList): boolean {
  for (let i = 0; i < files.length; i++) {
    if (!isValidPDF(files[i])) {
      return false;
    }
  }
  return true;
}
