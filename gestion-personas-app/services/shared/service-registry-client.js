const axios = require('axios');

/**
 * Error personalizado para cuando un servicio no está disponible
 */
class ServiceUnavailableError extends Error {
  constructor(serviceName) {
    super(`Service unavailable: ${serviceName}`);
    this.name = 'ServiceUnavailableError';
    this.serviceName = serviceName;
  }
}

class ServiceRegistryClient {
  constructor(serviceConfig, registryUrl = process.env.SERVICE_REGISTRY_URL) {
    this.serviceConfig = serviceConfig;
    this.registryUrl = registryUrl;
    this.registrationInterval = null;
    this.heartbeatInterval = null;
    this.isRegistered = false;
    this.discoveryCache = new Map();
    this.discoveryCacheTTL = 30000; // 30 segundos
  }

  /**
   * Registra el servicio en el Service Registry
   */
  async register() {
    if (!this.registryUrl) {
      console.warn('SERVICE_REGISTRY_URL not configured, skipping service registration');
      return;
    }

    try {
      const response = await axios.post(`${this.registryUrl}/register`, this.serviceConfig, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Service registered successfully: ${this.serviceConfig.name} at ${this.serviceConfig.url}`);
      this.isRegistered = true;
      
      // Iniciar heartbeat automático
      this.startHeartbeat();
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to register service:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      
      // Reintentar registro en 10 segundos
      setTimeout(() => {
        console.log('🔄 Retrying service registration...');
        this.register();
      }, 10000);
    }
  }

  /**
   * Inicia el heartbeat automático cada 15 segundos
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        // Usar el formato correcto con serviceId en la URL
        const serviceId = this.serviceConfig.serviceId || this.serviceConfig.id;
        await axios.post(`${this.registryUrl}/heartbeat/${serviceId}`, {}, {
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Solo logear cada 5 minutos para no saturar logs
        if (Date.now() % 300000 < 15000) { // Aproximadamente cada 5 minutos
          console.log(`💓 Heartbeat sent for ${this.serviceConfig.name} (${serviceId})`);
        }
      } catch (error) {
        console.error(`❌ Heartbeat failed for ${this.serviceConfig.name}:`, error.message);
        
        // Si el error es 404, podría ser que el servicio no esté registrado
        if (error.response && error.response.status === 404) {
          console.log(`🔄 Service not found in registry, re-registering ${this.serviceConfig.name}...`);
          this.isRegistered = false;
          this.register();
        }
      }
    }, 15000); // Cada 15 segundos
  }

  /**
   * Desregistra el servicio al cerrar la aplicación
   */
  async unregister() {
    if (!this.isRegistered || !this.registryUrl) {
      return;
    }

    try {
      const serviceId = this.serviceConfig.serviceId || this.serviceConfig.id;
      await axios.delete(`${this.registryUrl}/deregister/${serviceId}`, {
        timeout: 3000
      });
      console.log(`🚪 Service unregistered: ${this.serviceConfig.name}`);
    } catch (error) {
      console.error('❌ Failed to unregister service:', error.message);
    }

    // Limpiar intervalos
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isRegistered = false;
  }

  /**
   * Maneja el cierre graceful de la aplicación
   */
  setupGracefulShutdown() {
    const cleanup = async () => {
      console.log('\n🔄 Shutting down service...');
      await this.unregister();
      process.exit(0);
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGUSR2', cleanup); // Para nodemon
  }

  /**
   * Descubre un servicio por nombre usando el Service Registry
   * @param {string} serviceName - Nombre del servicio a descubrir
   * @returns {Promise<string>} URL del servicio
   */
  async discoverService(serviceName) {
    if (!this.registryUrl) {
      throw new ServiceUnavailableError(serviceName);
    }

    try {
      const response = await axios.get(
        `${this.registryUrl}/discover/${serviceName}`,
        { timeout: 3000 }
      );
      return response.data.instance.url;
    } catch (error) {
      console.error(`❌ Service discovery failed for ${serviceName}:`, error.message);
      throw new ServiceUnavailableError(serviceName);
    }
  }

  /**
   * Obtiene la URL de un servicio con cache
   * @param {string} serviceName - Nombre del servicio
   * @param {boolean} useCache - Usar cache (default: true)
   * @returns {Promise<string>} URL del servicio
   */
  async getServiceUrl(serviceName, useCache = true) {
    const cacheKey = `service:${serviceName}`;

    if (useCache && this.discoveryCache.has(cacheKey)) {
      const cached = this.discoveryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.discoveryCacheTTL) {
        return cached.url;
      }
    }

    const url = await this.discoverService(serviceName);
    this.discoveryCache.set(cacheKey, { url, timestamp: Date.now() });
    return url;
  }

  /**
   * Limpia el cache de discovery
   */
  clearDiscoveryCache() {
    this.discoveryCache.clear();
  }
}

/**
 * Función helper para crear y configurar fácilmente un cliente
 */
function createServiceRegistryClient(serviceConfig) {
  const client = new ServiceRegistryClient(serviceConfig);
  
  // Configurar shutdown graceful automáticamente
  client.setupGracefulShutdown();
  
  // Registrar automáticamente después de un pequeño delay
  setTimeout(() => {
    client.register();
  }, 2000); // 2 segundos de delay para que el servicio esté completamente listo
  
  return client;
}

module.exports = {
  ServiceRegistryClient,
  ServiceUnavailableError,
  createServiceRegistryClient
};