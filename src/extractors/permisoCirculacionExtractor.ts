// src/extractors/permisoCirculacionExtractor.ts
import { buscar } from "@/utils/pdfUtils";
import logger from "@/utils/logger";

/**
 * Extrae los datos del Permiso de Circulación desde el texto extraído del PDF.
 * Retorna un objeto con:
 *   - data: los datos extraídos (Record<string, string>)
 *   - regexes: las expresiones regulares utilizadas para cada campo (Record<string, RegExp>)
 */
export function extraerDatosPermisoCirculacion(text: string): { data: Record<string, string>; regexes: Record<string, RegExp> } {
  // Unificamos los saltos de línea para facilitar la búsqueda
  const t = text.replace(/\r?\n|\r/g, " ");

  const regexes: Record<string, RegExp> = {
    // Placa Única: captura secuencia de letras, números y guiones
    "Placa Única": /Placa\s+Única\s*[:\-]?\s*([A-Z0-9\-]+)/i,
    // Código SII: captura secuencia de letras y números
    "Código SII": /Codigo\s+SII\s*[:\-]?\s*([A-Z0-9]+)/i,
    // Valor Permiso: captura dígitos
    "Valor Permiso": /Valor\s+Permiso\s*[:\-]?\s*(\d+)/i,
    // Pago total: captura "X" si se marca; de lo contrario, queda vacío
    "Pago total": /Pago\s+total\s*[:\-]?\s*(X)?/i,
    // Pago Cuota 1: captura "X" si se marca
    "Pago Cuota 1": /Pago\s+cuota\s+1\s*[:\-]?\s*(X)?/i,
    // Pago Cuota 2: captura "X" si se marca
    "Pago Cuota 2": /Pago\s+cuota\s+2\s*[:\-]?\s*(X)?/i,
    // Total a pagar: captura dígitos
    "Total a pagar": /Total\s+a\s+pagar\s*[:\-]?\s*(\d+)/i,
    // Fecha de emisión: formato dd/mm/yyyy
    "Fecha de emisión": /Fecha\s+emisi[oó]n\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
    // Fecha de vencimiento: formato dd/mm/yyyy
    "Fecha de vencimiento": /Fecha\s+Vencimiento\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
    // Forma de Pago: se capturan caracteres alfanuméricos (una palabra)
    "Forma de Pago": /Forma\s+de\s+Pago\s*[:\-]?\s*(\w+)/i,
  };

  const data: Record<string, string> = {};
  for (const key in regexes) {
    data[key] = buscar(t, regexes[key]) || "";
  }

  // Normalización: para cualquier campo que resulte en cadena vacía,
  // asignamos "No aplica"
  for (const key in data) {
    if (data[key].trim() === "") {
      data[key] = "No aplica";
    }
  }

  logger.debug("Datos extraídos Permiso de Circulación:", data);
  return { data, regexes };
}

/**
 * Validación "best-effort" para Permiso de Circulación.
 * Si el valor es "No aplica", se considera válido; de lo contrario,
 * se valida contra el patrón esperado.
 */
export function bestEffortValidationPermisoCirculacion(datos: Record<string, string>, fileName: string): void {
  const expectedPatterns: Record<string, RegExp> = {
    "Placa Única": /^[A-Z0-9\-]+$/i,
    "Código SII": /^[A-Z0-9]+$/i,
    "Valor Permiso": /^\d+$/i,
    "Pago total": /^(X|No aplica)$/i,
    "Pago Cuota 1": /^(X|No aplica)$/i,
    "Pago Cuota 2": /^(X|No aplica)$/i,
    "Total a pagar": /^\d+$/i,
    "Fecha de emisión": /^(\d{2}\/\d{2}\/\d{4}|No aplica)$/i,
    "Fecha de vencimiento": /^(\d{2}\/\d{2}\/\d{4}|No aplica)$/i,
    "Forma de Pago": /^(\w+|No aplica)$/i,
  };

  const warnings: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    // Si el valor es "No aplica", lo consideramos válido
    if (value === "No aplica") continue;
    if (!pattern.test(value)) {
      warnings.push(`Campo "${field}" con valor "${value}" no es válido.`);
    }
  }

  if (warnings.length > 0) {
    logger.warn(
      `BEST-EFFORT: El archivo ${fileName} presenta problemas:\n - ${warnings.join("\n - ")}`
    );
  }
}
