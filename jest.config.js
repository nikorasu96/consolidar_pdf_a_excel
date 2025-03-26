// jest.config.js

// Configuración de Jest para ejecutar pruebas en un entorno Node.
// Se define el transformador para TypeScript y se especifica el patrón de archivos de prueba.
module.exports = {
    testEnvironment: "node",
    transform: {
      "^.+\\.(ts|tsx)$": "ts-jest",
    },
    testMatch: ["**/*.test.ts"],
    moduleFileExtensions: ["ts", "js"],
  };
  