// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./specs",
  // Ignorar temporalmente los tests de NLP (CU-012) hasta que la funcionalidad esté lista
  testIgnore: ["**/07-consulta-nlp.spec.js"],

  // Timeout para cada test
  timeout: 30 * 1000,

  // Configuración de expect
  expect: {
    timeout: 5000,
  },

  // Configuración de ejecución
  fullyParallel: false, // Ejecutar tests en serie para evitar conflictos
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Un worker para evitar conflictos de datos

  // Reporter
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Configuración compartida para todos los tests
  use: {
    // URL base de la aplicación
    baseURL: process.env.BASE_URL || "http://localhost:5000",

    // Trace en caso de fallo
    trace: "retain-on-failure",

    // Screenshot en caso de fallo
    screenshot: "only-on-failure",

    // Video en caso de fallo
    video: "retain-on-failure",

    // Timeout para acciones
    actionTimeout: 10 * 1000,

    // Timeout para navegación
    navigationTimeout: 15 * 1000,
  },

  // Proyectos de navegadores
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Descomenta para probar en otros navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Servidor local (opcional, si quieres que Playwright lo levante)
  // webServer: {
  //   command: 'docker-compose up',
  //   url: 'http://localhost:5001',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
