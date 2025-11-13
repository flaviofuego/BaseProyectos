module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js", "**/*.unit.test.js", "**/unit/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/integration/"]
};
