// src/extractors/soapExtractor.ts

import { buscar } from "@/utils/pdfUtils";
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
  // Ejemplo: "INSCRIPCION R.V.M.: LXWJ75-4"
  const inscripcionRegex = /INSCRIPCION\s*R\s*\.?\s*V\s*\.?\s*M\s*\.?\s*:\s*([A-Z0-9\-]+)/i;
  const inscripcion = (buscar(t, inscripcionRegex) || "").trim();

  // Bajo el código
  const bajoCodigo = buscar(t, /Bajo\s+el\s+c[óo]digo\s*[:\-]?\s*([A-Z0-9\-]+)/i) || "";

  // RUT:
  // Permite capturar tanto números con puntos (ej.: "97.006.000") como sin ellos,
  // seguidos de guion y dígito o k/K. Luego se eliminan los puntos para dejar un formato
  // uniforme, por ejemplo: "97006000-6"
  const rutRegex = /RUT\s*[:\-]?\s*((?:\d{1,3}(?:\.\d{3})+)|\d{7,8})\s*[-]\s*([0-9kK])/i;
  const rutMatch = t.match(rutRegex);
  const rut = rutMatch ? `${rutMatch[1].replace(/[.\s]/g, "")}-${rutMatch[2]}` : "";

  // Fecha de inicio del seguro
  const rigeDesde = buscar(t, /RIGE\s+DESDE\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i) || "";

  // Fecha de finalización del seguro
  const hasta = buscar(t, /HAST(?:\s*A)?\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i) || "";

  // Número de póliza
  const poliza = buscar(t, /POLI[ZS]A\s*N[°º]?\s*[:\-]?\s*([A-Z0-9\-]+)/i) || "";

  // Prima del seguro
  const prima = buscar(t, /PRIMA\s*[:\-]?\s*([\d\.]+)/i) || "";

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
 * Función de extracción "alternativa" para SOAP.
 */
export function extraerDatosSoapAlternativo(text: string): Record<string, string> {
  const t = text.replace(/\r?\n|\r/g, " ");
  const inscripcion = (buscar(t, /INSCRIPCION\s*R\s*\.?\s*V\s*\.?\s*M\s*[:]\s*([A-Z0-9\-]+)/i) || "").trim();
  const bajoCodigo = buscar(t, /Bajo\s+el\s+c[óo]digo\s*:?\s*([A-Z0-9\-]+)/i) || "";
  
  const rutMatch = t.match(/RUT\s*:?\s*([\d]{1,3}(?:[.\s]*\d{3})+|\d{7,8})\s*[-]\s*([0-9kK])/i);
  const rut = rutMatch ? `${rutMatch[1].replace(/[.\s]/g, "")}-${rutMatch[2]}` : "";
  
  const rigeDesde = buscar(t, /RIGE\s+DESDE\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i) || "";
  const hasta = buscar(t, /HAST(?:\s*A)?\s*[:\-]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4}|[A-Z]+\s+\d{4})/i) ||
                buscar(t, /HASTA\s*[:\-]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i) || "";
  const poliza = buscar(t, /POLIZA\s*N[°º]?\s*:?\s*([A-Z0-9\-]+)/i) || "";
  const prima = buscar(t, /PRIMA\s*:?\s*([\d\.,]+)/i) || "";

  return {
    "INSCRIPCION R.V.M": inscripcion,
    "Bajo el codigo": bajoCodigo,
    "RUT": rut,
    "RIGE DESDE": rigeDesde,
    "HASTA": hasta,
    "POLIZA N°": poliza,
    "PRIMA": prima,
  };
}

/**
 * Validación "best-effort" para SOAP: Comprueba que los campos extraídos cumplan con patrones básicos.
 */
export function bestEffortValidationSoap(datos: Record<string, string>, fileName: string): void {
  // Se definen los patrones esperados para cada campo
  const expectedPatterns: Record<string, RegExp> = {
    "INSCRIPCION R.V.M": /^[A-Z0-9]+(?:[-][A-Z0-9]+)*$/,
    "Bajo el codigo": /^[A-Z0-9\-]+$/,
    // RUT: acepta tanto 7 u 8 dígitos sin puntos como el formato con puntos (ej.: 97.006.000-6)
    "RUT": /^(?:\d{7,8}|(?:\d{1,3}(?:\.\d{3})+))-[0-9kK]$/,
    "RIGE DESDE": /^\d{2}[-/]\d{2}[-/]\d{4}$/,
    "HASTA": /^\d{2}[-/]\d{2}[-/]\d{4}$/,
    "POLIZA N°": /^[A-Z0-9\-]+$/,
    "PRIMA": /^[\d\.]+$/,
  };

  const warnings: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    if (!value) {
      warnings.push(`Falta el campo "${field}".`);
    } else if (!pattern.test(value)) {
      warnings.push(`Campo "${field}" con valor "${value}" no coincide con el formato esperado.`);
    }
  }

  if (warnings.length > 0) {
    logger.warn(`BEST-EFFORT: El archivo ${fileName} presenta problemas en los datos:\n - ${warnings.join("\n - ")}`);
  }
}
