/**
 * Index de factories para testing
 * Exporta todas las factories disponibles
 */

const personaFactory = require('./persona.factory');
const userFactory = require('./user.factory');
const logFactory = require('./log.factory');

module.exports = {
  // Persona factories
  createPersona: personaFactory.createPersona,
  createManyPersonas: personaFactory.createManyPersonas,
  createPersonaMenor: personaFactory.createPersonaMenor,
  createPersonaAdultoMayor: personaFactory.createPersonaAdultoMayor,
  
  // User factories
  createUser: userFactory.createUser,
  createManyUsers: userFactory.createManyUsers,
  createOAuthUser: userFactory.createOAuthUser,
  createAdminUser: userFactory.createAdminUser,
  createUserPreferences: userFactory.createUserPreferences,
  
  // Log factories
  createLog: logFactory.createLog,
  createManyLogs: logFactory.createManyLogs,
  createPersonaCreateLog: logFactory.createPersonaCreateLog,
  createNLPQueryLog: logFactory.createNLPQueryLog,
  createErrorLog: logFactory.createErrorLog,
  
  // Constantes
  TIPOS_DOCUMENTO: personaFactory.TIPOS_DOCUMENTO,
  GENEROS: personaFactory.GENEROS,
  PROVIDERS: userFactory.PROVIDERS,
  TRANSACTION_TYPES: logFactory.TRANSACTION_TYPES,
  ENTITY_TYPES: logFactory.ENTITY_TYPES,
  
  // Helpers
  generateDocumento: personaFactory.generateDocumento,
  generateCelular: personaFactory.generateCelular,
  generateEmail: personaFactory.generateEmail,
  hashPassword: userFactory.hashPassword,
  generateIP: logFactory.generateIP
};
