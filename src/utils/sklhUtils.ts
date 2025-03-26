// src/utils/sklhUtils.ts

import { parsePDFBuffer } from "./pdfUtils";

/**
 * Procesa un archivo de formato SKLH.
 * Se asume que es un PDF con estructura interna diferente, identificable por la firma "SKLH20".
 */
export async function procesarSKLH(file: File): Promise<{ datos: Record<string, string>; titulo?: string }> {
  const { allText } = await parsePDFBuffer(file);

  // Extrae datos según la estructura SKLH
  const datos: Record<string, string> = {
    "Código SKLH": allText.match(/SKLH20-\d{4}/)?.[0] || "",
    "Fecha": allText.match(/Fecha:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/)?.[1] || ""
    // Agrega más campos según la estructura real.
  };

  // Extrae un título opcional
  let titulo: string | undefined;
  const matchTitulo = allText.match(/Título:\s*(.+?)\s{2,}/);
  if (matchTitulo && matchTitulo[1]) {
    titulo = matchTitulo[1].trim();
  }

  return { datos, titulo };
}
