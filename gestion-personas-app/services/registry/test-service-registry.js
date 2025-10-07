#!/usr/bin/env node

const axios = require('axios');

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL || 'http://localhost:3010';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testServiceRegistry() {
  console.log('🧪 Testing Service Registry...\n');

  try {
    // Test 1: Service Registry Health
    console.log('1️⃣ Testing Service Registry Health...');
    const healthResponse = await axios.get(`${SERVICE_REGISTRY_URL}/health`);
    console.log('✅ Service Registry is healthy:', healthResponse.data);

    // Test 2: List all services
    console.log('\n2️⃣ Listing all registered services...');
    const servicesResponse = await axios.get(`${SERVICE_REGISTRY_URL}/services`);
    console.log('📋 Registered services:');
    servicesResponse.data.services.forEach(service => {
      console.log(`   - ${service.name} (${service.serviceId}) at ${service.url} [${service.status}]`);
    });

    // Test 3: Service Discovery
    console.log('\n3️⃣ Testing Service Discovery...');
    const serviceNames = ['auth-service', 'personas-service', 'consulta-service', 'nlp-service', 'log-service'];
    
    for (const serviceName of serviceNames) {
      try {
        const discoveryResponse = await axios.get(`${SERVICE_REGISTRY_URL}/discover/${serviceName}`);
        console.log(`✅ Found ${serviceName}: ${discoveryResponse.data.instance.url}`);
      } catch (error) {
        console.log(`❌ Service not found: ${serviceName}`);
      }
    }

    // Test 4: API Gateway Health (with Service Discovery)
    console.log('\n4️⃣ Testing API Gateway with Service Discovery...');
    try {
      const gatewayHealthResponse = await axios.get(`${API_GATEWAY_URL}/health`);
      console.log('✅ API Gateway is healthy and connected to Service Registry');
      console.log('📊 Gateway discovered services:', gatewayHealthResponse.data.registeredServices?.length || 0);
    } catch (error) {
      console.log('❌ API Gateway health check failed:', error.message);
    }

    console.log('\n🎉 Service Registry testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function registerTestService() {
  console.log('\n🧪 Registering a test service...');
  
  try {
    const testService = {
      serviceId: `test-service-${Date.now()}`,
      name: 'test-service',
      host: 'localhost',
      port: 9999,
      protocol: 'http',
      metadata: {
        version: '1.0.0',
        environment: 'test',
        tags: ['test', 'demo']
      }
    };

    const response = await axios.post(`${SERVICE_REGISTRY_URL}/register`, testService);
    console.log('✅ Test service registered:', response.data);

    // Send heartbeat
    await sleep(1000);
    await axios.post(`${SERVICE_REGISTRY_URL}/heartbeat/${testService.serviceId}`);
    console.log('💓 Heartbeat sent');

    // Discover the test service
    await sleep(1000);
    const discoveryResponse = await axios.get(`${SERVICE_REGISTRY_URL}/discover/test-service`);
    console.log('🔍 Test service discovered:', discoveryResponse.data.instance.url);

    // Deregister the test service
    await sleep(1000);
    await axios.delete(`${SERVICE_REGISTRY_URL}/deregister/${testService.serviceId}`);
    console.log('❌ Test service deregistered');

  } catch (error) {
    console.error('❌ Test service registration failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Service Registry Integration Test\n');
  console.log(`Service Registry URL: ${SERVICE_REGISTRY_URL}`);
  console.log(`API Gateway URL: ${API_GATEWAY_URL}\n`);

  await testServiceRegistry();
  await registerTestService();
  
  console.log('\n✅ All tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testServiceRegistry, registerTestService };