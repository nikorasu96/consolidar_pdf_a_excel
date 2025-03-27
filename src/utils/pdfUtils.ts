// src/utils/pdfUtils.ts

import PDFParser from "pdf2json";
import logger from "./logger";

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

  // Log para verificar el contenido exacto extraído (útil para ajustar regex)
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
 * Se mantiene sin cambios la lógica original.
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
    "Color": buscar(text, /COLOR\s+([A-Z]+)/i) || "",
    "VIN": buscar(text, /VIN\s+([A-Z0-9]+)/i) || "",
    "Nº Motor": buscar(text, /N[°º]\s*MOTOR\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i) || "",
    "Firmado por": buscar(text, /Firmado por:\s+(.+?)(?=\s+AUDITORÍA|\r?\n|$)/i) || "",
  };
}

/**
 * Función para extraer datos del formato "Certificado de Emisiones".
 * Se mantiene sin cambios la lógica original.
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
 * Función para extraer datos del formato de Revisión Técnica (CRT).
 * Se mantiene sin cambios la lógica original.
 */
export function extraerDatosRevisionTecnicaNuevoFormato(text: string): Record<string, string> {
  const capturar = (regex: RegExp): string => {
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : "";
  };

  const datos: Record<string, string> = {};
  datos["Fecha de Revisión"] = capturar(/FECHA REVISIÓN:\s*([\wÁÉÍÓÚÑ\d\s]+)/i);
  datos["Nro"] = capturar(/NRO:\s*#?([\w\-]+)/i);
  datos["Planta"] = capturar(/PLANTA:\s*(.+?)(?=\s+PLACA\s+PATENTE|FIRMA|$)/i);
  datos["Placa Patente"] = capturar(/PLACA\s+PATENTE:\s*([A-Z0-9]+)/i);
  datos["Firma Electrónica"] = capturar(/FIRMA ELECTRÓNICA(?:\s+AVANZADA)?\s+(.+?)(?=\n|$)/i);
  datos["Válido Hasta"] = capturar(/VÁLIDO HASTA:\s*([\wÁÉÍÓÚÑ\d\s]+)/i);
  datos["Nombre del Propietario"] = capturar(/NOMBRE DEL PROPIETARIO:\s*(.+?)(?=\n|$)/i);
  datos["RUT"] = capturar(/RUT:\s*([\d\.]+-[\dkK])\b/);
  datos["Marca"] = capturar(/MARCA:\s*([A-Z0-9]+)/i);
  datos["Modelo"] = capturar(/MODELO:\s*([A-Z0-9]+)/i);
  datos["Tipo de Combustible"] = capturar(/TIPO DE COMBUSTIBLE:\s*([A-Z]+)/i);
  datos["Sello"] = text.includes("SELLO VERDE") ? "VERDE" : "";
  return datos;
}

/**
 * Función para extraer datos del formato SOAP (Seguro Obligatorio).
 * Se extraen los siguientes campos:
 *   - INSCRIPCION R.V.M (ej: "LXWJ75-4")
 *   - Bajo el codigo (ej: "POL420130487")
 *   - RUT (ej: "97.036.000-k" o "97.036.000-K")
 *   - RIGE DESDE (ej: "01-04-2025")
 *   - HASTA (ej: "31-03-2026")
 *   - POLIZA N° (ej: "629635-M")
 *   - PRIMA (ej: "5.950")
 */
export function extraerDatosSOAP(text: string): Record<string, string> {
  // Normalizamos saltos de línea para unir todo en una sola cadena
  const t = text.replace(/\r?\n|\r/g, " ");
  return {
    "INSCRIPCION R.V.M": buscar(
      t,
      // Permite que entre "INSCRIPCION" y "R" haya espacios, y admite "R", "V" y "M" con o sin puntos y con espacios opcionales.
      /INSCRIPCION\s+R\s*\.?\s*V\s*\.?\s*M\s*\.?\s*[:\s-]+\s*([A-Z0-9\-]+)/i
    ) || "",
    "Bajo el codigo": buscar(
      t,
      /Bajo\s+el\s+c[óo]digo\s*[:\s-]+\s*([A-Z0-9]+)/i
    ) || "",
    "RUT": buscar(
      t,
      /RUT\s*[:\s-]+\s*([\d\.]+-[kK])/i
    ) || "",
    "RIGE DESDE": buscar(
      t,
      /RIGE\s+DESDE\s*[:\s-]+\s*(\d{2}-\d{2}-\d{4})/i
    ) || "",
    "HASTA": buscar(
      t,
      /HAST\s*A?\s*[:\s-]+\s*(\d{2}-\d{2}-\d{4})/i
    ) || "",
    "POLIZA N°": buscar(
      t,
      /POLIZA\s*N[°º]?\s*[:\s-]+\s*([\w\-]+)/i
    ) || "",
    "PRIMA": buscar(
      t,
      /PRIMA\s*[:\s-]+\s*([\d\.,]+)/i
    ) || "",
  };
}

/**
 * Limpia acentos, caracteres no permitidos y quita " A" al final.
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
 * Procesa el PDF y selecciona la función de extracción según el pdfFormat.
 */
export async function procesarPDF(
  file: File,
  pdfFormat?: string
): Promise<{ datos: Record<string, string>; titulo?: string }> {
  const { allText } = await parsePDFBuffer(file);
  let datos: Record<string, string> = {};
  let titulo: string | undefined;

  if (pdfFormat === "CERTIFICADO_DE_HOMOLOGACION") {
    if (!allText.includes("CERTIFICADO DE HOMOLOGACIÓN")) {
      throw new Error("El archivo no corresponde a la estructura de CERTIFICADO DE HOMOLOGACIÓN");
    }
    datos = extraerDatos(allText);
    const matchTitulo = allText.match(/^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i);
    if (matchTitulo && matchTitulo[1]) {
      titulo = matchTitulo[1].trim();
    }
  } else if (pdfFormat === "CRT") {
    if (allText.includes("CERTIFICADO DE REVISIÓN TÉCNICA") && allText.includes("NOMBRE DEL PROPIETARIO")) {
      datos = extraerDatosRevisionTecnicaNuevoFormato(allText);
    } else if (allText.includes("FECHA REVISIÓN") && allText.includes("PLANTA:")) {
      datos = extraerDatosEmisiones(allText);
    } else {
      throw new Error("El archivo no corresponde a la estructura de CRT");
    }
  } else if (pdfFormat === "SOAP") {
    if (
      !(
        allText.includes("SEGURO OBLIGATORIO") ||
        allText.includes("SOAP") ||
        allText.includes("INSCRIPCION R.V.M") ||
        allText.includes("POLIZA")
      )
    ) {
      throw new Error("El archivo no corresponde a la estructura SOAP (Seguro Obligatorio).");
    }
    datos = extraerDatosSOAP(allText);
  } else {
    if (allText.includes("CERTIFICADO DE REVISIÓN TÉCNICA") && allText.includes("NOMBRE DEL PROPIETARIO")) {
      datos = extraerDatosRevisionTecnicaNuevoFormato(allText);
    } else if (allText.includes("FECHA REVISIÓN") && allText.includes("PLANTA:")) {
      datos = extraerDatosEmisiones(allText);
    } else {
      datos = extraerDatos(allText);
      const matchTitulo = allText.match(/^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i);
      if (matchTitulo && matchTitulo[1]) {
        titulo = matchTitulo[1].trim();
      }
    }
  }
  return { datos, titulo };
}
