/**
 * Shared Modules Index
 * Exporta todos los módulos compartidos entre servicios
 */

// Service Registry Client
const serviceRegistry = require('./service-registry-client');

// HTTP Client Factory con Circuit Breaker
const httpClient = require('./http-client-factory');

// Circuit Breaker
const circuitBreaker = require('./circuit-breaker');

// Health Check utilities
const healthCheck = require('./health-check');

module.exports = {
  // Service Registry
  ServiceRegistryClient: serviceRegistry.ServiceRegistryClient,
  ServiceUnavailableError: serviceRegistry.ServiceUnavailableError,
  createServiceRegistryClient: serviceRegistry.createServiceRegistryClient,

  // HTTP Client
  ServiceHttpClient: httpClient.ServiceHttpClient,
  HttpClientFactory: httpClient.HttpClientFactory,
  circuitBreakerManager: httpClient.circuitBreakerManager,

  // Circuit Breaker
  CircuitBreaker: circuitBreaker.CircuitBreaker,
  CircuitBreakerManager: circuitBreaker.CircuitBreakerManager,
  CircuitOpenError: circuitBreaker.CircuitOpenError,

  // Health Check
  HealthStatus: healthCheck.HealthStatus,
  checkPostgres: healthCheck.checkPostgres,
  checkRedis: healthCheck.checkRedis,
  checkService: healthCheck.checkService,
  checkPgVector: healthCheck.checkPgVector,
  checkMemory: healthCheck.checkMemory,
  detailedHealthCheck: healthCheck.detailedHealthCheck,
  createHealthMiddleware: healthCheck.createHealthMiddleware,
  createLivenessMiddleware: healthCheck.createLivenessMiddleware,
  createReadinessMiddleware: healthCheck.createReadinessMiddleware
};
