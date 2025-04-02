// utils/excelUtils.ts

import XlsxPopulate, { Sheet } from "xlsx-populate";
import type { PDFFormat } from "../../types/pdfFormat";
import { parseDate, parseIntOrNull } from "@/utils/parseUtils"; // Importamos funciones centralizadas

const COLUMN_WIDTH_FACTOR = 1.2;
const MIN_COLUMN_WIDTH = 10;
const BASE_ROW_HEIGHT = 15;
const WRAP_TEXT_FACTOR = 1.0;

function setColumnWidths(
  sheet: Sheet,
  encabezados: string[],
  registros: Record<string, string>[]
): void {
  encabezados.forEach((header, colIndex) => {
    let maxLength = header.length;
    registros.forEach((registro) => {
      const valor = registro[header] ? registro[header].toString() : "";
      if (valor.length > maxLength) {
        maxLength = valor.length;
      }
    });
    const width = Math.max(maxLength * COLUMN_WIDTH_FACTOR, MIN_COLUMN_WIDTH);
    sheet.column(colIndex + 1).width(width);
  });
}

function adjustRowHeightsForWrapText(
  sheet: Sheet,
  registros: Record<string, string>[],
  estadoColIndex: number
): void {
  sheet.column(estadoColIndex).style("wrapText", true);
  const colWidth = sheet.column(estadoColIndex).width();
  for (let row = 2; row <= registros.length + 1; row++) {
    const cellValue = sheet.cell(row, estadoColIndex).value();
    if (typeof cellValue === "string") {
      const textLength = cellValue.length;
      const approximateCharsPerLine = colWidth * WRAP_TEXT_FACTOR;
      const lineCount = Math.max(1, Math.ceil(textLength / approximateCharsPerLine));
      sheet.row(row).height(BASE_ROW_HEIGHT * lineCount);
    }
  }
}

/**
 * Transforma los registros y encabezados usando un mapping.
 * headerMapping define: claveOriginal → claveFinal (para la BD)
 */
function transformData(
  registros: Record<string, string>[],
  headerMapping: Record<string, string>
): { transformedHeaders: string[]; transformedRecords: Record<string, string>[] } {
  if (registros.length === 0) return { transformedHeaders: [], transformedRecords: [] };

  const transformedRecords = registros.map((registro) => {
    const nuevoRegistro: Record<string, string> = {};
    for (const key in registro) {
      if (headerMapping[key]) {
        nuevoRegistro[headerMapping[key]] = registro[key];
      } else {
        nuevoRegistro[key] = registro[key];
      }
    }
    return nuevoRegistro;
  });
  const transformedHeaders = Object.keys(transformedRecords[0]);
  return { transformedHeaders, transformedRecords };
}

/**
 * Genera un archivo Excel a partir de un arreglo de registros.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string,
  pdfFormat?: PDFFormat
): Promise<{ buffer: Buffer; encodedName: string }> {
  if (registros.length === 0) {
    let errorMsg = "No se encontraron datos para generar el Excel. Verifica que los PDFs correspondan al formato seleccionado.";
    if (pdfFormat === "CERTIFICADO_DE_HOMOLOGACION") {
      errorMsg = "No se encontraron datos para generar el Excel. Este botón es para PDF de homologación. Por favor, coloque solo el PDF correspondiente a este formato.";
    } else if (pdfFormat === "CRT") {
      errorMsg = "No se encontraron datos para generar el Excel. Este botón es para Certificado de Revisión Técnica (CRT). Por favor, coloque solo el PDF correspondiente a este formato.";
    }
    throw new Error(errorMsg);
  }

  let headerMapping: Record<string, string> = {};
  switch (pdfFormat) {
    case "CERTIFICADO_DE_HOMOLOGACION":
      headerMapping = {
        "Fecha de Emisión": "FechaDeEmision",
        "Nº Correlativo": "NumeroCorrelativo",
        "Código Informe Técnico": "CodigoInformeTecnico",
        "Patente": "Patente",
        "Válido Hasta": "ValidoHasta",
        "Tipo de Vehículo": "TipoDeVehiculo",
        "Marca": "Marca",
        "Año": "Ano",
        "Modelo": "Modelo",
        "Color": "Color",
        "VIN": "VIN",
        "Nº Motor": "NumeroMotor",
        "Firmado por": "FirmadoPor",
      };
      break;
    case "CRT":
      headerMapping = {
        "Fecha de Revisión": "FechaRevision",
        "Planta": "Planta",
        "Placa Patente": "PlacaPatente",
        "Válido Hasta": "ValidoHasta",
      };
      break;
    case "SOAP":
      headerMapping = {
        "INSCRIPCION R.V.M": "InscripcionRVM",
        "Bajo el codigo": "BajoElCodigo",
        "RUT": "RUT",
        "RIGE DESDE": "RigeDesde",
        "HASTA": "Hasta",
        "POLIZA N°": "PolizaN",
        "PRIMA": "Prima",
      };
      break;
    case "PERMISO_CIRCULACION":
      headerMapping = {
        "Placa Única": "PlacaUnica",
        "Codigo SII": "CodigoSII",
        "Valor Permiso": "ValorPermiso",
        "Pago total": "PagoTotal",
        "Pago cuota 1": "PagoCuota1",
        "Pago cuota 2": "PagoCuota2",
        "Total a pagar": "TotalAPagar",
        "Fecha de emisión": "FechaEmision",
        "Fecha Vencimiento": "FechaVencimiento",
        "Forma de Pago": "FormaDePago",
      };
      break;
    default:
      headerMapping = {};
  }

  const { transformedHeaders, transformedRecords } = transformData(registros, headerMapping);
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);

  transformedHeaders.forEach((header, colIndex) => {
    sheet.cell(1, colIndex + 1).value(header);
  });

  transformedRecords.forEach((registro, rowIndex) => {
    transformedHeaders.forEach((header, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(registro[header] || "");
    });
  });

  setColumnWidths(sheet, transformedHeaders, transformedRecords);
  const estadoIndex = transformedHeaders.findIndex((header) => header === "Estado");
  if (estadoIndex !== -1) {
    adjustRowHeightsForWrapText(sheet, transformedRecords, estadoIndex + 1);
  }

  const encodedName = encodeURIComponent(
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );
  const buffer = await workbook.outputAsync();
  return { buffer, encodedName };
}
