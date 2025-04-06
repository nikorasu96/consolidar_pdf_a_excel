import { buscar } from "@/utils/pdf/pdfUtils";

export function extraerDatosHomologacion(text: string): Record<string, string> {
  return {
    "Fecha de Emisión": buscar(text, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/i) || "",
    "Nº Correlativo": buscar(text, /N[°º]\s*CORRELATIVO\s+([A-Z0-9\-]+)/i) || "",
    "Código Informe Técnico": buscar(text, /CÓDIGO DE INFORME TÉCNICO\s+([A-Z0-9\-]+)/i) || "",
    "Patente": ((): string => {
      const value = buscar(text, /PATENTE\s+([A-Z0-9\-]+)/i) || "";
      // Se eliminan guiones y espacios (todos) para obtener la cadena continua.
      const cleaned = value.replace(/-/g, "").replace(/\s/g, "").trim();
      // Si la cadena es mayor a 6 caracteres, se toman solo los primeros 6.
      return cleaned.length > 6 ? cleaned.substring(0, 6) : cleaned;
    })(),
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
    // Ahora "Patente" debe ser exactamente 6 caracteres alfanuméricos (sin guiones ni espacios)
    "Patente": /^[A-Z0-9]{6}$/i,
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

  const errors: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    if (!value) {
      errors.push(`Falta el campo "${field}".`);
    } else if (!pattern.test(value.trim())) {
      errors.push(`Campo "${field}" con valor "${value}" no coincide con el formato esperado.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`El archivo ${fileName} presenta problemas en los datos:\n - ${errors.join("\n - ")}`);
  }
}
