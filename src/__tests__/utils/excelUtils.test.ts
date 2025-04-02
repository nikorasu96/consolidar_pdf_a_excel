// __tests__/excelUtils.test.ts
import { generateExcel } from "@/utils/excel/excelUtils";
import type { PDFFormat } from "@/types/pdfFormat";

describe("excelUtils - generateExcel", () => {
  test("debe generar un buffer y un nombre de archivo codificado", async () => {
    const registros = [
      { "Header1": "valor1", "Header2": "valor2" },
      { "Header1": "valor3", "Header2": "valor4" },
    ];
    const fileName = "test.xlsx";
    const pdfFormat: PDFFormat = "CERTIFICADO_DE_HOMOLOGACION";

    const result = await generateExcel(registros, fileName, pdfFormat);
    expect(result).toHaveProperty("buffer");
    expect(result).toHaveProperty("encodedName");
    expect(result.encodedName).toContain(encodeURIComponent("test.xlsx"));
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  test("debe lanzar error si 'registros' está vacío", async () => {
    const registros: Record<string, string>[] = [];
    const fileName = "empty.xlsx";
    const pdfFormat: PDFFormat = "CERTIFICADO_DE_HOMOLOGACION";

    await expect(generateExcel(registros, fileName, pdfFormat)).rejects.toThrow();
  });
});
