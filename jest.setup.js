// jest.setup.js
const path = require("path");
const dotenv = require("dotenv");
// Configuración inicial: asegúrate de que 'expect' esté definido globalmente
global.expect = require('expect');
import '@testing-library/jest-dom';

// Ahora carga los matchers de jest-dom
require('@testing-library/jest-dom');


if (typeof expect !== "undefined" && typeof expect.extend === "function") {
  require("@testing-library/jest-dom");
}


// Cargar variables de entorno si usas .env.local
dotenv.config({ path: path.resolve(__dirname, ".env.local") });


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
