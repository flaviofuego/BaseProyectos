/**
 * Global Setup para Jest
 * Se ejecuta una vez antes de todas las suites de test
 */

const { startContainers } = require('./testcontainers');

module.exports = async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');

  // Configurar timeout largo para inicio de contenedores
  const startTime = Date.now();

  try {
    // Iniciar contenedores
    const connections = await startContainers({
      withPostgres: true,
      withRedis: true,
      applyMigrations: true
    });

    // Guardar URLs para uso en tests
    globalThis.__TEST_DATABASE_URL__ = connections.DATABASE_URL;
    globalThis.__TEST_REDIS_URL__ = connections.REDIS_URL;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Global setup completed in ${duration}s\n`);
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
};
