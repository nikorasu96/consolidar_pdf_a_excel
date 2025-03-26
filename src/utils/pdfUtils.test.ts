// src/utils/__tests__/pdfUtils.test.ts

// Importa las funciones que se van a testear.
import { buscar, extraerDatos } from "../utils/pdfUtils";

describe("pdfUtils", () => {
  // Texto de muestra para las pruebas.
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

  test("debe extraer correctamente un valor usando buscar()", () => {
    const fecha = buscar(sampleText, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/);
    expect(fecha).toBe("01/01/2025");
  });

  test("debe extraer todos los datos correctamente", () => {
    const datos = extraerDatos(sampleText);
    expect(datos["Fecha de Emisión"]).toBe("01/01/2025");
    expect(datos["Nº Correlativo"]).toBe("ABC-123");
    expect(datos["Código Informe Técnico"]).toBe("XYZ-789");
    expect(datos["Patente"]).toBe("ABC123");
    expect(datos["Válido Hasta"]).toBe("31/12/2025");
    expect(datos["Tipo de Vehículo"]).toBe("CAMION");
    expect(datos["Marca"]).toBe("TOYOTA");
    expect(datos["Año"]).toBe("2020");
    expect(datos["Modelo"]).toBe("Corolla");
    expect(datos["Color"]).toBe("AZUL");
    expect(datos["VIN"]).toBe("1HGCM82633A004352");
    expect(datos["Nº Motor"]).toBe("123456789");
    expect(datos["Firmado por"]).toBe("JUAN PÉREZ");
  });
});
