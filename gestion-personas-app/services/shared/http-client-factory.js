const axios = require('axios');
const { globalManager: circuitBreakerManager, CircuitOpenError } = require('./circuit-breaker');

/**
 * Cliente HTTP que resuelve dinámicamente la URL del servicio
 * usando el Service Registry con Circuit Breaker integrado
 */
class ServiceHttpClient {
  /**
   * @param {string} serviceName - Nombre del servicio en el registry
   * @param {ServiceRegistryClient} registryClient - Cliente del registry
   * @param {Object} defaultOptions - Opciones por defecto para axios
   */
  constructor(serviceName, registryClient, defaultOptions = {}) {
    this.serviceName = serviceName;
    this.registry = registryClient;
    this.defaultOptions = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      },
      ...defaultOptions
    };
    
    // Configurar Circuit Breaker para este servicio
    this.circuitBreaker = circuitBreakerManager.getBreaker(serviceName, {
      failureThreshold: defaultOptions.circuitBreakerFailures || 5,
      resetTimeout: defaultOptions.circuitBreakerTimeout || 30000,
      timeout: defaultOptions.timeout || 10000
    });
  }

  /**
   * Realiza una petición HTTP al servicio con Circuit Breaker
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
   * @param {string} path - Path del endpoint
   * @param {Object} options - Opciones adicionales de axios
   * @returns {Promise<AxiosResponse>}
   */
  async request(method, path, options = {}) {
    return this.circuitBreaker.execute(async () => {
      const baseUrl = await this.registry.getServiceUrl(this.serviceName);
      const url = `${baseUrl}${path}`;

      return axios({
        method,
        url,
        ...this.defaultOptions,
        ...options
      });
    });
  }

  /**
   * Verifica si el circuito está abierto
   * @returns {boolean}
   */
  isCircuitOpen() {
    return this.circuitBreaker.state === 'OPEN';
  }

  /**
   * Obtiene el estado del circuit breaker
   * @returns {Object}
   */
  getCircuitStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * GET request
   * @param {string} path - Path del endpoint
   * @param {Object} options - Opciones de axios (params, headers, etc.)
   * @returns {Promise<AxiosResponse>}
   */
  async get(path, options = {}) {
    return this.request('GET', path, options);
  }

  /**
   * POST request
   * @param {string} path - Path del endpoint
   * @param {Object} data - Body de la petición
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<AxiosResponse>}
   */
  async post(path, data, options = {}) {
    return this.request('POST', path, { data, ...options });
  }

  /**
   * PUT request
   * @param {string} path - Path del endpoint
   * @param {Object} data - Body de la petición
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<AxiosResponse>}
   */
  async put(path, data, options = {}) {
    return this.request('PUT', path, { data, ...options });
  }

  /**
   * DELETE request
   * @param {string} path - Path del endpoint
   * @param {Object} options - Opciones de axios
   * @returns {Promise<AxiosResponse>}
   */
  async delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }
}

/**
 * Factory para crear clientes HTTP de servicios
 */
class HttpClientFactory {
  /**
   * @param {ServiceRegistryClient} registryClient - Cliente del registry
   */
  constructor(registryClient) {
    this.registry = registryClient;
    this.clients = new Map();
  }

  /**
   * Obtiene o crea un cliente HTTP para un servicio
   * @param {string} serviceName - Nombre del servicio
   * @param {Object} defaultOptions - Opciones por defecto
   * @returns {ServiceHttpClient}
   */
  getClient(serviceName, defaultOptions = {}) {
    const cacheKey = `${serviceName}:${JSON.stringify(defaultOptions)}`;
    
    if (!this.clients.has(cacheKey)) {
      this.clients.set(
        cacheKey,
        new ServiceHttpClient(serviceName, this.registry, defaultOptions)
      );
    }

    return this.clients.get(cacheKey);
  }

  /**
   * Obtiene cliente para el servicio de logs
   * @returns {ServiceHttpClient}
   */
  getLogClient() {
    return this.getClient('log-service');
  }

  /**
   * Obtiene cliente para el servicio NLP
   * @returns {ServiceHttpClient}
   */
  getNlpClient() {
    return this.getClient('nlp-service');
  }

  /**
   * Obtiene cliente para el servicio de personas
   * @returns {ServiceHttpClient}
   */
  getPersonasClient() {
    return this.getClient('personas-service');
  }

  /**
   * Obtiene cliente para el servicio de autenticación
   * @returns {ServiceHttpClient}
   */
  getAuthClient() {
    return this.getClient('auth-service');
  }

  /**
   * Obtiene cliente para el servicio de consultas
   * @returns {ServiceHttpClient}
   */
  getConsultaClient() {
    return this.getClient('consulta-service');
  }

  /**
   * Obtiene el estado de todos los circuit breakers
   * @returns {Object}
   */
  getCircuitBreakerStatus() {
    return circuitBreakerManager.getStatus();
  }

  /**
   * Obtiene un resumen de los circuit breakers
   * @returns {Object}
   */
  getCircuitBreakerSummary() {
    return circuitBreakerManager.getSummary();
  }

  /**
   * Resetea todos los circuit breakers
   */
  resetAllCircuitBreakers() {
    circuitBreakerManager.resetAll();
  }
}

module.exports = {
  ServiceHttpClient,
  HttpClientFactory,
  CircuitOpenError,
  circuitBreakerManager
};
