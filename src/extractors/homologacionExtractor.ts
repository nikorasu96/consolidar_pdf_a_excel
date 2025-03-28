// src/extractors/homologacionExtractor.ts
import { buscar } from "@/utils/pdfUtils";
import logger from "@/utils/logger";

export function extraerDatosHomologacion(text: string): Record<string, string> {
  return {
    "Fecha de Emisión": buscar(text, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/i) || "",
    "Nº Correlativo": buscar(text, /N[°º]\s*CORRELATIVO\s+([A-Z0-9\-]+)/i) || "",
    "Código Informe Técnico": buscar(text, /CÓDIGO DE INFORME TÉCNICO\s+([A-Z0-9\-]+)/i) || "",
    "Patente": buscar(text, /PATENTE\s+([A-Z0-9\-]+)/i) || "",
    "Válido Hasta": buscar(text, /VÁLIDO HASTA\s+([0-9A-Z\/]+)/i) || "",
    "Tipo de Vehículo": buscar(text, /TIPO DE VEHÍCULO\s+([A-ZÑ]+)/i) || "",
    "Marca": buscar(text, /MARCA\s+([A-Z]+)/i) || "",
    "Año": buscar(text, /AÑO\s+([0-9]{4})/i) || "",
    "Modelo": buscar(text, /MODELO\s+(.+?)[ \t]+COLOR/i) || "",
    "Color": buscar(text, /COLOR\s+([A-Z\s\(\)0-9\.\-]+?)(?=\s+VIN\b|$)/i) || "",
    "VIN": buscar(text, /VIN\s+([A-Z0-9]+)/i) || "",
    "Nº Motor": ((): string => {
      let motor = buscar(text, /N[°º]\s*MOTOR\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i) || "";
      return motor.replace(/\s+(C|El)$/i, "").trim();
    })(),
    "Firmado por": ((): string => {
      let firmado = buscar(text, /Firmado por:\s+(.+?)(?=\s+AUDITORÍA|\r?\n|$)/i) || "";
      return firmado.split(/\d{2}\/\d{2}\/\d{4}/)[0].trim();
    })(),
  };
}

export function bestEffortValidationHomologacion(datos: Record<string, string>, fileName: string): void {
  const expectedPatterns: Record<string, RegExp> = {
    "Fecha de Emisión": /^\d{1,2}\/[A-Z]{3}\/\d{4}$/,
    "Nº Correlativo": /^[A-Z0-9\-]+$/,
    "Código Informe Técnico": /^[A-Z0-9\-]+$/,
    "Patente": /^[A-Z0-9\-]+$/,
    "Válido Hasta": /^[A-Z]{3}\/\d{4}$/,
    "Tipo de Vehículo": /^[A-ZÑ]+$/,
    "Marca": /^[A-Z]+$/,
    "Año": /^\d{4}$/,
    "Modelo": /^.+$/,
    "Color": /^[A-Z\s\(\)0-9\.\-]+\.?$/,
    "VIN": /^[A-Z0-9]+$/,
    "Nº Motor": /^[A-Z0-9 ]+(?:\s*[A-Za-z]+)?$/,
    "Firmado por": /^.+$/,
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
    logger.warn(
      `BEST-EFFORT: El archivo ${fileName} presenta problemas en los datos:\n - ${warnings.join("\n - ")}`
    );
  }
}
