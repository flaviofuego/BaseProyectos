module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/integration/**",
    "!jest.config.js",
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/*.test.js",
    "!**/integration/**/*.test.js", // Excluir tests de integración por defecto
  ],
  verbose: true,
  testTimeout: 10000,
};
