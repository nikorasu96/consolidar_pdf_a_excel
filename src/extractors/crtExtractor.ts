import { parsePDFBuffer } from "@/utils/pdf/pdfUtils";
import logger from "@/utils/logger";
import XlsxPopulate from "xlsx-populate";
import { saveAs } from "file-saver";

/**
 * Extrae los datos CRT del texto del PDF.
 *
 * Se extraen los campos fijos ("Fecha de Revisión", "Planta", "Placa Patente" y "Folio")
 * y se separa el documento en dos secciones usando los títulos:
 *    CERTIFICADO (DE )?REVISIÓN TÉCNICA  
 *    CERTIFICADO (DE )?(EMISIONES )?CONTAMINANTES  
 * De cada sección se extrae el campo "VÁLIDO HASTA" y se asigna a:
 *    "Válido Hasta Revisión Técnica"  
 *    "Válido Hasta Contaminantes"
 *
 * @param text - Texto extraído del PDF.
 * @returns Objeto con todos los campos extraídos.
 * @throws Error si no se encuentran ambas secciones.
 */
export function extraerDatosCRT(text: string): Record<string, string> {
  const datos: Record<string, string> = {};
  logger.info("Iniciando extracción de datos CRT.");

  // Extracción de campos fijos.
  const fechaMatch = text.match(/FECHA REVISIÓN:\s*(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})/i);
  datos["Fecha de Revisión"] = fechaMatch ? fechaMatch[1].trim() : "";
  logger.info(`Fecha de Revisión extraída: ${datos["Fecha de Revisión"]}`);

  const plantaMatch = text.match(/PLANTA:\s*([A-Z0-9-]+)/i);
  datos["Planta"] = plantaMatch ? plantaMatch[1].trim() : "";
  logger.info(`Planta extraída: ${datos["Planta"]}`);

  const placaMatch = text.match(/PLACA PATENTE\s+([A-Z0-9]+)/i);
  datos["Placa Patente"] = placaMatch ? placaMatch[1].trim() : "";
  logger.info(`Placa Patente extraída: ${datos["Placa Patente"]}`);

    // Separación de secciones usando los títulos de los certificados.
    const revisionSectionMatch = text.match(
      /CERTIFICADO\s+(?:DE\s+)?REVISI[ÓO]N\s+T[EÉ]CNICA([\s\S]*?)(?=CERTIFICADO\s+(?:DE\s+)?(?:EMISIONES\s+)?CONTAMINANTES|$)/i
    );
    const contaminantesSectionMatch = text.match(
      /CERTIFICADO\s+(?:DE\s+)?(?:EMISIONES\s+)?CONTAMINANTES([\s\S]*?)(?=CERTIFICADO\s|$)/i
    );
  
    if (!revisionSectionMatch || !contaminantesSectionMatch) {
      throw new Error(
        "El PDF no contiene ambos certificados requeridos (Revisión Técnica y Emisiones Contaminantes)."
      );
    }
  
    const revisionSection = revisionSectionMatch[1];
    const contaminantesSection = contaminantesSectionMatch[1];
  
    // Extracción de "VÁLIDO HASTA" en cada sección (usando el mismo patrón).
    const validoPattern = /VÁLIDO HASTA(?:\s*FECHA REVISIÓN:)?\s*(?:(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4})\s+)?([A-ZÁÉÍÓÚÑ]+\s+\d{4})/i;
    const validoRevisionMatch = revisionSection.match(validoPattern);
    const validoContaminantesMatch = contaminantesSection.match(validoPattern);
  
    if (!validoRevisionMatch || !validoContaminantesMatch) {
      throw new Error("No se encontraron los campos 'VÁLIDO HASTA' en ambos certificados.");
    }
  
    datos["Válido Hasta Revisión Técnica"] =
      (validoRevisionMatch[2] || validoRevisionMatch[1] || "").trim();
    logger.info(`Válido Hasta Revisión Técnica extraído: ${datos["Válido Hasta Revisión Técnica"]}`);
  
    datos["Válido Hasta Contaminantes"] =
      (validoContaminantesMatch[2] || validoContaminantesMatch[1] || "").trim();
    logger.info(`Válido Hasta Contaminantes extraído: ${datos["Válido Hasta Contaminantes"]}`);

  // Se extrae el folio; este campo se quiere que quede al final.
  const folioMatch = text.match(/(N°B\d+)/i);
  datos["Folio"] = folioMatch ? folioMatch[1].trim() : "";
  logger.info(`Folio extraído: ${datos["Folio"]}`);



  return datos;
}

/**
 * Valida que los datos extraídos cumplan con los formatos esperados para CRT.
 *
 * Se valida cada campo (incluyendo ambos "Válido Hasta" y "Folio").
 *
 * @param datos - Objeto con los datos extraídos.
 * @param fileName - Nombre del archivo.
 * @throws Error si falta algún campo o su formato no coincide.
 */
