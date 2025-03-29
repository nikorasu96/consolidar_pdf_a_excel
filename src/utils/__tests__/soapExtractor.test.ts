// __tests__/soapExtractor.test.ts
import { extraerDatosSoapSimplificado, bestEffortValidationSoap } from "@/extractors/soapExtractor";
import logger from "@/utils/logger";

describe("soapExtractor", () => {
  test("extraerDatosSoapSimplificado debe extraer datos correctamente", () => {
    const sampleText = `
      INSCRIPCION R.V.M.: LXWJ75-4
      Bajo el codigo: ABC123
      RUT: 97.006.000-6
      RIGE DESDE: 01-01-2025
      HASTA: 31-12-2025
      POLIZA N°: POL123
      PRIMA: 100.50
    `;
    const datos = extraerDatosSoapSimplificado(sampleText);

    expect(datos["INSCRIPCION R.V.M"]).toBe("LXWJ75-4");
    expect(datos["Bajo el codigo"]).toBe("ABC123");
    expect(datos["RUT"]).toBe("97006000-6"); // Se espera que se normalicen los puntos
    expect(datos["RIGE DESDE"]).toBe("01-01-2025");
    expect(datos["HASTA"]).toBe("31-12-2025");
    expect(datos["POLIZA N°"]).toBe("POL123");
    expect(datos["PRIMA"]).toBe("100.50");
  });

  test("bestEffortValidationSoap debe emitir warnings si hay campos inválidos", () => {
    const datosInvalidos = {
      "INSCRIPCION R.V.M": "INVALID_FORMAT!",
      "Bajo el codigo": "",
      "RUT": "123",
      "RIGE DESDE": "01/01/2025",
      "HASTA": "31/12/2025",
      "POLIZA N°": "POL123",
      "PRIMA": "abc" // valor no numérico
    };

    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
    bestEffortValidationSoap(datosInvalidos, "testFile.pdf");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
