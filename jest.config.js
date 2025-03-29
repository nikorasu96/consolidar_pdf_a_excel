// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Mapeos de alias para "@/..."
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/../../types/(.*)$": "<rootDir>/types/$1",
  },
  // Transformar módulos ESM en node_modules (p-limit, yocto-queue)
  transformIgnorePatterns: [
    "/node_modules/(?!p-limit|yocto-queue)"
  ],
  // Soporte para .ts, .tsx y .mjs
  transform: {
    "^.+\\.(ts|tsx|mjs)$": "ts-jest",
  },
  testMatch: [
    "<rootDir>/src/**/*.test.(ts|tsx)",
    "<rootDir>/__tests__/**/*.test.(ts|tsx)"
  ],
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],

  
};