export function bestEffortValidationCRT(
  datos: Record<string, string>,
  fileName: string
): void {
  logger.info(`Iniciando validación de datos CRT para el archivo: ${fileName}`);
  const expectedPatterns: Record<string, RegExp> = {
    "Fecha de Revisión": /^\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/,
    "Placa Patente": /^[A-Z0-9]+$/,
    "Planta": /^.+$/,
    "Válido Hasta Revisión Técnica": /^[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/i,
    "Válido Hasta Contaminantes": /^[A-ZÁÉÍÓÚÑ]+\s+\d{4}$/i,
    "Folio": /^N°B\d+$/i,
  };

  const errors: string[] = [];
  for (const [field, pattern] of Object.entries(expectedPatterns)) {
    const value = datos[field];
    if (!value) {
      errors.push(`Falta el campo "${field}".`);
      logger.info(`Validación: Falta el campo "${field}".`);
    } else if (!pattern.test(value)) {
      errors.push(
        `Campo "${field}" con valor "${value}" no coincide con el formato esperado.`
      );
      logger.info(
        `Validación: Campo "${field}" con valor "${value}" no coincide con el formato esperado.`
      );
    } else {
      logger.info(`Validación: Campo "${field}" con valor "${value}" es correcto.`);
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `El archivo ${fileName} presenta problemas en los datos:\n - ${errors.join("\n - ")}`
    );
  }
}

/**
 * Genera un archivo Excel a partir de un arreglo de registros.
 *
 * Para forzar el orden de las columnas se define explícitamente el arreglo de encabezados.
 * El orden final será:
 *
 * Nombre PDF | Fecha de Revisión | Planta | Placa Patente | Válido Hasta Revisión Técnica | Válido Hasta Contaminantes | Folio
 *
 * @param registros - Arreglo de objetos con los datos extraídos (ya organizados en el orden deseado).
 */
export async function generarExcel(registros: Array<Record<string, any>>): Promise<void> {
  // Definir explícitamente el orden de columnas deseado.
  const headers = [
    "Nombre PDF",
    "Fecha de Revisión",
    "Planta",
    "Placa Patente",
    "Válido Hasta Revisión Técnica",
    "Válido Hasta Contaminantes",
    "Folio"
  ];

  if (registros.length === 0) {
    throw new Error("No hay registros para generar el Excel.");
  }

  // Crear un libro de Excel en blanco.
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);
  (sheet as any).name("Datos");

  // Escribir los encabezados en la primera fila siguiendo el orden definido.
  headers.forEach((header, colIndex) => {
    sheet.cell(1, colIndex + 1).value(header);
  });

  // Escribir cada registro siguiendo el orden de 'headers'.
  registros.forEach((registro, rowIndex) => {
    headers.forEach((header, colIndex) => {
      // Aseguramos obtener el valor usando la clave exacta.
      const value = registro[header] ?? "";
      sheet.cell(rowIndex + 2, colIndex + 1).value(value);
    });
  });

  // (Opcional) Aquí podrías ajustar anchos de columna o aplicar estilos.
  // Ejemplo: setColumnWidths(sheet, headers, registros);

  // Generar el archivo Excel y descargarlo.
  const buffer = await workbook.outputAsync();
  saveAs(new Blob([buffer]), "Consolidado.xlsx");
}

/**
 * Procesa un archivo PDF para extraer y validar los datos CRT.
 *
 * Se registra en la terminal:
 * - El texto completo extraído.
 * - Los datos extraídos y la validación final.
 * - Se agrega la propiedad "Nombre PDF" con el nombre del archivo.
 * - Se organiza un objeto literal para garantizar el orden de columnas deseado.
 *
 * @param file - Archivo PDF a procesar.
 * @returns El objeto de datos organizado.
 */
export async function procesarPDFCRT(file: File): Promise<Record<string, any>> {
  try {
    logger.info(`Procesando archivo PDF: ${file.name}`);
    const pdfTexto = await parsePDFBuffer(file);
    logger.info("Texto completo extraído del PDF:");
    logger.info(pdfTexto);

    const datosCRT = extraerDatosCRT(pdfTexto);
    logger.info("Datos extraídos (CRT):");
    logger.info(datosCRT);

    bestEffortValidationCRT(datosCRT, file.name);
    logger.info("Validación completada exitosamente.");

    // Agregar el nombre del archivo.
    datosCRT["Nombre PDF"] = file.name;

    // Organizar el objeto de salida en el orden deseado:
    //  Nombre PDF | Fecha de Revisión | Planta | Placa Patente | Válido Hasta Revisión Técnica | Válido Hasta Contaminantes | Folio
    const datosOrdenados = {
      "Nombre PDF": datosCRT["Nombre PDF"],
      "Fecha de Revisión": datosCRT["Fecha de Revisión"],
      "Planta": datosCRT["Planta"],
      "Placa Patente": datosCRT["Placa Patente"],
      "Válido Hasta Revisión Técnica": datosCRT["Válido Hasta Revisión Técnica"],
      "Válido Hasta Contaminantes": datosCRT["Válido Hasta Contaminantes"],
      "Folio": datosCRT["Folio"]
    };

    logger.info("Datos finales (ordenados para Excel):");
    logger.info(datosOrdenados);

    return datosOrdenados;
  } catch (error: any) {
    logger.error("Error al procesar el PDF CRT:", error);
    throw error;
  }
}
