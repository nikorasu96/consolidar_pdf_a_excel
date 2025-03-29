// src/utils/pdfUtils.ts
import PDFParser from "pdf2json";
import logger from "./logger";
import type { PDFFormat } from "@/../../types/pdfFormat";
import { extraerDatosHomologacion, bestEffortValidationHomologacion } from "@/extractors/homologacionExtractor";
import { extraerDatosCRT, bestEffortValidationCRT } from "@/extractors/crtExtractor";
import { extraerDatosSoapSimplificado, bestEffortValidationSoap } from "@/extractors/soapExtractor";
import { extraerDatosPermisoCirculacion, bestEffortValidationPermisoCirculacion } from "@/extractors/permisoCirculacionExtractor";

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

export async function parsePDFBuffer(file: File): Promise<string> {
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

  const maxLogLength = 500;
  const logOutput =
    allText.length > maxLogLength ? allText.slice(0, maxLogLength) + "..." : allText;
  logger.debug("Texto extraído (allText):", logOutput);

  return allText;
}

export async function procesarPDF(
  file: File,
  pdfFormat?: PDFFormat,
  returnRegex: boolean = false
): Promise<{ datos: Record<string, string>; titulo?: string; regexes?: Record<string, RegExp> }> {
  const allText = await parsePDFBuffer(file);
  let datos: Record<string, string> = {};
  let titulo: string | undefined;
  let regexes: Record<string, RegExp> | undefined;

  // Función de detección del formato:
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
    if (
      texto.toLowerCase().includes("permiso de circulación") &&
      texto.toLowerCase().includes("placa")
    ) {
      return "PERMISO_CIRCULACION";
    }
    return "DESCONOCIDO";
  };

  const formatoDetectado = detectarFormato(allText);

  // Mapeo para mostrar el nombre completo de cada formato
  const nombresFormato: Record<string, string> = {
    CERTIFICADO_DE_HOMOLOGACION: "Certificado de Homologación",
    CRT: "Certificado de Revisión Técnica (CRT)",
    SOAP: "Seguro Obligatorio (SOAP)",
    PERMISO_CIRCULACION: "Permiso de Circulación",
    DESCONOCIDO: "Formato Desconocido",
  };

  if (pdfFormat && formatoDetectado !== pdfFormat) {
    throw new Error(
      `El archivo ${file.name} no corresponde al formato esperado ${nombresFormato[pdfFormat]}. Se detectó que pertenece a: ${nombresFormato[formatoDetectado]}.`
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
      datos = extraerDatosSoapSimplificado(allText);
      const inscripcion = datos["INSCRIPCION R.V.M"];
      const inscripcionPattern = /^[A-Z]{4}[0-9]{2}\s*-\s*[0-9A-Z]$/;
      if (!inscripcion || !inscripcionPattern.test(inscripcion)) {
        throw new Error(
          `El archivo ${file.name} tiene un formato inválido en INSCRIPCION R.V.M: "${inscripcion}". Formato esperado: "LXWJ75-4" o similar.`
        );
      }
      bestEffortValidationSoap(datos, file.name);
      break;
    case "PERMISO_CIRCULACION":
      const result = extraerDatosPermisoCirculacion(allText);
      datos = result.data;
      if (returnRegex) {
        regexes = result.regexes;
      }
      const camposOpcionales = [
        "Pago total",
        "Pago Cuota 1",
        "Pago Cuota 2",
        "Fecha de emisión",
        "Fecha de vencimiento"
      ];
      camposOpcionales.forEach((campo) => {
        if (!datos[campo] || datos[campo].trim() === "") {
          datos[campo] = "No aplica";
        }
      });
      bestEffortValidationPermisoCirculacion(datos, file.name);
      break;
    default:
      throw new Error(`El archivo ${file.name} no pudo ser identificado como un formato válido.`);
  }

  if (formatoDetectado !== "PERMISO_CIRCULACION") {
    const invalidFields = Object.entries(datos).filter(
      ([, value]) => !value || value.trim().length < 3
    );
    if (invalidFields.length > 0) {
      const campos = invalidFields.map(([campo]) => campo).join(", ");
      throw new Error(
        `El archivo ${file.name} tiene datos insuficientes en los siguientes campos: ${campos}.`
      );
    }
  }

  return { datos, titulo, regexes };
}
