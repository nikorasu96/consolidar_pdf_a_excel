import PDFParser from "pdf2json";
import logger from "./logger";
import type { PDFFormat } from "@/../../types/pdfFormat";

/**
 * Tipos básicos para pdf2json.
 */
interface PDFText {
  R: { T: string }[];
}
interface PDFPage {
  Texts: PDFText[];
}
export interface PDFData {
  formImage?: {
    Pages: PDFPage[];
  };
  Pages?: PDFPage[];
}

/**
 * Decodifica un string de forma segura.
 */
function safeDecodeURIComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    logger.error("Error decodificando cadena:", encoded, error);
    return encoded;
  }
}

/**
 * Parsea el PDF usando pdf2json y retorna:
 *  - pdfData: objeto interno
 *  - allText: texto concatenado extraído de las páginas
 */
export async function parsePDFBuffer(
  file: File
): Promise<{ pdfData: PDFData; allText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfData: PDFData = await new Promise<PDFData>((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) => {
      logger.error("Error en pdfParser_dataError:", errData);
      reject(new Error("Error al parsear el PDF: " + errData.parserError));
    });
    pdfParser.on("pdfParser_dataReady", (data: PDFData) => resolve(data));
    pdfParser.parseBuffer(buffer);
  });

  logger.debug("Estructura de pdfData:", Object.keys(pdfData));

  let allText = "";
  const extractTextFromPages = (pages: PDFPage[]): string => {
    return pages
      .map((page) =>
        page.Texts
          .map((t) => {
            if (!t.R || t.R.length === 0 || !t.R[0]?.T) return "";
            return safeDecodeURIComponent(t.R[0].T);
          })
          .join(" ")
      )
      .join(" ");
  };

  if (pdfData.formImage && pdfData.formImage.Pages) {
    allText = extractTextFromPages(pdfData.formImage.Pages);
  } else if (pdfData.Pages) {
    allText = extractTextFromPages(pdfData.Pages);
  } else if ((pdfData as any)["RawText"]) {
    allText = (pdfData as any)["RawText"];
  }

  if (!allText.trim()) {
    throw new Error("El PDF no contiene texto extraíble o el formato no es válido");
  }

  logger.debug("Texto extraído (allText):", allText);

  return { pdfData, allText };
}

/**
 * Retorna el primer grupo de la expresión 'pattern', o null si no hay coincidencia.
 */
export function buscar(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Función para extraer datos del formato de Homologación.
 * Se ajustan los campos "Firmado por" y "Nº Motor" para limpiar datos adicionales,
 * y se actualiza la extracción del "Color" para que no incluya información extra.
 */
export function extraerDatos(text: string): Record<string, string> {
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
    // Se extrae el color hasta que encuentre "VIN" o el fin de la cadena.
    "Color": buscar(text, /COLOR\s+([A-Z\s\(\)0-9\.\-]+?)(?=\s+VIN\b|$)/i) || "",
    "VIN": buscar(text, /VIN\s+([A-Z0-9]+)/i) || "",
    "Nº Motor": ((): string => {
      let motor = buscar(text, /N[°º]\s*MOTOR\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i) || "";
      return motor.replace(/\s+(C|El)$/i, '').trim();
    })(),
    "Firmado por": ((): string => {
      let firmado = buscar(text, /Firmado por:\s+(.+?)(?=\s+AUDITORÍA|\r?\n|$)/i) || "";
      return firmado.split(/\d{2}\/\d{2}\/\d{4}/)[0].trim();
    })(),
  };
}

/**
 * Función para extraer datos del formato "Certificado de Emisiones".
 */
export function extraerDatosEmisiones(text: string): Record<string, string> {
  const obtenerPrimerMatch = (patron: RegExp): string => {
    const matches = [...text.matchAll(patron)].map((m) => m[1]?.trim() || "");
    return matches.length > 0 ? matches[0] : "";
  };

  const datos: Record<string, string> = {};
  datos["Fecha de Revisión"] = obtenerPrimerMatch(/FECHA REVISI[ÓO]N:\s*([\d]{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})/gi);
  datos["Planta"] = obtenerPrimerMatch(/PLANTA:\s*([A-Z0-9\-]+)/gi);

  const rawPlacaEstado = obtenerPrimerMatch(/PLACA PATENTE\s+([\w\d\s\-]+)/gi);
  if (rawPlacaEstado) {
    let parts = rawPlacaEstado.split(/\s+/).filter(Boolean);
    parts = parts.filter((p) => {
      const upper = p.toUpperCase();
      return !upper.includes("FIRMA") && !upper.includes("ELECTR");
    });
    if (parts[0]) {
      datos["Placa Patente"] = parts[0];
    }
    if (parts[1]) {
      datos["Estado"] = parts[1];
    }
  }
  let firma = obtenerPrimerMatch(/FIRMA ELECTR[ÓO]NICA(?:\s+AVANZADA)?\s+([\w\s]+)/gi);
  firma = firma.replace(/\s+V$/, "");
  datos["Firma Electrónica"] = firma;
  datos["Válido hasta"] = obtenerPrimerMatch(/VÁLIDO HASTA\s*(?:FECHA REVISIÓN:\s*[\d]{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}\s+)?([\w]+\s+\d{4})/gi);
  return datos;
}

