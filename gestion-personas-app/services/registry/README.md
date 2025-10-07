# Service Registry Implementation

## 🏗️ Arquitectura

Este proyecto implementa un **Service Registry Pattern** que permite el auto-descubrimiento de microservicios, eliminando la necesidad de URLs hardcodeadas.

### Componentes Principales

1. **Service Registry** (Puerto 3010)
   - Registro automático de servicios
   - Descubrimiento de servicios 
   - Health checks y heartbeat
   - Load balancing básico

2. **API Gateway** (Puerto 8001)
   - Proxy dinámico usando Service Discovery
   - Enrutamiento automático
   - Circuit breaker básico

3. **Microservicios**
   - Auto-registro al iniciar
   - Heartbeat automático
   - Graceful shutdown con deregistro

## 🚀 Inicio Rápido

### 1. Iniciar el Sistema Completo
```bash
./start-service-registry.sh
```

### 2. Verificar Servicios Registrados
```bash
curl http://localhost:3010/services | jq
```

### 3. Probar Service Discovery
```bash
curl http://localhost:3010/discover/auth-service
curl http://localhost:3010/discover/personas-service
```

### 4. Verificar API Gateway
```bash
curl http://localhost:8001/health
```

## 📡 Service Registry API

### Registrar un Servicio
```bash
POST /register
{
  "serviceId": "unique-service-id",
  "name": "service-name",
  "host": "service-host",
  "port": 3001,
  "protocol": "http",
  "metadata": {
    "version": "1.0.0",
    "environment": "production",
    "tags": ["auth", "security"]
  }
}
```

### Descubrir un Servicio
```bash
GET /discover/{serviceName}
```

### Listar Todos los Servicios
```bash
GET /services
```

### Enviar Heartbeat
```bash
POST /heartbeat/{serviceId}
```

### Desregistrar Servicio
```bash
DELETE /deregister/{serviceId}
```

## 🔧 Configuración de Variables de Entorno

### Service Registry
```env
NODE_ENV=development
SERVICE_REGISTRY_PORT=3010
```

### Microservicios
```env
SERVICE_REGISTRY_URL=http://service-registry:3010
SERVICE_NAME=auth-service
SERVICE_PORT=3001
```

### API Gateway
```env
SERVICE_REGISTRY_URL=http://service-registry:3010
```

## 🏥 Health Checks

Todos los servicios deben implementar un endpoint `/health`:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'service-name',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🔄 Auto-registro de Servicios

### Implementación en un Microservicio

```javascript
const { ServiceRegistryClient } = require('../registry/client');

const registryClient = new ServiceRegistryClient(
  process.env.SERVICE_REGISTRY_URL,
  process.env.SERVICE_NAME,
  process.env.SERVICE_PORT,
  'container-hostname'
);

// Auto-registro al iniciar
app.listen(PORT, async () => {
  try {
    await registryClient.register({
      version: '1.0.0',
      tags: ['auth', 'security'],
      environment: process.env.NODE_ENV
    });
    console.log('✅ Service registered');
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
  }
});

// Graceful shutdown
registryClient.setupGracefulShutdown();
```

## 🧪 Testing

### Ejecutar Tests de Integración
```bash
cd services/registry
node test-service-registry.js
```

### Test Manual
```bash
# Verificar Service Registry
curl http://localhost:3010/health

# Listar servicios
curl http://localhost:3010/services

# Probar discovery
curl http://localhost:3010/discover/auth-service

# Probar API Gateway
curl http://localhost:8001/health
```

## 📊 Monitoreo

### Logs en Tiempo Real
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

### Logs Específicos
```bash
docker logs service_registry_dev -f
docker logs api_gateway_dev -f
```

### Estado de Servicios
```bash
# Ver servicios registrados
curl -s http://localhost:3010/services | jq '.services[] | {name: .name, status: .status, url: .url}'

# Ver instancias saludables
curl -s http://localhost:3010/services | jq '.services[] | select(.isHealthy == true)'
```

## 🚨 Troubleshooting

### Service Registry No Responde
```bash
docker logs service_registry_dev
docker restart service_registry_dev
```

### Servicio No Se Registra
1. Verificar variable `SERVICE_REGISTRY_URL`
2. Comprobar conectividad de red
3. Revisar logs del servicio

### API Gateway No Encuentra Servicios
1. Verificar que Service Registry esté running
2. Comprobar que los servicios estén registrados
3. Revisar logs del API Gateway

## 🏃‍♂️ Flujo de Trabajo

1. **Inicio**: Service Registry arranca primero
2. **Registro**: Cada microservicio se auto-registra
3. **Heartbeat**: Servicios envían heartbeat cada 15 segundos
4. **Discovery**: API Gateway descubre servicios dinámicamente
5. **Routing**: Las peticiones se enrutan automáticamente
6. **Cleanup**: Servicios no saludables se eliminan automáticamente

## 🔄 Beneficios Implementados

- ✅ **Eliminación de URLs hardcodeadas**
- ✅ **Auto-descubrimiento de servicios**
- ✅ **Health checks automáticos**
- ✅ **Load balancing básico**
- ✅ **Graceful shutdown**
- ✅ **Circuit breaker simple**
- ✅ **Monitoreo centralizado**
- ✅ **Escalabilidad horizontal**

## 📈 Próximos Pasos

1. **Persistencia**: Almacenar registry en base de datos
2. **Clustering**: Service Registry distribuido
3. **Métricas**: Integración con Prometheus
4. **Security**: Autenticación entre servicios
5. **Advanced LB**: Algoritmos de load balancing avanzados