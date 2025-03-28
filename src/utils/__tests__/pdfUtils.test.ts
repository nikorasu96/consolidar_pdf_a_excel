// import {
//   buscar,
//   extraerDatos,
//   extraerDatosEmisiones,
//   sanitizarNombre
// } from "@/utils/pdfUtils";

// describe("pdfUtils (funciones básicas)", () => {
//   const sampleText = `
//     FECHA DE EMISIÓN 01/01/2025
//     Nº CORRELATIVO ABC-123
//     CÓDIGO DE INFORME TÉCNICO XYZ-789
//     PATENTE ABC123
//     VÁLIDO HASTA 31/12/2025
//     TIPO DE VEHÍCULO CAMION
//     MARCA TOYOTA
//     AÑO 2020
//     MODELO Corolla COLOR AZUL
//     VIN 1HGCM82633A004352
//     Nº MOTOR 123456789
//     Firmado por: JUAN PÉREZ
//   `;

//   test("buscar() debe extraer correctamente un valor", () => {
//     const fecha = buscar(sampleText, /FECHA DE EMISIÓN\s+([0-9A-Z\/]+)/i);
//     expect(fecha).toBe("01/01/2025");
//   });

//   test("buscar() debe retornar null si no hay coincidencia", () => {
//     const result = buscar("Texto sin coincidencia", /NoExiste\s+(\d+)/i);
//     expect(result).toBeNull();
//   });

//   test("extraerDatos() extrae campos básicos", () => {
//     const datos = extraerDatos(sampleText);
//     expect(datos["Fecha de Emisión"]).toBe("01/01/2025");
//     expect(datos["Marca"]).toBe("TOYOTA");
//     // etc.
//   });

//   test("extraerDatosEmisiones() maneja formato de emisiones", () => {
//     const revisionText = `
//       FECHA REVISIÓN: 12 MAYO 2023
//       PLANTA: ABC-123
//       PLACA PATENTE XYZ789 ELECTR
//       FIRMA ELECTRÓNICA AVANZADA JUAN PÉREZ V
//       VÁLIDO HASTA FECHA REVISIÓN: ENERO 2025
//     `;
//     const datos = extraerDatosEmisiones(revisionText);
//     expect(datos["Fecha de Revisión"]).toBe("12 MAYO 2023");
//     expect(datos["Planta"]).toBe("ABC-123");
//     expect(datos["Placa Patente"]).toBe("XYZ789");
//     // etc.
//   });

//   test("sanitizarNombre() elimina acentos y caracteres no permitidos", () => {
//     const nombreOriginal = "Certificado de Homologación: Prueba 2025";
//     const nombreSanitizado = sanitizarNombre(nombreOriginal);
//     expect(nombreSanitizado).toBe("Certificado de Homologacion_ Prueba 2025");
//   });
// });
