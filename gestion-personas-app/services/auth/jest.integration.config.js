module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage-integration",
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/coverage-integration/**",
    "!jest.config.js",
    "!jest.integration.config.js",
  ],
  testMatch: ["**/integration/**/*.integration.test.js"],
  verbose: true,
  testTimeout: 180000, // 3 minutos para tests de integración (contenedores toman tiempo)
  maxWorkers: 1, // Ejecutar tests de integración secuencialmente
  forceExit: true, // Forzar salida después de tests (necesario con contenedores)
  detectOpenHandles: true, // Detectar handles abiertos
};
