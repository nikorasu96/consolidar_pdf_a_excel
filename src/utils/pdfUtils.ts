import PDFParser from "pdf2json";

// Definición de tipos para mejorar el tipado del PDF

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
 * Función auxiliar para decodificar de forma segura una cadena URI.
 * Si ocurre un error durante la decodificación, se registra y se retorna la cadena original.
 * @param encoded - Cadena codificada.
 * @returns La cadena decodificada o la original en caso de error.
 */
function safeDecodeURIComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    console.error("Error decodificando cadena:", encoded, error);
    return encoded; // Retorna la cadena original si no se puede decodificar.
  }
}

/**
 * Función auxiliar para parsear un PDF y extraer el contenido.
 * @param file - Archivo PDF a procesar.
 * @returns Un objeto que contiene pdfData y el texto extraído de todas las páginas.
 * @throws Error si no se encuentran páginas o no se logra extraer texto válido.
 */
export async function parsePDFBuffer(
  file: File
): Promise<{ pdfData: PDFData; allText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfData: PDFData = await new Promise<PDFData>((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(new Error(errData.parserError))
    );
    pdfParser.on("pdfParser_dataReady", (data: PDFData) => resolve(data));
    pdfParser.parseBuffer(buffer);
  });

  let allText = "";
  // Función para extraer texto de una lista de páginas
  const extractTextFromPages = (pages: PDFPage[]): string => {
    return pages
      .map((page) =>
        page.Texts
          .map((t) => {
            // Validación adicional: aseguramos que exista el texto a decodificar
            if (!t.R || t.R.length === 0 || !t.R[0].T) return "";
            return safeDecodeURIComponent(t.R[0].T);
          })
          .join(" ")
      )
      .join(" ");
  };

  if (pdfData.formImage?.Pages) {
    allText = extractTextFromPages(pdfData.formImage.Pages);
  } else if (pdfData.Pages) {
    allText = extractTextFromPages(pdfData.Pages);
  } else {
    throw new Error("No se encontraron páginas en el PDF");
  }

  // Validación adicional: verificar que se haya extraído algún texto
  if (!allText.trim()) {
    throw new Error("El PDF no contiene texto extraíble o el formato no es válido");
  }

  return { pdfData, allText };
}

/**
 * Función para extraer datos del PDF utilizando diferentes formatos.
 * Si detecta "FECHA REVISIÓN" y "PLANTA:" usa el nuevo formato, de lo contrario usa el formato original.
 * @param file - Archivo PDF a procesar.
 * @returns Un objeto con los datos extraídos y, opcionalmente, un título.
 */
export async function procesarPDF(
  file: File
): Promise<{ datos: Record<string, string>; titulo?: string }> {
  try {
    const { allText } = await parsePDFBuffer(file);

    let datos: Record<string, string> = {};
    let titulo: string | undefined;

    // Si detectamos "FECHA REVISIÓN" y "PLANTA:", usamos el nuevo formato.
    if (allText.includes("FECHA REVISIÓN") && allText.includes("PLANTA:")) {
      datos = extraerDatosRevision(allText);
    } else {
      // Caso contrario, usamos el formato original.
      datos = extraerDatos(allText);
      const matchTitulo = allText.match(
        /^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i
      );
      if (matchTitulo && matchTitulo[1]) {
        titulo = matchTitulo[1].trim();
      }
    }

    return { datos, titulo };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Error procesando el PDF: " + error.message);
    } else {
      throw new Error("Error procesando el PDF: " + String(error));
    }
  }
}

/**
 * Función auxiliar que busca un patrón en un texto y devuelve el primer grupo de captura.
 * @param text - Texto en el que se realizará la búsqueda.
 * @param pattern - Expresión regular que define el patrón.
 * @returns El valor encontrado o una cadena vacía si no se encuentra coincidencia.
 */
export function buscar(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : "";
}

/**
 * Función para extraer campos de interés del texto extraído de un PDF (formato original).
 */
export function extraerDatos(text: string): Record<string, string> {
  return {
    "Fecha de Emisión": buscar(text, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/),
    "Nº Correlativo": buscar(text, /N[°º]\s*CORRELATIVO\s+([A-Z0-9\-]+)/),
    "Código Informe Técnico": buscar(
      text,
      /CÓDIGO DE INFORME TÉCNICO\s+([A-Z0-9\-]+)/
    ),
    Patente: buscar(text, /PATENTE\s+([A-Z0-9]+)/),
    "Válido Hasta": buscar(text, /VÁLIDO HASTA\s+([0-9A-Z\/]+)/),
    "Tipo de Vehículo": buscar(text, /TIPO DE VEHÍCULO\s+([A-ZÑ]+)/),
    Marca: buscar(text, /MARCA\s+([A-Z]+)/),
    Año: buscar(text, /AÑO\s+([0-9]{4})/),
    Modelo: buscar(text, /MODELO\s+(.+?)\s+COLOR/),
    Color: buscar(text, /COLOR\s+([A-Z]+)/),
    VIN: buscar(text, /VIN\s+([A-Z0-9]+)/),
    "Nº Motor": buscar(text, /N[°º]\s*MOTOR\s+([A-Z0-9 ]+)(?=\s+CÓDIGO)/),
    "Firmado por": buscar(text, /Firmado por:\s+([A-ZÁÉÍÓÚÑ\s]+)/),
  };
}

/**
 * Función para extraer de forma única los datos para el nuevo formato.
 */
export function extraerDatosRevision(text: string): Record<string, string> {
  const obtenerPrimerMatch = (patron: RegExp): string => {
    const matches = [...text.matchAll(patron)].map((m) => m[1]?.trim() || "");
    return matches.length > 0 ? matches[0] : "";
  };

  const datos: Record<string, string> = {};

  // 1. Fecha de Revisión
  datos["Fecha de Revisión"] = obtenerPrimerMatch(
    /FECHA REVISI[ÓO]N:\s*([\d]{1,2}\s+[A-Z]+\s+\d{4})/gi
  );

  // 2. Planta
  datos["Planta"] = obtenerPrimerMatch(/PLANTA:\s*([A-Z0-9\-]+)/gi);

  // 3. Placa Patente y Estado
  const rawPlacaEstado = obtenerPrimerMatch(/PLACA PATENTE\s+([\w\d\s\-]+)/gi);
  if (rawPlacaEstado) {
    let parts = rawPlacaEstado.split(/\s+/).filter(Boolean);
    // Elimina tokens "FIRMA"/"ELECTR" si los hubiera
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

  // 4. Firma Electrónica
  let firma = obtenerPrimerMatch(
    /FIRMA ELECTR[ÓO]NICA(?:\s+AVANZADA)?\s+([\w\s]+)/gi
  );
  // Remueve " V" al final si aparece de forma aislada
  firma = firma.replace(/\s+V$/, "");
  datos["Firma Electrónica"] = firma;

  // 5. Válido hasta
  datos["Válido hasta"] = obtenerPrimerMatch(
    /VÁLIDO HASTA\s*(?:FECHA REVISIÓN:\s*[\d]{1,2}\s+[A-Z]+\s+\d{4}\s+)?([\w]+\s+\d{4})/gi
  );

  return datos;
}

/**
 * Función que sanitiza un nombre eliminando acentos y caracteres no permitidos.
 * Esto es útil para generar nombres de archivos seguros para el sistema.
 * @param str - Cadena a sanitizar.
 * @returns La cadena sanitizada.
 */
export function sanitizarNombre(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimina acentos
    .replace(/[^\p{L}\p{N}\s\-_().]/gu, "_") // caracteres no permitidos
    .trim();
}
