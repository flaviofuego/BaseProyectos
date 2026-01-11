/**
 * Jest configuration for integration tests with Testcontainers
 */

module.exports = {
  // Usar la raíz del proyecto
  rootDir: '../../',
  
  // Archivos de test
  testMatch: [
    '<rootDir>/**/tests/integration/**/*.test.js',
    '<rootDir>/**/tests/integration/**/*.integration.test.js'
  ],
  
  // Setup global (contenedores)
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  
  // Entorno
  testEnvironment: 'node',
  
  // Timeout largo para operaciones con contenedores
  testTimeout: 60000,
  
  // Ejecutar tests secuencialmente para evitar conflictos
  maxWorkers: 1,
  
  // Cobertura
  collectCoverageFrom: [
    'services/**/index.js',
    'gateway/index.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Reporteros
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Integration Test Report',
      outputPath: './tests/results/integration-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  
  // Variables de entorno
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.env.js'],
  
  // Transformaciones
  transform: {},
  
  // Verbose output
  verbose: true,
  
  // Detectar handles abiertos
  detectOpenHandles: true,
  forceExit: true
};
