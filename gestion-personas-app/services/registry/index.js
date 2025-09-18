const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

console.log('🚀 Iniciando Service Registry...');

const app = express();
const PORT = process.env.SERVICE_REGISTRY_PORT || process.env.PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory service registry
const services = new Map();

// Service Registration Model
class ServiceInstance {
  constructor(serviceId, name, host, port, protocol = 'http', metadata = {}) {
    this.serviceId = serviceId;
    this.name = name;
    this.host = host;
    this.port = port;
    this.protocol = protocol;
    this.url = `${protocol}://${host}:${port}`;
    this.metadata = metadata;
    this.registeredAt = new Date();
    this.lastHeartbeat = new Date();
    this.status = 'UP';
    this.version = metadata.version || '1.0.0';
    this.tags = metadata.tags || [];
  }

  updateHeartbeat() {
    this.lastHeartbeat = new Date();
    this.status = 'UP';
  }

  markDown() {
    this.status = 'DOWN';
  }

  isHealthy(timeoutMs = 30000) {
    const now = new Date();
    const timeSinceLastHeartbeat = now - this.lastHeartbeat;
    return this.status === 'UP' && timeSinceLastHeartbeat < timeoutMs;
  }
}

// 🔐 Service Registration Endpoint
app.post('/register', (req, res) => {
  try {
    const { serviceId, name, host, port, protocol, metadata } = req.body;
    
    if (!serviceId || !name || !host || !port) {
      return res.status(400).json({
        error: 'Missing required fields: serviceId, name, host, port'
      });
    }

    const service = new ServiceInstance(serviceId, name, host, port, protocol, metadata);
    services.set(serviceId, service);

    console.log(`✅ Service registered: ${name} (${serviceId}) at ${service.url}`);
    
    res.status(201).json({
      message: 'Service registered successfully',
      service: {
        serviceId: service.serviceId,
        name: service.name,
        url: service.url,
        status: service.status,
        registeredAt: service.registeredAt
      }
    });
  } catch (error) {
    console.error('Error registering service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🔍 Service Discovery Endpoint
app.get('/discover/:serviceName', (req, res) => {
  try {
    const { serviceName } = req.params;
    const healthyServices = [];

    for (const [serviceId, service] of services) {
      if (service.name === serviceName && service.isHealthy()) {
        healthyServices.push({
          serviceId: service.serviceId,
          name: service.name,
          url: service.url,
          host: service.host,
          port: service.port,
          protocol: service.protocol,
          status: service.status,
          version: service.version,
          tags: service.tags,
          lastHeartbeat: service.lastHeartbeat
        });
      }
    }

    if (healthyServices.length === 0) {
      return res.status(404).json({
        error: `No healthy instances found for service: ${serviceName}`
      });
    }

    // Load balancing: return random healthy instance
    const randomInstance = healthyServices[Math.floor(Math.random() * healthyServices.length)];

    res.json({
      service: serviceName,
      instance: randomInstance,
      totalHealthyInstances: healthyServices.length,
      allInstances: healthyServices
    });
  } catch (error) {
    console.error('Error discovering service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📋 List All Services
app.get('/services', (req, res) => {
  try {
    const serviceList = [];
    
    for (const [serviceId, service] of services) {
      serviceList.push({
        serviceId: service.serviceId,
        name: service.name,
        url: service.url,
        status: service.status,
        isHealthy: service.isHealthy(),
        registeredAt: service.registeredAt,
        lastHeartbeat: service.lastHeartbeat,
        version: service.version,
        tags: service.tags
      });
    }

    res.json({
      services: serviceList,
      totalServices: serviceList.length,
      healthyServices: serviceList.filter(s => s.isHealthy).length
    });
  } catch (error) {
    console.error('Error listing services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 💓 Heartbeat Endpoint
app.post('/heartbeat/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = services.get(serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    service.updateHeartbeat();
    
    res.json({
      message: 'Heartbeat received',
      serviceId: service.serviceId,
      status: service.status,
      lastHeartbeat: service.lastHeartbeat
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🗑️ Deregister Service
app.delete('/deregister/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = services.get(serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    services.delete(serviceId);
    console.log(`❌ Service deregistered: ${service.name} (${serviceId})`);

    res.json({
      message: 'Service deregistered successfully',
      serviceId: serviceId
    });
  } catch (error) {
    console.error('Error deregistering service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🏥 Health Check for Registry itself
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    registry: {
      totalServices: services.size,
      healthyServices: Array.from(services.values()).filter(s => s.isHealthy()).length
    }
  });
});

// 🔄 Periodic Health Check (Clean up unhealthy services)
cron.schedule('*/30 * * * * *', () => { // Every 30 seconds
  const now = new Date();
  let removedServices = 0;

  for (const [serviceId, service] of services) {
    if (!service.isHealthy(30000)) { // 30 seconds timeout
      console.log(`🚨 Removing unhealthy service: ${service.name} (${serviceId})`);
      services.delete(serviceId);
      removedServices++;
    }
  }

  if (removedServices > 0) {
    console.log(`🧹 Cleanup completed. Removed ${removedServices} unhealthy services`);
  }
});

// 📊 Service Discovery with Load Balancing
app.get('/discover/:serviceName/load-balanced', (req, res) => {
  try {
    const { serviceName } = req.params;
    const { strategy = 'round-robin' } = req.query;
    
    const healthyServices = [];
    for (const [serviceId, service] of services) {
      if (service.name === serviceName && service.isHealthy()) {
        healthyServices.push(service);
      }
    }

    if (healthyServices.length === 0) {
      return res.status(404).json({
        error: `No healthy instances found for service: ${serviceName}`
      });
    }

    let selectedService;
    
    switch (strategy) {
      case 'random':
        selectedService = healthyServices[Math.floor(Math.random() * healthyServices.length)];
        break;
      case 'round-robin':
      default:
        // Simple round-robin based on timestamp
        selectedService = healthyServices.sort((a, b) => a.lastHeartbeat - b.lastHeartbeat)[0];
        break;
    }

    res.json({
      service: serviceName,
      selectedInstance: {
        serviceId: selectedService.serviceId,
        url: selectedService.url,
        host: selectedService.host,
        port: selectedService.port
      },
      strategy: strategy,
      totalInstances: healthyServices.length
    });
  } catch (error) {
    console.error('Error in load-balanced discovery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Service Registry running on port ${PORT}`);
  console.log(`📋 Services endpoint: http://localhost:${PORT}/services`);
  console.log(`🔍 Discovery endpoint: http://localhost:${PORT}/discover/{serviceName}`);
  console.log(`🔐 Registration endpoint: http://localhost:${PORT}/register`);
  console.log('✅ Service Registry ready for service registration');
});

module.exports = app;