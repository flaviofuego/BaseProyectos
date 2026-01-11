/**
 * Utilidades comunes para tests
 */

const path = require('path');
const fs = require('fs');

/**
 * Carga un fixture JSON
 * @param {string} fixtureName - Nombre del fixture sin extensión
 * @returns {Object} Contenido del fixture
 */
const loadFixture = (fixtureName) => {
  const fixturePath = path.join(__dirname, '..', 'fixtures', `${fixtureName}.json`);
  const content = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(content);
};

/**
 * Espera un tiempo determinado
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Genera un token JWT temporal para tests
 * @param {number} userId - ID del usuario
 * @param {string} username - Username
 * @returns {string} Token temporal
 */
const generateTempToken = (userId = 1, username = 'admin') => {
  return `temp-${username}-token`;
};

/**
 * Crea headers de autorización para tests
 * @param {string} token - Token de autorización
 * @returns {Object} Headers
 */
const createAuthHeaders = (token = 'temp-admin-token') => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

/**
 * Compara fechas ignorando milisegundos
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {boolean} true si son iguales (ignorando ms)
 */
const datesEqual = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d1.getTime() - d2.getTime()) < 1000;
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param {string|Date} fechaNacimiento - Fecha de nacimiento
 * @returns {number} Edad en años
 */
const calculateAge = (fechaNacimiento) => {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Limpia un objeto de propiedades undefined/null
 * @param {Object} obj - Objeto a limpiar
 * @returns {Object} Objeto limpio
 */
const cleanObject = (obj) => {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
};

/**
 * Verifica si una respuesta tiene el formato de error esperado
 * @param {Object} response - Respuesta HTTP
 * @param {number} statusCode - Código de estado esperado
 * @returns {boolean}
 */
const isErrorResponse = (response, statusCode) => {
  return response.status === statusCode && 
         (response.body.error || response.body.message);
};

/**
 * Mock de request para tests unitarios
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Mock de request
 */
const mockRequest = (overrides = {}) => ({
  headers: {
    'user-agent': 'Jest Test Runner',
    'content-type': 'application/json',
    ...overrides.headers
  },
  ip: '127.0.0.1',
  body: {},
  query: {},
  params: {},
  ...overrides
});

/**
 * Mock de response para tests unitarios
 * @returns {Object} Mock de response con métodos jest
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Genera datos de prueba para bulk upload (CSV)
 * @param {number} count - Número de registros
 * @returns {string} Contenido CSV
 */
const generateBulkCSV = (count = 5) => {
  const { createManyPersonas } = require('../factories');
  const personas = createManyPersonas(count);
  
  const headers = [
    'numero_documento', 'tipo_documento', 'primer_nombre', 'segundo_nombre',
    'apellidos', 'fecha_nacimiento', 'genero', 'correo_electronico', 'celular'
  ];
  
  const rows = personas.map(p => headers.map(h => p[h] || '').join(','));
  return [headers.join(','), ...rows].join('\n');
};

module.exports = {
  loadFixture,
  sleep,
  generateTempToken,
  createAuthHeaders,
  datesEqual,
  calculateAge,
  cleanObject,
  isErrorResponse,
  mockRequest,
  mockResponse,
  generateBulkCSV
};
