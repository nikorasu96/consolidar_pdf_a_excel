// __tests__/homologacionExtractor.test.ts
import { extraerDatosHomologacion } from "@/extractors/homologacionExtractor";

describe("homologacionExtractor", () => {
  test("debe extraer correctamente los datos de homologación", () => {
    const sampleText = `
      FECHA DE EMISIÓN 01/01/2025
      Nº CORRELATIVO ABC-123
      CÓDIGO DE INFORME TÉCNICO XYZ-789
      PATENTE ABC123
      VÁLIDO HASTA 31/12/2025
      TIPO DE VEHÍCULO CAMION
      MARCA TOYOTA
      AÑO 2020
      MODELO Corolla COLOR AZUL
      VIN 1HGCM82633A004352
      Nº MOTOR 123456789
      Firmado por: JUAN PÉREZ
    `;
    const datos = extraerDatosHomologacion(sampleText);
    expect(datos["Fecha de Emisión"]).toBe("01/01/2025");
    expect(datos["Nº Correlativo"]).toBe("ABC-123");
    expect(datos["Código Informe Técnico"]).toBe("XYZ-789");
    // Puedes agregar más aserciones según la extracción
  });
});
