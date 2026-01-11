/**
 * Configuración de Testcontainers para tests de integración
 * Proporciona contenedores PostgreSQL y Redis aislados para cada suite de tests
 */

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer, Wait } = require('testcontainers');
const { Pool } = require('pg');
const redis = require('redis');
const path = require('path');
const fs = require('fs');

// Configuración global de contenedores
let postgresContainer = null;
let redisContainer = null;
let pgPool = null;
let redisClient = null;

/**
 * Inicia los contenedores de test
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object>} URLs de conexión
 */
async function startContainers(options = {}) {
  const { 
    withPostgres = true, 
    withRedis = true,
    applyMigrations = true 
  } = options;

  const connections = {};

  // PostgreSQL
  if (withPostgres && !postgresContainer) {
    console.log('🐘 Starting PostgreSQL container...');
    
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .withStartupTimeout(60000)
      .start();

    const postgresUrl = `postgresql://test_user:test_password@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/test_db`;
    connections.DATABASE_URL = postgresUrl;
    process.env.DATABASE_URL = postgresUrl;

    // Crear pool de conexión
    pgPool = new Pool({ connectionString: postgresUrl });

    // Aplicar migraciones si es necesario
    if (applyMigrations) {
      await applyDatabaseMigrations(pgPool);
    }

    console.log(`✅ PostgreSQL ready at port ${postgresContainer.getMappedPort(5432)}`);
  }

  // Redis
  if (withRedis && !redisContainer) {
    console.log('🔴 Starting Redis container...');
    
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .withStartupTimeout(30000)
      .start();

    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
    connections.REDIS_URL = redisUrl;
    process.env.REDIS_URL = redisUrl;

    // Crear cliente Redis
    redisClient = redis.createClient({ url: redisUrl });
    await redisClient.connect();

    console.log(`✅ Redis ready at port ${redisContainer.getMappedPort(6379)}`);
  }

  return connections;
}

/**
 * Aplica las migraciones de Flyway manualmente
 * @param {Pool} pool - Pool de conexión PostgreSQL
 */
async function applyDatabaseMigrations(pool) {
  console.log('📦 Applying database migrations...');
  
  const migrationsDir = path.join(__dirname, '../../database/flyway/sql');
  
  // Verificar si existe el directorio de migraciones
  if (!fs.existsSync(migrationsDir)) {
    console.warn('⚠️ Migrations directory not found, using init.sql fallback');
    const initSql = path.join(__dirname, '../../database/init.sql');
    if (fs.existsSync(initSql)) {
      const sql = fs.readFileSync(initSql, 'utf8');
      await pool.query(sql);
    }
    return;
  }

  // Obtener archivos de migración ordenados
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`  📝 Applying: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
    } catch (error) {
      // Ignorar errores de "already exists" para idempotencia
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  console.log('✅ Migrations applied successfully');
}

/**
 * Detiene todos los contenedores
 */
async function stopContainers() {
  console.log('🛑 Stopping test containers...');

  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }

  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }

  if (redisContainer) {
    await redisContainer.stop();
    redisContainer = null;
  }

  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }

  console.log('✅ All containers stopped');
}

/**
 * Limpia las tablas de la base de datos (truncate)
 * @param {Array<string>} tables - Tablas a limpiar (default: todas)
 */
async function cleanDatabase(tables = ['transaction_logs', 'personas', 'user_preferences', 'users']) {
  if (!pgPool) return;

  // Desactivar triggers temporalmente
  await pgPool.query('SET session_replication_role = replica;');
  
  for (const table of tables) {
    try {
      await pgPool.query(`TRUNCATE TABLE ${table} CASCADE;`);
    } catch (error) {
      // Ignorar si la tabla no existe
      if (!error.message.includes('does not exist')) {
        console.warn(`Warning truncating ${table}:`, error.message);
      }
    }
  }

  // Reactivar triggers
  await pgPool.query('SET session_replication_role = DEFAULT;');

  // Reinsertar usuario admin
  await pgPool.query(`
    INSERT INTO users (username, email, password_hash, provider) 
    VALUES ('admin', 'admin@example.com', '$2b$04$K8lgAt.ZHurAIqx4YmMuv.ry2BQ3vT4f6A/OgwGRBBqgf9nJgOGhu', 'local')
    ON CONFLICT (username) DO NOTHING;
  `);
}

/**
 * Limpia el cache de Redis
 */
async function cleanRedis() {
  if (redisClient) {
    await redisClient.flushAll();
  }
}

/**
 * Obtiene el pool de PostgreSQL
 * @returns {Pool}
 */
function getPool() {
  return pgPool;
}

/**
 * Obtiene el cliente de Redis
 * @returns {RedisClient}
 */
function getRedisClient() {
  return redisClient;
}

/**
 * Seed de datos de prueba
 * @param {Object} fixtures - Datos a insertar
 */
async function seedDatabase(fixtures = {}) {
  if (!pgPool) return;

  const { users = [], personas = [], logs = [] } = fixtures;

  // Insertar usuarios
  for (const user of users) {
    await pgPool.query(`
      INSERT INTO users (username, email, password_hash, provider, provider_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, [user.username, user.email, user.password_hash, user.provider, user.provider_id]);
  }

  // Insertar personas
  for (const persona of personas) {
    await pgPool.query(`
      INSERT INTO personas (numero_documento, tipo_documento, primer_nombre, segundo_nombre, 
                           apellidos, fecha_nacimiento, genero, correo_electronico, celular)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (numero_documento) DO NOTHING
    `, [
      persona.numero_documento, persona.tipo_documento, persona.primer_nombre,
      persona.segundo_nombre, persona.apellidos, persona.fecha_nacimiento,
      persona.genero, persona.correo_electronico, persona.celular
    ]);
  }

  // Insertar logs
  for (const log of logs) {
    await pgPool.query(`
      INSERT INTO transaction_logs (transaction_type, entity_type, entity_id, numero_documento,
                                   user_id, ip_address, user_agent, request_data, response_data, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      log.transaction_type, log.entity_type, log.entity_id, log.numero_documento,
      log.user_id, log.ip_address, log.user_agent, 
      JSON.stringify(log.request_data), JSON.stringify(log.response_data),
      log.status, log.error_message
    ]);
  }
}

module.exports = {
  startContainers,
  stopContainers,
  cleanDatabase,
  cleanRedis,
  getPool,
  getRedisClient,
  seedDatabase,
  applyDatabaseMigrations
};
