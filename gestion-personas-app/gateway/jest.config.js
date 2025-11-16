module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!tests/integration/**",
    "!jest.integration.config.js",
  ],
  testMatch: ["**/tests/unit/**/*.test.js", "**/*.unit.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/integration/"],
  verbose: true,
  testTimeout: 15000,
};
