/**
 * Factory para generar datos de usuarios para testing
 * Genera datos aleatorios pero válidos según el esquema de la BD
 */

const bcrypt = require('bcrypt');

// Generador de números aleatorios
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const USERNAMES = ['john', 'jane', 'mike', 'sarah', 'alex', 'emma', 'chris', 'lisa', 'david', 'anna'];
const DOMINIOS = ['gmail.com', 'outlook.com', 'empresa.com', 'test.com'];
const PROVIDERS = ['local', 'google', 'microsoft', 'github'];

// Password hash precalculado para 'Test123!' (bcrypt rounds: 4 para tests rápidos)
const DEFAULT_PASSWORD_HASH = '$2b$04$K8lgAt.ZHurAIqx4YmMuv.ry2BQ3vT4f6A/OgwGRBBqgf9nJgOGhu';

/**
 * Genera un username único
 * @returns {string} Username único
 */
const generateUsername = () => {
  const base = randomElement(USERNAMES);
  const suffix = randomInt(1000, 9999);
  return `${base}${suffix}`;
};

/**
 * Genera un email único
 * @param {string} username - Username base
 * @returns {string} Email generado
 */
const generateEmail = (username) => {
  const dominio = randomElement(DOMINIOS);
  return `${username}@${dominio}`;
};

/**
 * Genera un hash de password (síncrono para tests)
 * @param {string} password - Password en texto plano
 * @returns {string} Hash bcrypt
 */
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 4); // Rounds bajos para tests rápidos
};

/**
 * Crea un objeto usuario con datos generados o personalizados
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Objeto usuario válido
 */
const createUser = (overrides = {}) => {
  const username = overrides.username || generateUsername();
  
  return {
    username,
    email: generateEmail(username),
    password_hash: DEFAULT_PASSWORD_HASH, // 'Test123!'
    provider: 'local',
    provider_id: null,
    ...overrides
  };
};

/**
 * Crea múltiples usuarios
 * @param {number} count - Número de usuarios a crear
 * @param {Object} overrides - Campos base para todos los usuarios
 * @returns {Array<Object>} Array de usuarios
 */
const createManyUsers = (count, overrides = {}) => {
  return Array.from({ length: count }, () => createUser(overrides));
};

/**
 * Crea un usuario OAuth (sin password hash)
 * @param {string} provider - Proveedor OAuth (google, microsoft, etc.)
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Usuario OAuth
 */
const createOAuthUser = (provider = 'google', overrides = {}) => {
  const username = overrides.username || generateUsername();
  return {
    username,
    email: generateEmail(username),
    password_hash: null,
    provider,
    provider_id: `oauth_${provider}_${randomInt(100000, 999999)}`,
    ...overrides
  };
};

/**
 * Crea el usuario admin por defecto
 * @returns {Object} Usuario admin
 */
const createAdminUser = () => ({
  username: 'admin',
  email: 'admin@example.com',
  password_hash: DEFAULT_PASSWORD_HASH, // 'admin123' o 'Test123!'
  provider: 'local',
  provider_id: null
});

/**
 * Crea preferencias de usuario
 * @param {number} userId - ID del usuario
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Preferencias de usuario
 */
const createUserPreferences = (userId, overrides = {}) => ({
  user_id: userId,
  consulta_service_enabled: true,
  ...overrides
});

module.exports = {
  createUser,
  createManyUsers,
  createOAuthUser,
  createAdminUser,
  createUserPreferences,
  generateUsername,
  generateEmail,
  hashPassword,
  DEFAULT_PASSWORD_HASH,
  PROVIDERS
};
