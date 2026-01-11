/**
 * Jest Environment Setup
 * Se ejecuta después del setup global pero antes de cada archivo de test
 */

// Establecer variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret';

// Usar URLs de contenedores si están disponibles
if (globalThis.__TEST_DATABASE_URL__) {
  process.env.DATABASE_URL = globalThis.__TEST_DATABASE_URL__;
}
if (globalThis.__TEST_REDIS_URL__) {
  process.env.REDIS_URL = globalThis.__TEST_REDIS_URL__;
}

// Deshabilitar rate limiting en tests
process.env.DISABLE_RATE_LIMIT = '1';

// Deshabilitar logs verbosos
process.env.LOG_LEVEL = 'error';

// Service Registry (mock URL para tests)
process.env.SERVICE_REGISTRY_URL = 'http://localhost:3010';
process.env.SERVICE_REGISTRY_ENABLE_CRON = 'false';

// Aumentar timeout de Jest para operaciones lentas
jest.setTimeout(30000);

// Matchers personalizados
expect.extend({
  /**
   * Verifica que un objeto tenga las propiedades de una persona válida
   */
  toBeValidPersona(received) {
    const requiredFields = [
      'numero_documento', 'tipo_documento', 'primer_nombre',
      'apellidos', 'fecha_nacimiento', 'genero',
      'correo_electronico', 'celular'
    ];
    
    const missingFields = requiredFields.filter(f => !received[f]);
    
    if (missingFields.length > 0) {
      return {
        pass: false,
        message: () => `Expected persona to have fields: ${missingFields.join(', ')}`
      };
    }
    
    return { pass: true, message: () => 'Persona is valid' };
  },

  /**
   * Verifica que una respuesta sea exitosa (status 2xx)
   */
  toBeSuccessResponse(received) {
    const pass = received.status >= 200 && received.status < 300;
    return {
      pass,
      message: () => pass 
        ? `Expected response not to be successful (${received.status})`
        : `Expected successful response, got ${received.status}: ${JSON.stringify(received.body)}`
    };
  },

  /**
   * Verifica que una respuesta sea un error con código específico
   */
  toBeErrorResponse(received, expectedStatus) {
    const pass = received.status === expectedStatus;
    return {
      pass,
      message: () => pass
        ? `Expected response not to be error ${expectedStatus}`
        : `Expected error ${expectedStatus}, got ${received.status}`
    };
  }
});

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
