// jest.setup.js
const path = require("path");
const dotenv = require("dotenv");

// Cargar variables de entorno si usas .env.local
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// Extiende expect con los matchers de Testing Library
require("@testing-library/jest-dom/extend-expect");

// Mock global de pdf2json
jest.mock("pdf2json", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        parseBuffer: jest.fn(), // No hace nada real
      };
    }),
  };
});

// Mock global de fileUtils (isPDFContentValid)
jest.mock('@/utils/fileUtils', () => {
  const originalModule = jest.requireActual('@/utils/fileUtils');
  return {
    __esModule: true,
    ...originalModule,
    // Siempre true para no fallar por encabezado
    isPDFContentValid: jest.fn().mockResolvedValue(true),
  };
});

// Mock global de parsePDFBuffer
jest.mock('@/utils/pdfUtils', () => {
  const originalModule = jest.requireActual('@/utils/pdfUtils');
  return {
    __esModule: true,
    ...originalModule,
    // parsePDFBuffer retorna un string simulado por defecto
    parsePDFBuffer: jest.fn().mockResolvedValue("%PDF-SIMULATED"),
  };
});
