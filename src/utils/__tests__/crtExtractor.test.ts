// __tests__/crtExtractor.test.ts
import { extraerDatosCRT } from "@/extractors/crtExtractor";

describe("crtExtractor", () => {
  test("debe extraer correctamente los datos de un PDF CRT", () => {
    const sampleText = `
      FECHA REVISIÓN: 10 OCTUBRE 2023
      PLANTA: PLANTA-01
      PLACA PATENTE ABC123
      VÁLIDO HASTA: DICIEMBRE 2023
    `;
    const datos = extraerDatosCRT(sampleText);
    expect(datos["Fecha de Revisión"]).toBe("10 OCTUBRE 2023");
    expect(datos["Planta"]).toBe("PLANTA-01");
    expect(datos["Placa Patente"]).toBe("ABC123");
    expect(datos["Válido Hasta"]).toBe("DICIEMBRE 2023");
  });
});
