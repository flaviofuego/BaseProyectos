const axios = require('axios');

class ServiceRegistryClient {
  constructor(registryUrl, serviceName, servicePort, serviceHost = 'localhost') {
    this.registryUrl = registryUrl;
    this.serviceName = serviceName;
    this.servicePort = servicePort;
    this.serviceHost = serviceHost;
    this.serviceId = `${serviceName}-${serviceHost}-${servicePort}-${Date.now()}`;
    this.heartbeatInterval = null;
    this.registered = false;
  }

  async register(metadata = {}) {
    try {
      const registrationData = {
        serviceId: this.serviceId,
        name: this.serviceName,
        host: this.serviceHost,
        port: this.servicePort,
        protocol: 'http',
        metadata: {
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          ...metadata
        }
      };

      const response = await axios.post(`${this.registryUrl}/register`, registrationData);
      console.log(`✅ Service registered: ${this.serviceName} (${this.serviceId})`);
      
      this.registered = true;
      this.startHeartbeat();
      
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to register service ${this.serviceName}:`, error.message);
      throw error;
    }
  }

  async deregister() {
    try {
      if (!this.registered) return;

      await axios.delete(`${this.registryUrl}/deregister/${this.serviceId}`);
      console.log(`❌ Service deregistered: ${this.serviceName} (${this.serviceId})`);
      
      this.stopHeartbeat();
      this.registered = false;
    } catch (error) {
      console.error(`❌ Failed to deregister service ${this.serviceName}:`, error.message);
    }
  }

  startHeartbeat(intervalMs = 15000) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await axios.post(`${this.registryUrl}/heartbeat/${this.serviceId}`);
        console.log(`💓 Heartbeat sent for ${this.serviceName}`);
      } catch (error) {
        console.error(`💔 Heartbeat failed for ${this.serviceName}:`, error.message);
        // Try to re-register if heartbeat fails
        if (error.response?.status === 404) {
          console.log(`🔄 Attempting to re-register ${this.serviceName}...`);
          try {
            await this.register();
          } catch (regError) {
            console.error(`❌ Re-registration failed for ${this.serviceName}:`, regError.message);
          }
        }
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`🛑 ${signal} received. Deregistering service...`);
      await this.deregister();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }
}

// Service Discovery Client
class ServiceDiscoveryClient {
  constructor(registryUrl) {
    this.registryUrl = registryUrl;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  async discoverService(serviceName, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.cache.has(serviceName)) {
        const cached = this.cache.get(serviceName);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await axios.get(`${this.registryUrl}/discover/${serviceName}`);
      const serviceData = response.data;

      // Cache the result
      this.cache.set(serviceName, {
        data: serviceData,
        timestamp: Date.now()
      });

      return serviceData;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Service not found: ${serviceName}`);
      }
      console.error(`Failed to discover service ${serviceName}:`, error.message);
      throw error;
    }
  }

  async getServiceUrl(serviceName) {
    try {
      const discovery = await this.discoverService(serviceName);
      return discovery.instance.url;
    } catch (error) {
      throw new Error(`Failed to get URL for service ${serviceName}: ${error.message}`);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = {
  ServiceRegistryClient,
  ServiceDiscoveryClient
};