/**
 * Función para extraer datos del formato de Revisión Técnica (CRT) de forma simplificada.
 * Se extraen únicamente los 4 campos requeridos: Fecha de Revisión, Planta, Placa Patente y Válido Hasta.
 */
export function extraerDatosRevisionTecnicaSimplificado(text: string): Record<string, string> {
  const datos: Record<string, string> = {};
  // Fecha de Revisión: Se toma el primer match después de "FECHA REVISIÓN:".
  const fechaMatch = text.match(/FECHA REVISIÓN:\s*(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})/i);
  if (fechaMatch) {
    datos["Fecha de Revisión"] = fechaMatch[1].trim();
  }
  // Planta: Se busca la etiqueta "PLANTA:".
  const plantaMatch = text.match(/PLANTA:\s*([A-Z0-9-]+)/i);
  if (plantaMatch) {
    datos["Planta"] = plantaMatch[1].trim();
  }
  // Placa Patente: Se busca la etiqueta "PLACA PATENTE" y se toma el primer match de una cadena alfanumérica.
  const placaMatch = text.match(/PLACA PATENTE\s+([A-Z0-9]+)/i);
  if (placaMatch) {
    datos["Placa Patente"] = placaMatch[1].trim();
  }
  // Válido Hasta: Se busca "VÁLIDO HASTA" y se toma el primer match de un mes y año.
  let validoMatch = text.match(/VÁLIDO HASTA\s*(?:FECHA REVISIÓN:.*?)([A-Z]+\s+\d{4})/i);
  if (!validoMatch) {
    validoMatch = text.match(/VÁLIDO HASTA\s*:?\s*([A-Z]+\s+\d{4})/i);
  }
  if (validoMatch) {
    datos["Válido Hasta"] = validoMatch[1].trim();
  }
  return datos;
}

/**
 * Función para extraer datos del formato SOAP (Seguro Obligatorio) de forma simplificada.
 * Se extraen los siguientes campos:
 * - INSCRIPCION R.V.M
 * - Bajo el codigo
 * - RUT
 * - RIGE DESDE
 * - HASTA
 * - POLIZA N°
 * - PRIMA
 */
export function extraerDatosSoapSimplificado(text: string): Record<string, string> {
  const t = text.replace(/\r?\n|\r/g, " ");
  return {
    "INSCRIPCION R.V.M": buscar(t, /INSCRIPCION\s+R\s*\.?\s*V\s*\.?\s*M\s*\.?\s*[:\s-]+\s*([A-Z0-9\-]+)/i) || "",
    "Bajo el codigo": buscar(t, /Bajo\s+el\s+c[óo]digo\s*[:\s-]+\s*([A-Z0-9\-]+)/i) || "",
    "RUT": buscar(t, /RUT\s*[:\s-]+\s*([\d\.]+-[kK])/i) || "",
    "RIGE DESDE": buscar(t, /RIGE\s+DESDE\s*:?\s*(\d{2}-\d{2}-\d{4})/i) || "",
    // Regex actualizada para capturar "HASTA:" con colon opcional.
    "HASTA": buscar(t, /HASTA\s*:?\s*(\d{2}-\d{2}-\d{4})/i) || "",
    "POLIZA N°": buscar(t, /POLIZA\s*N[°º]?\s*[:\s-]+\s*([\w\-]+)/i) || "",
    "PRIMA": buscar(t, /PRIMA\s*[:\s-]+\s*([\d\.,]+)/i) || "",
  };
}

/**
 * Función para limpiar acentos, caracteres no permitidos y quitar " A" al final.
 */
export function sanitizarNombre(str: string): string {
  let sanitized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-_().]/gu, "_")
    .trim();
  sanitized = sanitized.replace(/\s+A$/, "");
  return sanitized;
}

