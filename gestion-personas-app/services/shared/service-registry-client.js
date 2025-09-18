const axios = require('axios');

class ServiceRegistryClient {
  constructor(serviceConfig, registryUrl = process.env.SERVICE_REGISTRY_URL) {
    this.serviceConfig = serviceConfig;
    this.registryUrl = registryUrl;
    this.registrationInterval = null;
    this.heartbeatInterval = null;
    this.isRegistered = false;
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
        await axios.post(`${this.registryUrl}/heartbeat`, {
          serviceId: this.serviceConfig.id
        }, {
          timeout: 3000
        });
        
        // Solo logear cada 5 minutos para no saturar logs
        if (Date.now() % 300000 < 15000) { // Aproximadamente cada 5 minutos
          console.log(`💓 Heartbeat sent for ${this.serviceConfig.name}`);
        }
      } catch (error) {
        console.error(`❌ Heartbeat failed for ${this.serviceConfig.name}:`, error.message);
        
        // Si falla el heartbeat, intentar re-registrar
        this.isRegistered = false;
        this.register();
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
      await axios.delete(`${this.registryUrl}/services/${this.serviceConfig.id}`, {
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
  createServiceRegistryClient
};