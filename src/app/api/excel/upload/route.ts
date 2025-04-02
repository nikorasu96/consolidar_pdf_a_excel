// app/api/excel/upload/route.ts
import { NextResponse } from "next/server";
import logger from "@/utils/logger";
import type { PDFFormat } from "@/types/pdfFormat";
import { uploadExcelFile } from "@/services/excelService";

export const runtime = "nodejs";

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

    const message = await uploadExcelFile(excelFile as File, pdfFormat);
    return NextResponse.json({ message });
  } catch (error: any) {
    logger.error("Error al procesar el archivo Excel:", error);
    const details = process.env.NODE_ENV === "development"
      ? { message: error.message, stack: error.stack }
      : {};
    return NextResponse.json({ error: "Error al procesar el archivo Excel.", details }, { status: 500 });
  }
}
