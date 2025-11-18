module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.test.js"],
  verbose: true,
  testTimeout: 240000, // 4 minutos para Azure AI y setup
  collectCoverage: false,
  maxWorkers: 1, // Run serially for integration tests
  detectOpenHandles: true,
  forceExit: true,
};
