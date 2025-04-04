import logger from "@/utils/logger";

export function extraerDatosCRT(text: string): Record<string, string> {
  const datos: Record<string, string> = {};

  // Extrae Fecha de Revisión (por ejemplo, "16 FEBRERO 2023")
  const fechaMatch = text.match(/FECHA REVISIÓN:\s*(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})/i);
  if (fechaMatch) {
    datos["Fecha de Revisión"] = fechaMatch[1].trim();
  }

  // Extrae Planta
  const plantaMatch = text.match(/PLANTA:\s*([A-Z0-9-]+)/i);
  if (plantaMatch) {
    datos["Planta"] = plantaMatch[1].trim();
  }

  // Extrae Placa Patente
  const placaMatch = text.match(/PLACA PATENTE\s+([A-Z0-9]+)/i);
  if (placaMatch) {
    datos["Placa Patente"] = placaMatch[1].trim();
  }

  /* 
    Nueva expresión regular para "Válido Hasta":
    - Primero busca "VÁLIDO HASTA"
    - Luego, opcionalmente, la parte "FECHA REVISIÓN:" y un día con fecha
    - Finalmente, captura la fecha que corresponde a "Válido Hasta" (por ejemplo, "MAYO 2024")
  */
  const validoMatch = text.match(/VÁLIDO HASTA(?:\s*FECHA REVISIÓN:)?\s*(?:(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})\s+)?([A-ZÁÉÍÓÚÑ]+\s+\d{4})/i);
  if (validoMatch) {
    // Si se capturó la segunda fecha (grupo 2), se usa esa; de lo contrario se utiliza el grupo 1 (si existe)
    datos["Válido Hasta"] = (validoMatch[2] || validoMatch[1] || "").trim();
  }

  return datos;
}

export function bestEffortValidationCRT(datos: Record<string, string>, fileName: string): void {
  const expectedPatterns: Record<string, RegExp> = {
    "Fecha de Revisión": /^\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/,
    "Placa Patente": /^[A-Z0-9]+$/,
    "Válido Hasta": /^[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/i,
    "Planta": /^.+$/,
  };

  const errors: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    if (!value) {
      errors.push(`Falta el campo "${field}".`);
    } else if (!pattern.test(value)) {
      errors.push(`Campo "${field}" con valor "${value}" no coincide con el formato esperado.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `El archivo ${fileName} presenta problemas en los datos:\n - ${errors.join("\n - ")}`
    );
  }
}
