// src/utils/pdfUtils.ts

import PDFParser from "pdf2json";

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
 * Función que extrae campos de interés del texto extraído de un PDF.
 * Utiliza la función buscar para identificar y retornar los datos requeridos.
 * @param text - Texto completo extraído del PDF.
 * @returns Un objeto con los datos extraídos.
 */
export function extraerDatos(text: string): Record<string, string> {
  return {
    "Fecha de Emisión": buscar(text, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/),
    // Se adapta para aceptar N° o Nº y espacios opcionales.
    "Nº Correlativo": buscar(text, /N[°º]\s*CORRELATIVO\s+([A-Z0-9\-]+)/),
    "Código Informe Técnico": buscar(
      text,
      /CÓDIGO DE INFORME TÉCNICO\s+([A-Z0-9\-]+)/
    ),
    Patente: buscar(text, /PATENTE\s+([A-Z0-9\-]+)/),
    "Válido Hasta": buscar(text, /VÁLIDO HASTA\s+([0-9A-Z\/]+)/),
    "Tipo de Vehículo": buscar(text, /TIPO DE VEHÍCULO\s+([A-ZÑ]+)/),
    Marca: buscar(text, /MARCA\s+([A-Z]+)/),
    Año: buscar(text, /AÑO\s+([0-9]{4})/),
    Modelo: buscar(text, /MODELO\s+(.+?)\s+COLOR/),
    Color: buscar(text, /COLOR\s+([A-Z]+)/),
    VIN: buscar(text, /VIN\s+([A-Z0-9]+)/),
    // Se adapta para "Nº MOTOR" o "N° MOTOR" y se restringe hasta antes de "CÓDIGO"
    "Nº Motor": buscar(text, /N[°º]\s*MOTOR\s+([A-Z0-9 ]+)(?=\s+CÓDIGO)/),
    "Firmado por": buscar(
      text,
      /Firmado por:\s+([A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+)*)(?=\s|$)/
    ),
  };
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s\-_().]/gu, "_")
    .trim();
}

/**
 * Función para procesar un PDF y extraer los datos de interés.
 * Convierte el archivo a buffer, lo parsea usando pdf2json y extrae el texto de las páginas.
 * Luego, utiliza extraerDatos para obtener los campos requeridos y busca un título opcional.
 *
 * @param file - Archivo PDF a procesar.
 * @returns Un objeto que contiene los datos extraídos y, opcionalmente, un título.
 */
export async function procesarPDF(file: File): Promise<{
  datos: Record<string, string>;
  titulo?: string;
}> {
  // Convierte el archivo a un ArrayBuffer y luego a un Buffer.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Usa pdf2json para parsear el contenido del PDF.
  const pdfData = await new Promise<any>((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(errData.parserError)
    );
    pdfParser.on("pdfParser_dataReady", (data: any) => resolve(data));
    pdfParser.parseBuffer(buffer);
  });

  // Extrae el texto de todas las páginas del PDF.
  let allText = "";
  if (pdfData.formImage?.Pages) {
    allText = pdfData.formImage.Pages.map((page: any) =>
      page.Texts.map((t: any) => decodeURIComponent(t.R[0].T)).join(" ")
    ).join(" ");
  } else if (pdfData.Pages) {
    allText = pdfData.Pages.map((page: any) =>
      page.Texts.map((t: any) => decodeURIComponent(t.R[0].T)).join(" ")
    ).join(" ");
  } else {
    throw new Error("No se encontraron páginas en el PDF");
  }

  // Extrae los campos de interés del texto utilizando la función extraerDatos.
  const datos = extraerDatos(allText);

  // Busca un título opcional en el texto.
  let titulo: string | undefined;
  const matchTitulo = allText.match(
    /^(CERTIFICADO DE HOMOLOGACIÓN.*?)\s+REEMPLAZA/i
  );
  if (matchTitulo && matchTitulo[1]) {
    titulo = matchTitulo[1].trim();
  }

  return { datos, titulo };
}
