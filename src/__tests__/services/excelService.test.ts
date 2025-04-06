// __tests__/services/excelService.test.ts
import { uploadExcelFile } from "@/services/excelService";
import XlsxPopulate from "xlsx-populate";
import { getConnection } from "@/utils/db";
import type { PDFFormat } from "@/types/pdfFormat";

// Mocks para XlsxPopulate
jest.mock("xlsx-populate", () => ({
  __esModule: true,
  default: {
    fromDataAsync: jest.fn(),
  },
}));

// Mock para getConnection (base de datos)
jest.mock("@/utils/db", () => ({
  getConnection: jest.fn(),
}));

// Mock para mssql
jest.mock("mssql", () => ({
  DateTime: "DateTime",
  Int: "Int",
  Decimal: jest.fn(() => "Decimal"),
  Bit: "Bit",
  NVarChar: "NVarChar",
}));

// Configuramos un mock para el Workbook de XlsxPopulate:
const mockWorkbook = {
  sheet: jest.fn().mockReturnValue({
    // usedRange simula los datos extraídos del Excel.
    // La primera fila son los encabezados requeridos para CERTIFICADO_DE_HOMOLOGACION
    // La segunda fila es un registro con datos mínimos válidos.
    usedRange: jest.fn().mockReturnValue([
      [
        "FechaDeEmision",
        "NumeroCorrelativo",
        "CodigoInformeTecnico",
        "Patente",
        "ValidoHasta",
        "TipoDeVehiculo",
        "Marca",
        "Ano",
        "Modelo",
        "Color",
        "VIN",
        "NumeroMotor",
        "FirmadoPor",
      ],
      [
        "01/01/2025", // FechaDeEmision
        "ABC-123",     // NumeroCorrelativo
        "XYZ-789",     // CodigoInformeTecnico
        "PATENTE1",    // Patente
        "31/12/2025",  // ValidoHasta
        "",            // TipoDeVehiculo (opcional)
        "",            // Marca (opcional)
        "",            // Ano (opcional)
        "",            // Modelo (opcional)
        "",            // Color (opcional)
        "",            // VIN (opcional)
        "",            // NumeroMotor (opcional)
        "",            // FirmadoPor (opcional)
      ]
    ]),
  }),
};

(XlsxPopulate as any).default.fromDataAsync.mockResolvedValue(mockWorkbook);

// Simulamos la conexión a la base de datos con un pool que devuelve un request mock.
const mockRequest = {
  input: jest.fn(),
  query: jest.fn().mockResolvedValue({}),
};

const mockPool = {
  request: jest.fn().mockReturnValue(mockRequest),
};

(getConnection as jest.Mock).mockResolvedValue(mockPool);

describe("excelService", () => {
  test("uploadExcelFile retorna mensaje de éxito cuando el Excel es válido", async () => {
    // Creamos un archivo Excel simulado usando Blob.
    const dummyExcelBlob = new Blob(
      ["dummy content"],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
    const dummyExcelFile = new File(
      [dummyExcelBlob],
      "test.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
    
    const pdfFormat: PDFFormat = "CERTIFICADO_DE_HOMOLOGACION";
    
    const result = await uploadExcelFile(dummyExcelFile, pdfFormat);
    // Según la configuración en excelService, la tabla para CERTIFICADO_DE_HOMOLOGACION es "dbo.CertificadoHomologacion"
    expect(result).toBe("Datos ingresados correctamente en dbo.CertificadoHomologacion.");
    
    // Verifica que se haya llamado la función para obtener la conexión
    expect(getConnection).toHaveBeenCalled();
    // Y que se haya ejecutado la query para cada fila (en este caso, una fila de datos, ya que la primera es de encabezados)
    expect(mockRequest.query).toHaveBeenCalled();
  });

  test("uploadExcelFile arroja error cuando el Excel no contiene suficientes filas", async () => {
    // Simulamos un workbook con datos insuficientes (solo encabezados)
    const mockWorkbookInsufficient = {
      sheet: jest.fn().mockReturnValue({
        usedRange: jest.fn().mockReturnValue([
          ["FechaDeEmision", "NumeroCorrelativo"] // solo encabezados, insuficientes filas
        ]),
      }),
    };
    (XlsxPopulate as any).default.fromDataAsync.mockResolvedValueOnce(mockWorkbookInsufficient);
    
    const dummyExcelBlob = new Blob(
      ["dummy content"],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
    const dummyExcelFile = new File(
      [dummyExcelBlob],
      "test.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
    
    const pdfFormat: PDFFormat = "CERTIFICADO_DE_HOMOLOGACION";
    await expect(uploadExcelFile(dummyExcelFile, pdfFormat)).rejects.toThrow("El archivo Excel no contiene suficientes filas.");
  });
});
