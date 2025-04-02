// utils/excelUtils.ts
import XlsxPopulate from "xlsx-populate";
import type { PDFFormat } from "../../types/pdfFormat";
import { parseDate, parseIntOrNull } from "@/utils/parseUtils";

const COLUMN_WIDTH_FACTOR = 1.2;
const MIN_COLUMN_WIDTH = 10;
const BASE_ROW_HEIGHT = 15;
const WRAP_TEXT_FACTOR = 1.0;

function setColumnWidths(
  sheet: any,
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
  sheet: any,
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
 * Genera un archivo Excel con dos hojas:
 * - "Datos": con la información consolidada de los PDFs exitosos.
 * - "Estadisticas": con el resumen de procesamiento.
 *
 * @param registros Datos a incluir en la hoja "Datos".
 * @param fileName Nombre base del archivo.
 * @param pdfFormat (Opcional) Formato de PDF, para mapear columnas.
 * @param stats (Opcional) Estadísticas: totalProcesados, totalExitosos, totalFallidos y fallidos.
 */
export async function generateExcel(
  registros: Record<string, string>[],
  fileName: string,
  pdfFormat?: PDFFormat,
  stats?: { totalProcesados: number; totalExitosos: number; totalFallidos: number; fallidos: Array<{ fileName: string; error: string }> }
): Promise<{ buffer: Buffer; encodedName: string }> {
  const workbook = await XlsxPopulate.fromBlankAsync();

  // Hoja "Datos"
  const dataSheet = workbook.sheet(0) as any;
  dataSheet.name("Datos");

  if (registros.length === 0) {
    dataSheet.cell(1, 1).value("No se encontraron datos para generar el Excel.");
  } else {
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

    // Agregar "Nombre PDF" al inicio
    headerMapping = { "Nombre PDF": "Nombre PDF", ...headerMapping };

    const { transformedHeaders, transformedRecords } = transformData(registros, headerMapping);

    transformedHeaders.forEach((header, colIndex) => {
      dataSheet.cell(1, colIndex + 1).value(header);
    });

    (dataSheet as any).freezePanes("B2");

    transformedRecords.forEach((registro, rowIndex) => {
      transformedHeaders.forEach((header, colIndex) => {
        dataSheet.cell(rowIndex + 2, colIndex + 1).value(registro[header] || "");
      });
    });

    setColumnWidths(dataSheet, transformedHeaders, transformedRecords);
    const estadoIndex = transformedHeaders.findIndex((header) => header === "Estado");
    if (estadoIndex !== -1) {
      adjustRowHeightsForWrapText(dataSheet, transformedRecords, estadoIndex + 1);
    }
  }

  // Hoja "Estadisticas"
  if (stats) {
    const statsSheet = (workbook as any).addSheet("Estadisticas");
    statsSheet.cell(1, 1).value("Estadísticas de Conversión");
    statsSheet.cell(1, 1).style("bold", true);
    statsSheet.cell(3, 1).value("Total Procesados:");
    statsSheet.cell(3, 2).value(stats.totalProcesados);
    statsSheet.cell(4, 1).value("Total Exitosos:");
    statsSheet.cell(4, 2).value(stats.totalExitosos);
    statsSheet.cell(5, 1).value("Total Fallidos:");
    statsSheet.cell(5, 2).value(stats.totalFallidos);
    statsSheet.cell(7, 1).value("Archivos Fallidos");
    statsSheet.cell(7, 1).style("bold", true);
    statsSheet.cell(8, 1).value("Nombre Archivo");
    statsSheet.cell(8, 2).value("Error");

    let row = 9;
    stats.fallidos.forEach((fallo) => {
      statsSheet.cell(row, 1).value(fallo.fileName);
      statsSheet.cell(row, 2).value(fallo.error);
      row++;
    });
  }

  const encodedName = encodeURIComponent(
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );
  const buffer = await workbook.outputAsync();
  return { buffer, encodedName };
}
