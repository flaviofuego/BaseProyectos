export const API_BASE_URL = 'http://localhost:8001/api';

export const DOCUMENT_TYPES = {
  CC: 'Cédula de Ciudadanía',
  TI: 'Tarjeta de Identidad',
  CE: 'Cédula de Extranjería',
  PP: 'Pasaporte',
  RC: 'Registro Civil'
};

export const GENDER_OPTIONS = {
  M: 'Masculino',
  F: 'Femenino',
  O: 'Otro'
};

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CREATE_PERSON: '/crear-persona',
  SEARCH_PERSONS: '/consultar-personas',
  MODIFY_PERSON: '/modificar-persona',
  DELETE_PERSON: '/borrar-persona',
  CONSULT_LOGS: '/consultar-logs',
  NLP_QUERY: '/consulta-nlp'
};

export const COLOMBIAN_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
  'Vaupés', 'Vichada'
];
