/**
 * Factory para generar datos de personas para testing
 * Genera datos aleatorios pero válidos según el esquema de la BD
 */

// Generador de números aleatorios
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Datos de ejemplo para generación
const NOMBRES_MASCULINOS = ['Juan', 'Carlos', 'Miguel', 'José', 'Pedro', 'Luis', 'Andrés', 'David', 'Diego', 'Santiago'];
const NOMBRES_FEMENINOS = ['María', 'Ana', 'Laura', 'Carmen', 'Sofía', 'Isabella', 'Valentina', 'Camila', 'Lucía', 'Paula'];
const APELLIDOS = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
const TIPOS_DOCUMENTO = ['Cédula', 'Tarjeta de identidad'];
const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no reportar'];
const DOMINIOS_EMAIL = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'empresa.com'];

/**
 * Genera un número de documento único
 * @returns {string} Número de documento de 10 dígitos
 */
const generateDocumento = () => {
  return String(randomInt(1000000000, 9999999999));
};

/**
 * Genera un número de celular colombiano
 * @returns {string} Número de celular de 10 dígitos
 */
const generateCelular = () => {
  const prefijos = ['300', '301', '302', '310', '311', '312', '320', '321'];
  return randomElement(prefijos) + String(randomInt(1000000, 9999999));
};

/**
 * Genera una fecha de nacimiento
 * @param {Object} options - Opciones de generación
 * @param {number} options.minAge - Edad mínima (default: 1)
 * @param {number} options.maxAge - Edad máxima (default: 90)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
const generateFechaNacimiento = ({ minAge = 1, maxAge = 90 } = {}) => {
  const today = new Date();
  const age = randomInt(minAge, maxAge);
  const year = today.getFullYear() - age;
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Genera un correo electrónico basado en nombre y apellido
 * @param {string} nombre - Primer nombre
 * @param {string} apellido - Apellido
 * @returns {string} Email generado
 */
const generateEmail = (nombre, apellido) => {
  const separadores = ['.', '_', ''];
  const sep = randomElement(separadores);
  const dominio = randomElement(DOMINIOS_EMAIL);
  const num = randomInt(1, 999);
  return `${nombre.toLowerCase()}${sep}${apellido.toLowerCase()}${num}@${dominio}`;
};

/**
 * Crea un objeto persona con datos generados o personalizados
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Objeto persona válido
 */
const createPersona = (overrides = {}) => {
  const genero = overrides.genero || randomElement(GENEROS);
  const esMasculino = genero === 'Masculino';
  const nombres = esMasculino ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;
  
  const primerNombre = overrides.primer_nombre || randomElement(nombres);
  const segundoNombre = overrides.segundo_nombre !== undefined 
    ? overrides.segundo_nombre 
    : (Math.random() > 0.3 ? randomElement(nombres) : null);
  const apellidos = overrides.apellidos || `${randomElement(APELLIDOS)} ${randomElement(APELLIDOS)}`;

  return {
    numero_documento: generateDocumento(),
    tipo_documento: randomElement(TIPOS_DOCUMENTO),
    primer_nombre: primerNombre,
    segundo_nombre: segundoNombre,
    apellidos: apellidos,
    fecha_nacimiento: generateFechaNacimiento({ minAge: 18, maxAge: 80 }),
    genero: genero,
    correo_electronico: generateEmail(primerNombre, apellidos.split(' ')[0]),
    celular: generateCelular(),
    ...overrides
  };
};

/**
 * Crea múltiples personas
 * @param {number} count - Número de personas a crear
 * @param {Object} overrides - Campos base para todas las personas
 * @returns {Array<Object>} Array de personas
 */
const createManyPersonas = (count, overrides = {}) => {
  return Array.from({ length: count }, () => createPersona(overrides));
};

/**
 * Crea una persona menor de edad
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Persona menor de edad
 */
const createPersonaMenor = (overrides = {}) => {
  return createPersona({
    tipo_documento: 'Tarjeta de identidad',
    fecha_nacimiento: generateFechaNacimiento({ minAge: 1, maxAge: 17 }),
    ...overrides
  });
};

/**
 * Crea una persona adulta mayor
 * @param {Object} overrides - Campos a sobrescribir
 * @returns {Object} Persona adulta mayor
 */
const createPersonaAdultoMayor = (overrides = {}) => {
  return createPersona({
    fecha_nacimiento: generateFechaNacimiento({ minAge: 66, maxAge: 90 }),
    ...overrides
  });
};

module.exports = {
  createPersona,
  createManyPersonas,
  createPersonaMenor,
  createPersonaAdultoMayor,
  generateDocumento,
  generateCelular,
  generateFechaNacimiento,
  generateEmail,
  // Constantes exportadas para uso en tests
  TIPOS_DOCUMENTO,
  GENEROS,
  NOMBRES_MASCULINOS,
  NOMBRES_FEMENINOS,
  APELLIDOS
};
