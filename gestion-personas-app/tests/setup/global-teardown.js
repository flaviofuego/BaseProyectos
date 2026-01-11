/**
 * Global Teardown para Jest
 * Se ejecuta una vez después de todas las suites de test
 */

const { stopContainers } = require('./testcontainers');

module.exports = async function globalTeardown() {
  console.log('\n🧹 Starting global test teardown...\n');

  try {
    await stopContainers();
    console.log('✅ Global teardown completed\n');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // No lanzar error para no ocultar errores de tests
  }
};
