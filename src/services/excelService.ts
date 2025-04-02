// src/services/excelService.ts
import XlsxPopulate from "xlsx-populate";
import { getConnection } from "@/utils/db";
import sql from "mssql";
import logger from "@/utils/logger";
import type { PDFFormat } from "../types/pdfFormat";
import { parseDate, parseIntOrNull, parseFloatOrNull, parseBit } from "@/utils/parse/parseUtils";

const columnDefinitions: Record<PDFFormat, Record<string, { type: string; required: boolean }>> = {
  CERTIFICADO_DE_HOMOLOGACION: {
    FechaDeEmision:      { type: "date",    required: true },
    NumeroCorrelativo:   { type: "nvarchar",required: true },
    CodigoInformeTecnico:{ type: "nvarchar",required: true },
    Patente:             { type: "nvarchar",required: true },
    ValidoHasta:         { type: "date",    required: true },
    TipoDeVehiculo:      { type: "nvarchar",required: false },
    Marca:               { type: "nvarchar",required: false },
    Ano:                 { type: "int",     required: false },
    Modelo:              { type: "nvarchar",required: false },
    Color:               { type: "nvarchar",required: false },
    VIN:                 { type: "nvarchar",required: false },
    NumeroMotor:         { type: "nvarchar",required: false },
    FirmadoPor:          { type: "nvarchar",required: false },
  },
  CRT: {
    FechaRevision:       { type: "date",    required: true },
    Planta:              { type: "nvarchar",required: true },
    PlacaPatente:        { type: "nvarchar",required: true },
    ValidoHasta:         { type: "date",    required: true },
  },
  SOAP: {
    InscripcionRVM:      { type: "nvarchar",required: true },
    BajoElCodigo:        { type: "nvarchar",required: false },
    RUT:                 { type: "nvarchar",required: true },
    RigeDesde:           { type: "date",    required: true },
    Hasta:               { type: "date",    required: true },
    PolizaN:             { type: "nvarchar",required: false },
    Prima:               { type: "float",   required: false },
  },
  PERMISO_CIRCULACION: {
    PlacaUnica:          { type: "nvarchar",required: true },
    CodigoSII:           { type: "nvarchar",required: false },
    ValorPermiso:        { type: "int",     required: false },
    PagoTotal:           { type: "bit",     required: false },
    PagoCuota1:          { type: "bit",     required: false },
    PagoCuota2:          { type: "bit",     required: false },
    TotalAPagar:         { type: "int",     required: false },
    FechaEmision:        { type: "date",    required: true },
    FechaVencimiento:    { type: "date",    required: true },
    FormaDePago:         { type: "nvarchar",required: false },
  },
};

const tableNames: Record<PDFFormat, string> = {
  CERTIFICADO_DE_HOMOLOGACION: "dbo.CertificadoHomologacion",
  CRT: "dbo.CertificadoRevisionTecnica",
  SOAP: "dbo.SeguroObligatorioSoap",
  PERMISO_CIRCULACION: "dbo.PermisoCirculacion",
};

export async function uploadExcelFile(excelFile: File, pdfFormat: PDFFormat): Promise<string> {
  // Validar entrada
  if (!excelFile || typeof (excelFile as any).arrayBuffer !== "function") {
    throw new Error("No se proporcionó un archivo Excel válido.");
  }
  const definitions = columnDefinitions[pdfFormat];
  if (!definitions) {
    throw new Error(`No hay definiciones de columnas para ${pdfFormat}.`);
  }
  const tableName = tableNames[pdfFormat];
  if (!tableName) {
    throw new Error(`No se configuró la tabla para ${pdfFormat}.`);
  }
  const arrayBuffer = await (excelFile as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const workbook = await (XlsxPopulate as any).fromDataAsync(buffer);
  const sheet = workbook.sheet(0);
  const data = sheet.usedRange()?.value();
  if (!data || data.length < 2) {
    throw new Error("El archivo Excel no contiene suficientes filas.");
  }
  const headers = data[0] as string[];
  for (const colName in definitions) {
    if (definitions[colName].required && !headers.includes(colName)) {
      throw new Error(`El encabezado requerido "${colName}" no se encontró.`);
    }
  }
  const pool = await getConnection();
  const allCols = Object.keys(definitions);
  const columnsStr = allCols.join(", ") + ", CreatedAt";
  const valuesStr = allCols.map((c) => "@" + c).join(", ") + ", GETDATE()";
  const insertQuery = `INSERT INTO ${tableName} (${columnsStr}) VALUES (${valuesStr})`;
  logger.info("Insert Query:", insertQuery);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const requestDb = pool.request();

    for (const colName of allCols) {
      const { type } = definitions[colName];
      const index = headers.indexOf(colName);
      let cellValue = index === -1 ? "" : row[index] || "";
      if (!(typeof cellValue === "string" || cellValue instanceof Date)) {
        cellValue = String(cellValue);
      }
      if (typeof cellValue === "string") {
        cellValue = cellValue.trim();
      }
      switch (type) {
        case "date": {
          let parsed: Date | null = null;
          if (cellValue instanceof Date) {
            parsed = cellValue;
          } else {
            parsed = parseDate(cellValue);
          }
          requestDb.input(colName, sql.DateTime, parsed);
          break;
        }
        case "int": {
          let parsed = typeof cellValue === "number" ? cellValue : parseIntOrNull(cellValue as string);
          if (parsed === null) parsed = 0;
          requestDb.input(colName, sql.Int, parsed);
          break;
        }
        case "float": {
          let parsed = parseFloatOrNull(cellValue as string);
          if (parsed === null) parsed = 0.0;
          requestDb.input(colName, sql.Decimal(10, 2), parsed);
          break;
        }
        case "bit": {
          const boolVal = parseBit(cellValue as string);
          requestDb.input(colName, sql.Bit, boolVal);
          break;
        }
        default:
          requestDb.input(colName, sql.NVarChar, cellValue);
          break;
      }
    }
    await requestDb.query(insertQuery);
  }

  return `Datos ingresados correctamente en ${tableName}.`;
}
