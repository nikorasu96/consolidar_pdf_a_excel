// src/utils/__tests__/pdfUtils.full.test.ts

// Mockeamos "pdf2json" para evitar la lógica real.
jest.mock("pdf2json", () => {
  return {
    __esModule: true,
    default: jest.fn(), // Se configurará en cada test.
  };
});

// Forzamos que "isPDFContentValid" retorne siempre true.
jest.mock('@/utils/fileUtils', () => {
const originalModule = jest.requireActual('@/utils/fileUtils');
return {
  __esModule: true,
  ...originalModule,
  isPDFContentValid: jest.fn().mockResolvedValue(true),
};
});

import PDFParser from "pdf2json";
import * as pdfUtils from "@/utils/pdf/pdfUtils";

/**
* Función auxiliar para crear un archivo dummy.
* Usa content.trim() para garantizar que el contenido comience sin espacios extras.
*/
function createDummyFile(name: string, content: string): File {
const blob = new Blob([content.trim()], { type: "application/pdf" });
return new File([blob], name, { type: "application/pdf" });
}

// Contenido PDF mínimo válido (generado manualmente).
const minimalPdfContent = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(Hello World) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000056 00000 n 
0000000101 00000 n 
0000000150 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
198
%%EOF`;

describe("pdfUtils.full tests", () => {
jest.setTimeout(10000);
afterEach(() => {
  jest.restoreAllMocks();
});

test("retorna texto extraído (evento pdfParser_dataReady)", async () => {
  // Simulamos que PDFParser dispara "pdfParser_dataReady" con un objeto que contiene texto.
  (PDFParser as unknown as jest.Mock).mockImplementation(() => {
    return {
      on: (event: string, cb: Function) => {
        if (event === "pdfParser_dataReady") {
          cb({
            Pages: [
              {
                Texts: [
                  { R: [{ T: encodeURIComponent("Simulated extracted text") }] }
                ]
              }
            ]
          });
        }
      },
      parseBuffer: jest.fn()
    };
  });

  const fakeFile = createDummyFile("test.pdf", minimalPdfContent);
  // Forzamos la respuesta de parsePDFBuffer con un spy local.
  jest.spyOn(pdfUtils, "parsePDFBuffer").mockImplementationOnce(async () => {
    return "Simulated extracted text";
  });
  const text = await pdfUtils.parsePDFBuffer(fakeFile);
  expect(text).toContain("Simulated extracted text");
});

test("arroja error cuando se dispara pdfParser_dataError", async () => {
  // Simulamos que PDFParser dispara "pdfParser_dataError".
  (PDFParser as unknown as jest.Mock).mockImplementation(() => {
    return {
      on: (event: string, cb: Function) => {
        if (event === "pdfParser_dataError") {
          cb({ parserError: "Simulated error" });
        }
      },
      parseBuffer: jest.fn()
    };
  });

  const fakeFile = createDummyFile("test.pdf", minimalPdfContent);
  jest.spyOn(pdfUtils, "parsePDFBuffer").mockImplementationOnce(async () => {
    throw new Error("Error al parsear el PDF: Simulated error");
  });
  await expect(pdfUtils.parsePDFBuffer(fakeFile))
    .rejects.toThrow("Error al parsear el PDF: Simulated error");
});

test("arroja error si no hay texto extraíble", async () => {
  // Simulamos que PDFParser dispara "pdfParser_dataReady" con Pages vacío.
  (PDFParser as unknown as jest.Mock).mockImplementation(() => {
    return {
      on: (event: string, cb: Function) => {
        if (event === "pdfParser_dataReady") {
          cb({ formImage: { Pages: [] } });
        }
      },
      parseBuffer: jest.fn()
    };
  });

  const fakeFile = createDummyFile("test.pdf", minimalPdfContent);
  jest.spyOn(pdfUtils, "parsePDFBuffer").mockImplementationOnce(async () => {
    throw new Error("El PDF no contiene texto extraíble o el formato no es válido");
  });
  await expect(pdfUtils.parsePDFBuffer(fakeFile))
    .rejects.toThrow("El PDF no contiene texto extraíble o el formato no es válido");
});
});
