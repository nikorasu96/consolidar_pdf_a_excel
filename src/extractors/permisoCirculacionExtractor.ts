import { buscar } from "@/utils/pdf/pdfUtils";
import logger from "@/utils/logger";

/**
 * Extrae los datos del Permiso de Circulación desde el texto extraído del PDF.
 * Retorna un objeto con:
 *   - data: los datos extraídos (Record<string, string>)
 *   - regexes: las expresiones regulares utilizadas para cada campo (Record<string, RegExp>)
 */
export function extraerDatosPermisoCirculacion(text: string): { data: Record<string, string>; regexes: Record<string, RegExp> } {
  // Unificar saltos de línea
  const t = text.replace(/\r?\n|\r/g, " ");

  const regexes: Record<string, RegExp> = {
    // Placa Única: secuencia de letras, números y guiones
    "Placa Única": /Placa\s+Única\s*[:\-]?\s*([A-Z0-9\-]+)/i,
    // Código SII: secuencia de letras y números
    "Código SII": /Codigo\s+SII\s*[:\-]?\s*([A-Z0-9]+)/i,
    // Valor Permiso: dígitos
    "Valor Permiso": /Valor\s+Permiso\s*[:\-]?\s*(\d+)/i,
    // Pago total: captura "X" si se marca, de lo contrario queda vacío
    "Pago total": /Pago\s+total\s*[:\-]?\s*(X)?/i,
    // Pago Cuota 1: captura "X" si se marca
    "Pago Cuota 1": /Pago\s+cuota\s+1\s*[:\-]?\s*(X)?/i,
    // Pago Cuota 2: captura "X" si se marca
    "Pago Cuota 2": /Pago\s+cuota\s+2\s*[:\-]?\s*(X)?/i,
    // Total a pagar: dígitos
    "Total a pagar": /Total\s+a\s+pagar\s*[:\-]?\s*(\d+)/i,
    // Fecha de emisión: admite "Fecha de emisión:" o "Fecha emisión:" en formato dd/mm/yyyy
    "Fecha de emisión": /Fecha(?:\s+de)?\s+emisi[oó]n\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
    // Fecha de vencimiento: admite "Fecha de vencimiento:" o "Fecha vencimiento:" en formato dd/mm/yyyy
    "Fecha de vencimiento": /Fecha(?:\s+de)?\s+vencimiento\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
    // Forma de Pago: captura una palabra (alfanumérica)
    "Forma de Pago": /Forma\s+de\s+Pago\s*[:\-]?\s*(\w+)/i,
  };

  const data: Record<string, string> = {};
  for (const key in regexes) {
    data[key] = buscar(t, regexes[key]) || "";
  }

  // Normalización:
  // Si un campo está vacío:
  // - Para "Pago total", "Pago Cuota 1" y "Pago Cuota 2" se asigna "No aplica"
  // - Para los demás se deja como cadena vacía ("")
  for (const key in data) {
    if (data[key].trim() === "") {
      if (["Pago total", "Pago Cuota 1", "Pago Cuota 2"].includes(key)) {
        data[key] = "No aplica";
      } else {
        data[key] = "";
      }
    }
  }

  logger.debug("Datos extraídos Permiso de Circulación:", data);
  return { data, regexes };
}

/**
 * Validación "best-effort" para Permiso de Circulación, adaptada para que, si algún campo obligatorio
 * (exceptuando las validaciones especiales de pago, que se mantienen) no cumple, se lance un error.
 *
 * - Para campos obligatorios (Placa Única, Código SII, Valor Permiso, Total a pagar, Fecha de emisión, Fecha de vencimiento, Forma de Pago)
 *   se requiere que tengan al menos 3 caracteres.
 * - Los campos de pago ("Pago total", "Pago Cuota 1", "Pago Cuota 2") se validan contra su patrón.
 */
export function bestEffortValidationPermisoCirculacion(datos: Record<string, string>, fileName: string): void {
  const errors: string[] = [];

  // Validar campos obligatorios (no de pago)
  const obligatorios = ["Placa Única", "Código SII", "Valor Permiso", "Total a pagar", "Fecha de emisión", "Fecha de vencimiento", "Forma de Pago"];
  for (const field of obligatorios) {
    const value = datos[field];
    if (!value || value.trim().length < 3) {
      errors.push(`Campo "${field}" es obligatorio y debe tener al menos 3 caracteres.`);
    }
  }

  // Validar campos de pago (manteniendo la lógica especial)
  const pagos = ["Pago total", "Pago Cuota 1", "Pago Cuota 2"];
  const pagosPattern: Record<string, RegExp> = {
    "Pago total": /^(X|No aplica)$/i,
    "Pago Cuota 1": /^(X|No aplica)$/i,
    "Pago Cuota 2": /^(X|No aplica)$/i,
  };
  for (const field of pagos) {
    const value = datos[field];
    if (!pagosPattern[field].test(value)) {
      errors.push(`Campo "${field}" con valor "${value}" no es válido.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`El archivo ${fileName} presenta problemas:\n - ${errors.join("\n - ")}`);
  }
}
