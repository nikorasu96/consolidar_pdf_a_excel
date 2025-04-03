import { buscar } from "@/utils/pdf/pdfUtils";
import logger from "@/utils/logger";

/**
 * Función de extracción "simplificada" para SOAP.
 * Se han ajustado las expresiones regulares para permitir espacios, puntos y guiones opcionales
 * en campos críticos como INSCRIPCION R.V.M y RUT.
 */
export function extraerDatosSoapSimplificado(text: string): Record<string, string> {
  // Normalizamos saltos de línea
  const t = text.replace(/\r?\n|\r/g, " ");

  // INSCRIPCION R.V.M:
  // Ejemplo esperado: "TWGV11 - 7" (se permite espacio alrededor del guion)
  const inscripcionRegex = /INSCRIPC[ÍI]ON\s*R\s*\.?\s*V\s*\.?\s*M\s*\.?\s*(?::|\-)?\s*([A-Z0-9]+\s*-\s*[A-Z0-9]+)/i;
  const inscripcion = (buscar(t, inscripcionRegex) || "").trim();

  // Bajo el código
  const bajoCodigo = (buscar(t, /Bajo\s+el\s+c[óo]digo\s*[:\-]?\s*([A-Z0-9\-]+)/i) || "").trim();

  // RUT:
  // Captura números con o sin puntos, seguidos de guion y dígito o k/K.
  const rutRegex = /RUT\s*[:\-]?\s*((?:\d{1,3}(?:\.\d{3})+)|\d{7,8})\s*[-]\s*([0-9kK])/i;
  const rutMatch = t.match(rutRegex);
  const rut = rutMatch ? `${rutMatch[1].replace(/[.\s]/g, "")}-${rutMatch[2]}` : "";

  // Fecha de inicio del seguro
  const rigeDesde = (buscar(t, /RIGE\s+DESDE\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i) || "").trim();

  // Fecha de finalización del seguro
  const hasta = (buscar(t, /HAST(?:\s*A)?\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i) || "").trim();

  // Número de póliza
  const poliza = (buscar(t, /POLI[ZS]A\s*N[°º]?\s*[:\-]?\s*([A-Z0-9\-]+)/i) || "").trim();

  // Prima del seguro
  const prima = (buscar(t, /PRIMA\s*[:\-]?\s*([\d\.]+)/i) || "").trim();

  const data: Record<string, string> = {
    "INSCRIPCION R.V.M": inscripcion,
    "Bajo el codigo": bajoCodigo,
    "RUT": rut,
    "RIGE DESDE": rigeDesde,
    "HASTA": hasta,
    "POLIZA N°": poliza,
    "PRIMA": prima,
  };

  logger.debug("Datos extraídos SOAP Simplificado (flexible):", data);
  return data;
}

/**
 * Validación "best-effort" para SOAP: Se exige que cada campo obligatorio tenga al menos 3 caracteres (tras trim)
 * y que cumpla con el patrón esperado.
 * En particular, para "INSCRIPCION R.V.M" se requiere que tenga al menos 6 caracteres antes del guion (con o sin espacios)
 * y un dígito verificador después.
 * Si algún campo falla, se lanza un error.
 */
export function bestEffortValidationSoap(datos: Record<string, string>, fileName: string): void {
  const expectedPatterns: Record<string, RegExp> = {
    // Se exige que la inscripción R.V.M tenga al menos 6 caracteres alfanuméricos antes del guion,
    // espacios opcionales y luego un guion seguido de un único carácter.
    "INSCRIPCION R.V.M": /^[A-Z0-9]{6,}\s*-\s*[A-Z0-9]$/i,
    "Bajo el codigo": /^[A-Z0-9\-]+$/,
    "RUT": /^(?:\d{7,8}|(?:\d{1,3}(?:\.\d{3})+))-[0-9kK]$/,
    "RIGE DESDE": /^\d{2}[-/]\d{2}[-/]\d{4}$/,
    "HASTA": /^\d{2}[-/]\d{2}[-/]\d{4}$/,
    "POLIZA N°": /^[A-Z0-9\-]+$/,
    "PRIMA": /^[\d\.]+$/,
  };

  const errors: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    if (!value || value.trim().length < 3) {
      errors.push(`El campo "${field}" está incompleto (menos de 3 caracteres).`);
    } else if (!pattern.test(value)) {
      errors.push(`El campo "${field}" con valor "${value}" no coincide con el formato esperado.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`El archivo ${fileName} presenta problemas en los datos:\n - ${errors.join("\n - ")}`);
  }
}
