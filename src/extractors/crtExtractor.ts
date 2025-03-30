// src/extractors/crtExtractor.ts
import logger from "@/utils/logger";

export function extraerDatosCRT(text: string): Record<string, string> {
  const datos: Record<string, string> = {};

  const fechaMatch = text.match(/FECHA REVISIÓN:\s*(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})/i);
  if (fechaMatch) {
    datos["Fecha de Revisión"] = fechaMatch[1].trim();
  }
  const plantaMatch = text.match(/PLANTA:\s*([A-Z0-9-]+)/i);
  if (plantaMatch) {
    datos["Planta"] = plantaMatch[1].trim();
  }
  const placaMatch = text.match(/PLACA PATENTE\s+([A-Z0-9]+)/i);
  if (placaMatch) {
    datos["Placa Patente"] = placaMatch[1].trim();
  }
  let validoMatch = text.match(/VÁLIDO HASTA\s*(?:FECHA REVISIÓN:.*?)([A-Z]+\s+\d{4})/i);
  if (!validoMatch) {
    validoMatch = text.match(/VÁLIDO HASTA\s*:?\s*([A-Z]+\s+\d{4})/i);
  }
  if (validoMatch) {
    datos["Válido Hasta"] = validoMatch[1].trim();
  }

  return datos;
}

export function bestEffortValidationCRT(datos: Record<string, string>, fileName: string): void {
  const expectedPatterns: Record<string, RegExp> = {
    "Fecha de Revisión": /^\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/,
    "Placa Patente": /^[A-Z0-9]+$/,
    "Válido Hasta": /^[A-Z\s]+[0-9]{4}$/i,
    "Planta": /^.+$/,
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
