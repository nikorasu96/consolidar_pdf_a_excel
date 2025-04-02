// app/api/excel/upload/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import logger from "@/utils/logger";
import { getConnection } from "@/utils/db";
import sql from "mssql";
import XlsxPopulate from "xlsx-populate";
import type { PDFFormat } from "@/../../types/pdfFormat";
// Importamos las funciones de parseo centralizadas
import { parseDate, parseIntOrNull, parseFloatOrNull, parseBit } from "@/utils/parseUtils";

/** 
 * Definición de columnas para cada formato PDF.
 */
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const excelFile = formData.get("excel");
    const pdfFormat = formData.get("pdfFormat") as PDFFormat | null;

    if (!pdfFormat) {
      return NextResponse.json({ error: "No se proporcionó el formato del PDF." }, { status: 400 });
    }
    if (!excelFile || typeof (excelFile as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No se proporcionó un archivo Excel válido." }, { status: 400 });
    }

    const definitions = columnDefinitions[pdfFormat];
    if (!definitions) {
      return NextResponse.json({ error: `No hay definiciones de columnas para ${pdfFormat}.` }, { status: 400 });
    }
    const tableName = tableNames[pdfFormat];
    if (!tableName) {
      return NextResponse.json({ error: `No se configuró la tabla para ${pdfFormat}.` }, { status: 400 });
    }

    const arrayBuffer = await (excelFile as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Si "fromDataAsync" no existe en las definiciones, usamos un cast a any
    const workbook = await (XlsxPopulate as any).fromDataAsync(buffer);
    const sheet = workbook.sheet(0);
    const data = sheet.usedRange()?.value();
    if (!data || data.length < 2) {
      return NextResponse.json({ error: "El archivo Excel no contiene suficientes filas." }, { status: 400 });
    }

    const headers = data[0] as string[];
    for (const colName in definitions) {
      if (definitions[colName].required && !headers.includes(colName)) {
        return NextResponse.json({ error: `El encabezado requerido "${colName}" no se encontró.` }, { status: 400 });
      }
    }

    const pool = await getConnection();
    const allCols = Object.keys(definitions);
    const columnsStr = allCols.join(", ") + ", CreatedAt";
    const valuesStr = allCols.map((c) => "@" + c).join(", ") + ", GETDATE()";
    const insertQuery = `INSERT INTO ${tableName} (${columnsStr}) VALUES (${valuesStr})`;
    console.log("Insert Query:", insertQuery);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const requestDb = pool.request();

      for (const colName of allCols) {
        const { type } = definitions[colName];
        const index = headers.indexOf(colName);
        let cellValue = (index === -1) ? "" : row[index] || "";
        if (!(typeof cellValue === "string" || cellValue instanceof Date)) {
          cellValue = String(cellValue);
        }
        if (typeof cellValue === "string") {
          cellValue = cellValue.trim();
        }
        console.log(`Fila ${i}, Col "${colName}" valor:`, JSON.stringify(cellValue));

        switch (type) {
          case "date": {
            let parsed: Date | null = null;
            if (cellValue instanceof Date) {
              parsed = cellValue;
            } else {
              parsed = parseDate(cellValue);
            }
            console.log(`Fila ${i}, ${colName} (date):`, parsed);
            requestDb.input(colName, sql.DateTime, parsed);
            break;
          }
          case "int": {
            let parsed: number | null;
            if (typeof cellValue === "number") {
              parsed = cellValue;
            } else {
              parsed = parseIntOrNull(cellValue as string);
            }
            if (parsed === null) {
              console.log(`Fila ${i}, ${colName}: no se pudo parsear; asignando 0`);
              parsed = 0;
            }
            console.log(`Fila ${i}, ${colName} (int):`, parsed);
            requestDb.input(colName, sql.Int, parsed);
            break;
          }
          case "float": {
            let parsed = parseFloatOrNull(cellValue as string);
            if (parsed === null) parsed = 0.0;
            console.log(`Fila ${i}, ${colName} (float):`, parsed);
            requestDb.input(colName, sql.Decimal(10, 2), parsed);
            break;
          }
          case "bit": {
            const boolVal = parseBit(cellValue as string);
            console.log(`Fila ${i}, ${colName} (bit):`, boolVal);
            requestDb.input(colName, sql.Bit, boolVal);
            break;
          }
          default:
            console.log(`Fila ${i}, ${colName} (nvarchar):`, cellValue);
            requestDb.input(colName, sql.NVarChar, cellValue);
            break;
        }
      }
      console.log(`Fila ${i}: Ejecutando query =>`, insertQuery);
      await requestDb.query(insertQuery);
    }

    return NextResponse.json({ message: `Datos ingresados correctamente en ${tableName}.` });
  } catch (error: any) {
    logger.error("Error al procesar el archivo Excel:", error);
    const details = process.env.NODE_ENV === "development"
      ? { message: error.message, stack: error.stack }
      : {};
    return NextResponse.json({ error: "Error al procesar el archivo Excel.", details }, { status: 500 });
  }
}
