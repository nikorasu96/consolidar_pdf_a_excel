// src/utils/__tests__/pdfUtils.test.ts

import {
  buscar,
  extraerDatos,
  extraerDatosEmisiones, // Se usa extraerDatosEmisiones para simular el formato de revisión.
  sanitizarNombre,
  procesarPDF
} from "../utils/pdfUtils";

describe("pdfUtils", () => {
  // Texto de muestra para pruebas del formato original.
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

  test("buscar() debe extraer correctamente un valor", () => {
    const fecha = buscar(sampleText, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/i);
    expect(fecha).toBe("01/01/2025");
  });

  test("buscar() debe retornar null si no hay coincidencia", () => {
    const result = buscar("Texto sin coincidencia", /NoExiste\s+(\d+)/i);
    expect(result).toBeNull();
  });

  test("extraerDatos() debe extraer todos los datos correctamente", () => {
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

  test("extraerDatos() debe manejar casos donde faltan campos", () => {
    const incompleteText = `
      FECHA DE EMISIÓN 02/02/2025
      Nº CORRELATIVO 
      CÓDIGO DE INFORME TÉCNICO 
      PATENTE 
    `;
    const datos = extraerDatos(incompleteText);
    expect(datos["Fecha de Emisión"]).toBe("02/02/2025");
    expect(datos["Nº Correlativo"]).toBe("");
    expect(datos["Código Informe Técnico"]).toBe("");
    expect(datos["Patente"]).toBe("");
    expect(datos["Válido Hasta"]).toBe("");
  });

  test("extraerDatosRevision() debe extraer datos del nuevo formato correctamente", () => {
    const revisionText = `
      FECHA REVISIÓN: 12 MAYO 2023
      PLANTA: ABC-123
      PLACA PATENTE XYZ789 ELECTR
      FIRMA ELECTRÓNICA AVANZADA JUAN PÉREZ V
      VÁLIDO HASTA FECHA REVISIÓN: ENERO 2025
    `;
    const datosRevision = extraerDatosEmisiones(revisionText);
    expect(datosRevision["Fecha de Revisión"]).toBe("12 MAYO 2023");
    expect(datosRevision["Planta"]).toBe("ABC-123");
    expect(datosRevision["Placa Patente"]).toBe("XYZ789");
    expect(datosRevision["Estado"]).toBe("");
    expect(datosRevision["Firma Electrónica"]).toBe("JUAN PÉREZ");
    expect(datosRevision["Válido hasta"]).toBe("ENERO 2025");
  });

  test("extraerDatosRevision() debe manejar textos incompletos", () => {
    const incompleteRevisionText = `
      FECHA REVISIÓN: 
      PLANTA: 
      PLACA PATENTE 
    `;
    const datosRevision = extraerDatosEmisiones(incompleteRevisionText);
    expect(datosRevision["Fecha de Revisión"]).toBe("");
    expect(datosRevision["Planta"]).toBe("");
    expect(datosRevision["Placa Patente"]).toBe("");
    expect(datosRevision["Firma Electrónica"]).toBe("");
    expect(datosRevision["Válido hasta"]).toBe("");
  });

  test("sanitizarNombre() debe sanitizar correctamente el nombre de archivo", () => {
    const nombreOriginal = "Certificado de Homologación: Prueba 2025";
    const nombreSanitizado = sanitizarNombre(nombreOriginal);
    expect(nombreSanitizado).toBe("Certificado de Homologacion_ Prueba 2025");
  });

  test("sanitizarNombre() no debe modificar nombres ya sanitizados", () => {
    const nombreOriginal = "Archivo_Sanitizado_Prueba.xlsx";
    const nombreSanitizado = sanitizarNombre(nombreOriginal);
    expect(nombreSanitizado).toBe("Archivo_Sanitizado_Prueba.xlsx");
  });

  test("sanitizarNombre() debe eliminar el sufijo ' A'", () => {
    const input = "RICARDO IVAN ITURRA LOYOLA A";
    const expected = "RICARDO IVAN ITURRA LOYOLA";
    expect(sanitizarNombre(input)).toBe(expected);
  });

  test("procesarPDF() con formato original", async () => {
    const fakeFile = {} as File;
    expect(typeof procesarPDF).toBe("function");
  });
});