/**
 * Función para validar los datos extraídos según el formato.
 * Para Homologación y CRT se utiliza la validación actual, mientras que para SOAP simplificado se validan los 7 campos requeridos.
 */
function validateExtractedData(
  datos: Record<string, string>,
  fileName: string,
  format: PDFFormat
): void {
  const expectedPatterns: Record<string, RegExp> = {};

  switch (format) {
    case "CERTIFICADO_DE_HOMOLOGACION":
      Object.assign(expectedPatterns, {
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
      });
      break;
    case "CRT":
      // Validación simplificada para CRT (4 campos)
      Object.assign(expectedPatterns, {
        "Fecha de Revisión": /^\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/,
        "Placa Patente": /^[A-Z0-9]+$/,
        "Válido Hasta": /^[A-Z\s]+[0-9]{4}$/i,
        "Planta": /^.+$/,
      });
      break;
    case "SOAP":
      // Validación simplificada para SOAP (7 campos requeridos)
      Object.assign(expectedPatterns, {
        "INSCRIPCION R.V.M": /^[A-Z0-9\-]+$/,
        "Bajo el codigo": /^[A-Z0-9\-]+$/,
        "RUT": /^\d{1,3}(?:\.\d{3})*-[kK]$/,
        "RIGE DESDE": /^\d{2}-\d{2}-\d{4}$/,
        "HASTA": /^\d{2}-\d{2}-\d{4}$/,
        "POLIZA N°": /^[A-Z0-9\-]+$/,
        "PRIMA": /^[\d\.,]+$/,
      });
      break;
    default:
      return;
  }

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
      `El archivo ${fileName} presenta errores en la validación de datos:\n${errors.join("\n")}`
    );
  }
}

/**
 * Procesa el PDF y selecciona la función de extracción según el pdfFormat.
 * Además de detectar el formato real, se validan los campos extraídos según el formato esperado.
 * Si alguna validación falla, se lanza un error que incluye el nombre del archivo y los detalles.
 */
export async function procesarPDF(
  file: File,
  pdfFormat?: PDFFormat
): Promise<{ datos: Record<string, string>; titulo?: string }> {
  const { allText } = await parsePDFBuffer(file);
  let datos: Record<string, string> = {};
  let titulo: string | undefined;

  const detectarFormato = (text: string): PDFFormat | "DESCONOCIDO" => {
    if (text.includes("CERTIFICADO DE HOMOLOGACIÓN")) {
      return "CERTIFICADO_DE_HOMOLOGACION";
    }
    if (
      (text.includes("CERTIFICADO DE REVISIÓN TÉCNICA") && text.includes("NOMBRE DEL PROPIETARIO")) ||
      (text.includes("FECHA REVISIÓN") && text.includes("PLANTA:"))
    ) {
      return "CRT";
    }
    if (
      text.includes("SEGURO OBLIGATORIO") ||
      text.includes("SOAP") ||
      text.includes("INSCRIPCION R.V.M") ||
      text.includes("POLIZA")
    ) {
      return "SOAP";
    }
    return "DESCONOCIDO";
  };

  const formatoDetectado = detectarFormato(allText);

  if (pdfFormat && formatoDetectado !== pdfFormat) {
    throw new Error(
      `El archivo ${file.name} no corresponde al formato esperado ${pdfFormat}. Se detectó el formato: ${formatoDetectado}.`
    );
  }

  if (
    pdfFormat === "CERTIFICADO_DE_HOMOLOGACION" ||
    (!pdfFormat && formatoDetectado === "CERTIFICADO_DE_HOMOLOGACION")
  ) {
    datos = extraerDatos(allText);
    const matchTitulo = allText.match(/^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i);
    if (matchTitulo && matchTitulo[1]) {
      titulo = matchTitulo[1].trim();
    }
    validateExtractedData(datos, file.name, "CERTIFICADO_DE_HOMOLOGACION");
  } else if (pdfFormat === "CRT" || (!pdfFormat && formatoDetectado === "CRT")) {
    datos = extraerDatosRevisionTecnicaSimplificado(allText);
    validateExtractedData(datos, file.name, "CRT");
  } else if (pdfFormat === "SOAP" || (!pdfFormat && formatoDetectado === "SOAP")) {
    datos = extraerDatosSoapSimplificado(allText);
    validateExtractedData(datos, file.name, "SOAP");
  } else {
    throw new Error(`El archivo ${file.name} no pudo ser identificado como un formato válido.`);
  }

  return { datos, titulo };
}
