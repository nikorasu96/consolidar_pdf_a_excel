// src/utils/sklhUtils.ts

/**
 * Procesa un archivo de formato SKLH.
 * Se asume que es un PDF con una estructura interna diferente, identificable por "SKLH20".
 * @param file - Archivo a procesar.
 * @returns Un objeto con los datos extraídos y, opcionalmente, un título.
 */
export async function procesarSKLH(file: File): Promise<{ datos: Record<string, string>; titulo?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Se puede reutilizar pdf2json para extraer el contenido del PDF
  const pdfData = await new Promise<any>((resolve, reject) => {
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", (data: any) => resolve(data));
    pdfParser.parseBuffer(buffer);
  });

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
    throw new Error("No se encontraron páginas en el PDF SKLH");
  }

  // Ejemplo de extracción de datos para SKLH.
  const datos: Record<string, string> = {
    "Código SKLH": allText.match(/SKLH20-\d{4}/)?.[0] || "",
    "Fecha": allText.match(/Fecha:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/)?.[1] || ""
    // Agrega más campos según la estructura real.
  };

  // Si es necesario extraer un título.
  let titulo: string | undefined;
  const matchTitulo = allText.match(/Título:\s*(.+?)\s{2,}/);
  if (matchTitulo && matchTitulo[1]) {
    titulo = matchTitulo[1].trim();
  }

  return { datos, titulo };
}
