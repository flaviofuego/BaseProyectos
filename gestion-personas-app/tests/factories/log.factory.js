/**
 * Factory para generar datos de logs de transacciones para testing
 */

// Generador de números aleatorios
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TRANSACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'QUERY', 'NLP_QUERY', 'LOGIN', 'LOGOUT'];
const ENTITY_TYPES = ['PERSONA', 'USER', 'NLP_QUERY_V2'];
const STATUSES = ['SUCCESS', 'ERROR'];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0'
];

/**
 * Genera una dirección IP aleatoria
 * @returns {string} IP v4
 */
const generateIP = () => {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
};

/**
 * Genera un número de documento
 * @returns {string} Número de documento de 10 dígitos
 */
const generateDocumento = () => {
  return String(randomInt(1000000000, 9999999999));
};

/**
 * Crea un objeto log de transacción con datos generados o personalizados
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Objeto log válido
 */
const createLog = (overrides = {}) => {
  const transactionType = overrides.transaction_type || randomElement(TRANSACTION_TYPES);
  const status = overrides.status || (Math.random() > 0.1 ? 'SUCCESS' : 'ERROR');
  
  return {
    transaction_type: transactionType,
    entity_type: randomElement(ENTITY_TYPES),
    entity_id: randomInt(1, 1000),
    numero_documento: generateDocumento(),
    user_id: randomInt(1, 10),
    ip_address: generateIP(),
    user_agent: randomElement(USER_AGENTS),
    request_data: { action: transactionType.toLowerCase() },
    response_data: status === 'SUCCESS' ? { success: true } : null,
    status: status,
    error_message: status === 'ERROR' ? 'Test error message' : null,
    ...overrides
  };
};

/**
 * Crea múltiples logs
 * @param {number} count - Número de logs a crear
 * @param {Object} overrides - Campos base para todos los logs
 * @returns {Array<Object>} Array de logs
 */
const createManyLogs = (count, overrides = {}) => {
  return Array.from({ length: count }, () => createLog(overrides));
};

/**
 * Crea un log de creación de persona
 * @param {number} entityId - ID de la persona creada
 * @param {string} numeroDocumento - Número de documento
 * @param {number} userId - ID del usuario que realizó la acción
 * @param {Object} overrides - Campos adicionales
 * @returns {Object} Log de creación
 */
const createPersonaCreateLog = (entityId, numeroDocumento, userId, overrides = {}) => ({
  transaction_type: 'CREATE',
  entity_type: 'PERSONA',
  entity_id: entityId,
  numero_documento: numeroDocumento,
  user_id: userId,
  ip_address: generateIP(),
  user_agent: randomElement(USER_AGENTS),
  request_data: { numero_documento: numeroDocumento },
  response_data: { id: entityId, success: true },
  status: 'SUCCESS',
  error_message: null,
  ...overrides
});

/**
 * Crea un log de consulta NLP
 * @param {number} userId - ID del usuario
 * @param {string} query - Consulta realizada
 * @param {Object} overrides - Campos adicionales
 * @returns {Object} Log de consulta NLP
 */
const createNLPQueryLog = (userId, query, overrides = {}) => ({
  transaction_type: 'NLP_QUERY',
  entity_type: 'NLP_QUERY_V2',
  entity_id: null,
  numero_documento: null,
  user_id: userId,
  ip_address: generateIP(),
  user_agent: randomElement(USER_AGENTS),
  request_data: { query, timestamp: new Date().toISOString() },
  response_data: { results_count: randomInt(0, 50), processing_time_ms: randomInt(100, 3000) },
  status: 'SUCCESS',
  error_message: null,
  ...overrides
});

/**
 * Crea un log de error
 * @param {string} transactionType - Tipo de transacción
 * @param {string} errorMessage - Mensaje de error
 * @param {Object} overrides - Campos adicionales
 * @returns {Object} Log de error
 */
const createErrorLog = (transactionType, errorMessage, overrides = {}) => ({
  transaction_type: transactionType,
  entity_type: randomElement(ENTITY_TYPES),
  entity_id: null,
  numero_documento: null,
  user_id: overrides.user_id || randomInt(1, 10),
  ip_address: generateIP(),
  user_agent: randomElement(USER_AGENTS),
  request_data: overrides.request_data || {},
  response_data: null,
  status: 'ERROR',
  error_message: errorMessage,
  ...overrides
});

module.exports = {
  createLog,
  createManyLogs,
  createPersonaCreateLog,
  createNLPQueryLog,
  createErrorLog,
  generateIP,
  TRANSACTION_TYPES,
  ENTITY_TYPES,
  STATUSES
};
