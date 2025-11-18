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
  testMatch: ["**/tests/integration/**/*.integration.test.js"],
  verbose: true,
  testTimeout: 60000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
};
