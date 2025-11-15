module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Directorios de tests
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js'
  ],
  
  // Ignorar estos directorios
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Configuración de cobertura
  collectCoverage: true,
  coverageDirectory: '../results/coverage/auth',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.integration.config.js'
  ],
  
  // Thresholds mínimos de cobertura
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Reporteros
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout para tests
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks entre tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Variables de entorno para tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
