// src/utils/pdfUtils.ts
import PDFParser from "pdf2json";
import logger from "./logger";
import type { PDFFormat } from "@/../../types/pdfFormat";
import { extraerDatosHomologacion, bestEffortValidationHomologacion } from "@/extractors/homologacionExtractor";
import { extraerDatosCRT, bestEffortValidationCRT } from "@/extractors/crtExtractor";
import {
  extraerDatosSoapSimplificado,
  extraerDatosSoapAlternativo,
  bestEffortValidationSoap,
} from "@/extractors/soapExtractor";
import { generateExcel } from "./excelUtils";

// Exporta la función buscar
export function buscar(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : null;
}

export function sanitizarNombre(str: string): string {
  let sanitized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-_().]/gu, "_")
    .trim();
  sanitized = sanitized.replace(/\s+A$/, "");
  return sanitized;
}

export async function parsePDFBuffer(file: File): Promise<{ pdfData: any; allText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfData: any = await new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) => {
      logger.error("Error en pdfParser_dataError:", errData);
      reject(new Error("Error al parsear el PDF: " + errData.parserError));
    });
    pdfParser.on("pdfParser_dataReady", (data: any) => {
      resolve(data);
    });
    pdfParser.parseBuffer(buffer);
  });

  let allText = "";
  const extractTextFromPages = (pages: any[]): string => {
    return pages
      .map((page) =>
        page.Texts
          .map((t: any) => {
            if (!t.R || t.R.length === 0 || !t.R[0]?.T) return "";
            return decodeURIComponent(t.R[0].T);
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

export async function procesarPDF(
  file: File,
  pdfFormat?: PDFFormat
): Promise<{ datos: Record<string, string>; titulo?: string }> {
  const { allText } = await parsePDFBuffer(file);
  let datos: Record<string, string> = {};
  let titulo: string | undefined;

  const detectarFormato = (texto: string): PDFFormat | "DESCONOCIDO" => {
    if (texto.includes("CERTIFICADO DE HOMOLOGACIÓN")) {
      return "CERTIFICADO_DE_HOMOLOGACION";
    }
    if (
      (texto.includes("CERTIFICADO DE REVISIÓN TÉCNICA") && texto.includes("NOMBRE DEL PROPIETARIO")) ||
      (texto.includes("FECHA REVISIÓN") && texto.includes("PLANTA:"))
    ) {
      return "CRT";
    }
    if (
      texto.includes("SEGURO OBLIGATORIO") ||
      texto.includes("SOAP") ||
      texto.includes("INSCRIPCION R.V.M") ||
      texto.includes("POLIZA")
    ) {
      return "SOAP";
    }
    return "DESCONOCIDO";
  };

  const formatoDetectado = detectarFormato(allText);

  // Si se indica un formato y el detectado no coincide, se rechaza el archivo.
  if (pdfFormat && formatoDetectado !== pdfFormat) {
    throw new Error(
      `El archivo ${file.name} no corresponde al formato esperado ${pdfFormat}. Se detectó: ${formatoDetectado}.`
    );
  }

  switch (formatoDetectado) {
    case "CERTIFICADO_DE_HOMOLOGACION":
      datos = extraerDatosHomologacion(allText);
      const matchTitulo = allText.match(/^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i);
      if (matchTitulo && matchTitulo[1]) {
        titulo = matchTitulo[1].trim();
      }
      bestEffortValidationHomologacion(datos, file.name);
      break;
    case "CRT":
      datos = extraerDatosCRT(allText);
      bestEffortValidationCRT(datos, file.name);
      break;
    case "SOAP":
      // Si se quisiera elegir entre el método alternativo o simplificado, se podría habilitar una condición
      datos = extraerDatosSoapSimplificado(allText);
      bestEffortValidationSoap(datos, file.name);
      break;
    default:
      throw new Error(`El archivo ${file.name} no pudo ser identificado como un formato válido.`);
  }

  return { datos, titulo };
}
