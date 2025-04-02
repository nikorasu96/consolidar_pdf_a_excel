// __tests__/fileUtils.test.ts
import { isValidPDF, validatePDFFiles, MAX_SIZE } from "@/utils/pdf/fileUtils";

// Función auxiliar para crear un objeto File simulado.
const createDummyPDF = (name: string, size: number, mimeType = "application/pdf"): File => {
  const blob = new Blob(["dummy content"], { type: mimeType });
  // Sobrescribimos la propiedad size para simular el tamaño deseado.
  Object.defineProperty(blob, "size", { value: size });
  return new File([blob], name, { type: mimeType });
};

describe("fileUtils", () => {
  test("isValidPDF devuelve true para un PDF válido", () => {
    const file = createDummyPDF("test.pdf", MAX_SIZE - 1000);
    expect(isValidPDF(file)).toBe(true);
  });

  test("isValidPDF devuelve false para archivo que no es PDF", () => {
    const file = createDummyPDF("test.txt", MAX_SIZE - 1000, "text/plain");
    expect(isValidPDF(file)).toBe(false);
  });

  test("validatePDFFiles devuelve true si todos los archivos son válidos", () => {
    const file1 = createDummyPDF("a.pdf", MAX_SIZE - 1000);
    const file2 = createDummyPDF("b.pdf", MAX_SIZE - 2000);
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (index: number) => (index === 0 ? file1 : file2),
    } as unknown as FileList;
    expect(validatePDFFiles(fileList)).toBe(true);
  });

  test("validatePDFFiles devuelve false si algún archivo es inválido", () => {
    const file1 = createDummyPDF("a.pdf", MAX_SIZE - 1000);
    const file2 = createDummyPDF("b.pdf", MAX_SIZE + 1000);
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (index: number) => (index === 0 ? file1 : file2),
    } as unknown as FileList;
    expect(validatePDFFiles(fileList)).toBe(false);
  });
});
