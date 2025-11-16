module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/tests/integration/**",
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
  testMatch: ["**/tests/unit/**/*.test.js", "**/*.unit.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/integration/"],
  verbose: true,
  testTimeout: 10000,
};
