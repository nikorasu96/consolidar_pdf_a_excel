// __tests__/services/pdfService.test.ts
import { processPDFFiles, generateExcelFromResults } from "@/services/pdfService";
import type { PDFFormat } from "@/types/pdfFormat";

// Simula la función procesarPDF para evitar la dependencia en pdf2json
jest.mock("@/utils/pdfUtils", () => ({
  procesarPDF: jest.fn().mockResolvedValue({
    datos: { campo: "valor" },
    titulo: "Titulo de prueba",
    regexes: null,
  }),
  sanitizarNombre: (str: string) => str.replace(/\s+/g, "_"),
}));

// Simula la función generateExcel para no depender de xlsx-populate
jest.mock("@/utils/excel/excelUtils", () => ({
  generateExcel: jest.fn().mockResolvedValue({
    buffer: Buffer.from("excel content"),
    encodedName: "archivo.xlsx",
  }),
}));

describe("pdfService", () => {
  const dummyFile = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
  const files = [dummyFile];
  const pdfFormat: PDFFormat = "CERTIFICADO_DE_HOMOLOGACION";

  test("processPDFFiles retorna resultados exitosos", async () => {
    const onEvent = jest.fn();
    const results = await processPDFFiles({
      files,
      pdfFormat,
      returnRegex: false,
      onEvent,
    });
    expect(results[0].status).toBe("fulfilled");
    if (results[0].status === "fulfilled") {
      expect(results[0].value.fileName).toBe("test.pdf");
      expect(results[0].value.datos.campo).toBe("valor");
    }
    expect(onEvent).toHaveBeenCalled();
  });

  test("generateExcelFromResults retorna el Excel y nombre", async () => {
    // Simula un resultado exitoso
    const successes = [{
      fileName: "test.pdf",
      datos: { campo: "valor" },
      titulo: "Titulo de prueba",
      regexes: null,
    }];
    const { excelBuffer, fileName } = await generateExcelFromResults(successes, pdfFormat);
    expect(excelBuffer).toBeInstanceOf(Buffer);
    expect(fileName).toBe("archivo.xlsx");
  });
});
