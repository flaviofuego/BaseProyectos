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
  testTimeout: 60000, // 1 minuto (Service Registry no usa contenedores)
  maxWorkers: 1, // Ejecutar tests secuencialmente
  forceExit: true,
  detectOpenHandles: true,
};
