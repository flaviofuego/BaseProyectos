const express = require('express');
const { ServiceRegistryClient } = require('../registry/client');

// Example: Auth Service with auto-registration
const app = express();
const PORT = process.env.SERVICE_PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'auth-service';
const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL || 'http://service-registry:3010';

// Initialize Service Registry Client
const registryClient = new ServiceRegistryClient(
  SERVICE_REGISTRY_URL,
  SERVICE_NAME,
  PORT,
  'auth-service'  // Internal container hostname
);

// Health check endpoint (required for service registry)
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Your existing service routes...
app.get('/verify', (req, res) => {
  // Your verification logic here
  res.json({ status: 'ok' });
});

// Start the service
async function startService() {
  try {
    // Start the Express server
    const server = app.listen(PORT, async () => {
      console.log(`🚀 ${SERVICE_NAME} running on port ${PORT}`);
      
      try {
        // Auto-register with Service Registry
        await registryClient.register({
          version: '1.0.0',
          tags: ['auth', 'security'],
          environment: process.env.NODE_ENV || 'development'
        });
        
        console.log(`✅ Service registered with Service Registry at ${SERVICE_REGISTRY_URL}`);
      } catch (error) {
        console.error('❌ Failed to register with Service Registry:', error.message);
        // Continue running even if registration fails
      }
    });

    // Setup graceful shutdown
    registryClient.setupGracefulShutdown();
    
    // Handle server shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start service:', error);
    process.exit(1);
  }
}

startService();

module.exports = app;