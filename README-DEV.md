# Guía de Desarrollo - Gestión de Personas App v3.0

## 🚀 Configuración para Desarrollo Avanzado con Service Registry

Esta guía actualizada te ayudará a configurar el entorno de desarrollo con **Service Registry autodescubrible**, **hot reload**, **debugging avanzado**, y **herramientas de desarrollo modernas** para que los cambios en el código se reflejen automáticamente.

## 🆕 Novedades en Desarrollo (Septiembre 2025) - v3.0

### 🌐 **Service Registry Implementation**

- 🔄 **Autodescubrimiento de servicios** con registro automático
- 💓 **Health checks en desarrollo** con heartbeats cada 15 segundos
- 🔍 **Service discovery debugging** con logs detallados
- 🛠️ **Hot reload preserva registros** de servicios
- 📊 **Monitoring en tiempo real** del estado de servicios
- 🧪 **Testing automatizado** del Service Registry incluido

### ✨ **Características de Desarrollo Mejoradas**

- 🔔 **Sistema de notificaciones** con debugging tools
- 🎨 **Tema oscuro** completo para mejor desarrollo nocturno
- 🔍 **Validación en tiempo real** con hot reload instantáneo
- 📊 **Dashboard auto-refresh** con cache invalidation
- 🛡️ **Error handling avanzado** con códigos específicos (409, 422)
- 🔧 **Session storage debugging** para notificaciones

### 🏗️ **Arquitectura Actualizada con Service Registry**

- **Service Registry**: Centro de autodescubrimiento en puerto 3010
- **Auto-registration**: Todos los servicios se registran automáticamente
- **Dynamic routing**: Gateway descubre servicios dinámicamente
- **Shared client**: Archivo compartido para registro de servicios
- **Gateway optimization**: Service discovery con cache inteligente
- **Development monitoring**: Logs detallados de registro y heartbeats

## Estructura de Archivos para Desarrollo

- `docker-compose.yml` - Configuración de producción
- `docker-compose.dev.yml` - **Configuración de desarrollo con Service Registry**
- `services/shared/service-registry-client.js` - **Cliente compartido para autoregistro**
- `services/registry/` - **Service Registry con API completa**
- `services/registry/test-service-registry.js` - **Tests automatizados**
- `Dockerfile` - Dockerfiles de producción (en cada servicio)
- `Dockerfile.dev` - Dockerfiles de desarrollo (en cada servicio)

## 🛠️ Comandos de Desarrollo Actualizados

### Desarrollo (con Service Registry y hot reload)

```bash
# Construir imágenes de desarrollo (incluye Service Registry)
make build-dev

# Iniciar servicios en modo desarrollo con Service Registry
make dev

# Ver logs de desarrollo con filtros (incluye service-registry)
make logs-dev

# Logs específicos por servicio
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f service-registry
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f auth-service
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f personas-service

# Detener servicios de desarrollo
make down-dev

# Restart específico (preserva registros de Service Registry)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart service-registry
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart consulta_service_dev
```

### Testing y Debugging

```bash
# Test de notificaciones (en Developer Console)
window.notificationManager.show("Test notification", "success")
window.notificationHistory.getNotifications()

# Test de validación en tiempo real
# Crear persona con documento existente y verificar error 409

# Test de tema oscuro
# Cambiar tema y verificar todos los componentes

# Limpiar session storage
sessionStorage.clear()
```

### Producción y Staging

```bash
# Construir imágenes de producción
make build

# Iniciar servicios en modo producción
make up

# Ver logs de producción
make logs

# Detener servicios
make down
```

## 🔄 Diferencias entre Desarrollo y Producción

### Desarrollo (`docker-compose.dev.yml`)

- ✅ **Volúmenes montados**: Los cambios en el código se reflejan inmediatamente
- ✅ **Hot reload**: Nodemon para Node.js, Flask debug para Python
- ✅ **Variables de entorno de desarrollo**
- ✅ **Dependencias de desarrollo incluidas**
- 🔔 **Debugging de notificaciones**: sessionStorage y console logs
- 🎨 **Theme debugging**: Logs de cambios de tema
- 🔍 **Validation debugging**: Logs de AJAX y validación en tiempo real
- 📊 **Dashboard debugging**: Cache invalidation visible

### Producción (`docker-compose.yml`)

- 🚀 **Código copiado**: Imagen optimizada sin volúmenes
- 🚀 **Sin hot reload**: Mejor rendimiento
- 🚀 **Solo dependencias de producción**
- 🚀 **Variables de entorno optimizadas**
- 🔒 **Logging mínimo**: Solo errores críticos
- ⚡ **Performance optimizado**: Sin debugging overhead

## 🔄 Flujo de Trabajo Recomendado (Actualizado)

### 1. **Desarrollo Frontend (JavaScript/CSS)**

```bash
make dev
# Editar archivos en frontend/static/js/ o frontend/static/css/
# Los cambios se reflejan automáticamente en el navegador
# Verificar en Developer Tools que los archivos se cargan
```

### 2. **Desarrollo Backend (Python/Node.js)**

```bash
make dev
# Editar archivos en frontend/app.py o services/*/index.js
# Los servicios se reinician automáticamente
# Verificar logs: docker-compose ... logs -f [servicio]
```

### 3. **Testing de Nuevas Características**

```bash
# Test del sistema de notificaciones
# 1. Crear una persona con documento duplicado
# 2. Verificar error 409 en notificaciones
# 3. Comprobar historial en dropdown

# Test del tema oscuro
# 1. Cambiar a modo oscuro
# 2. Verificar todos los componentes
# 3. Probar formularios y modales
```

### 4. **Debugging Avanzado**

```bash
# Backend debugging
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend

# Frontend debugging
# En Developer Tools:
# - Console: Ver logs de JavaScript
# - Network: Verificar requests AJAX
# - Application: Ver sessionStorage y localStorage
```

### 5. **Testing/Staging**

```bash
make down-dev
make build
make up
# Probar en modo producción antes de deploy
```

## 🌐 Puertos y Servicios en Desarrollo

### Service Registry y Gateway

- **Service Registry**: `http://localhost:3010` (autodescubrimiento de servicios)
  - API Services: `http://localhost:3010/services`
  - Service Discovery: `http://localhost:3010/discover/{serviceName}`
  - Health Check: `http://localhost:3010/health`
- **API Gateway**: `http://localhost:8001` (enrutamiento dinámico)
  - Health con Service Discovery: `http://localhost:8001/health`
- **Frontend Flask**: `http://localhost:5000` (con debugging habilitado)

### Bases de Datos y Cache

- **PostgreSQL**: `localhost:5432`
  - User: `admin`, DB: `personas_db`
  - Conexión: `psql -h localhost -U admin -d personas_db`
- **Redis**: `localhost:6379`
  - Conexión: `redis-cli -h localhost`
- **Qdrant Vector DB**: `http://localhost:6333`
  - Dashboard: `http://localhost:6333/dashboard`

### Servicios Internos (autoregistrados en Service Registry)

- **Auth Service**: `http://auth-service:3001` (autoregistrado)
- **Personas Service**: `http://personas-service:3002` (autoregistrado)
- **Consulta Service**: `http://consulta-service:3003` (autoregistrado)
- **NLP Service**: `http://nlp-service:3004` (autoregistrado)
- **Log Service**: `http://log-service:3005` (autoregistrado)

### URLs de Testing con Service Registry

```bash
# Test de Service Registry
curl http://localhost:3010/services | jq

# Test de autodescubrimiento
curl http://localhost:3010/discover/auth-service | jq '.instance.url'

# Test de Gateway con Service Discovery
curl http://localhost:8001/health | jq '.registeredServices | length'

# Test de autenticación via service discovery
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test de error 409 (documento duplicado) via service discovery
curl -X POST http://localhost:8001/api/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"numero_documento":"1044606336", "primer_nombre":"Test"}'

# Test de consulta avanzada via service discovery
curl "http://localhost:8001/api/consulta/search?nombre=Juan"
```

## 🐛 Troubleshooting Avanzado

### 🌐 Service Registry Issues

#### 🔄 Problemas de Autoregistro

```bash
# Verificar que Service Registry está funcionando
curl http://localhost:3010/health

# Verificar logs del Service Registry
docker logs -f service_registry_dev

# Verificar que los servicios están intentando registrarse
docker logs auth_service_dev | grep "registered\|Service Registry"
docker logs personas_service_dev | grep "registered\|Service Registry"

# Test manual de registro
curl -X POST http://localhost:3010/register \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "test-service",
    "name": "test-service",
    "host": "localhost",
    "port": 9999,
    "metadata": {"version": "test"}
  }'

# Verificar que aparece en la lista
curl http://localhost:3010/services | jq '.services[] | select(.name=="test-service")'

# Limpiar registro de prueba
curl -X DELETE http://localhost:3010/services/test-service
```

#### 🔍 Problemas de Service Discovery

```bash
# Verificar que Gateway puede descubrir servicios
curl http://localhost:8001/health | jq '.registeredServices'

# Test de discovery específico
for service in auth-service personas-service consulta-service nlp-service log-service; do
  echo "Testing discovery for $service:"
  curl -s http://localhost:3010/discover/$service | jq '.instance.url'
done

# Verificar cache del Gateway
docker logs api_gateway_dev | grep "Service discovery\|Cache"

# Limpiar cache del Gateway si es necesario
docker restart api_gateway_dev
```

#### 💓 Problemas de Heartbeats

```bash
# Monitorear heartbeats en tiempo real
docker logs -f service_registry_dev | grep "💓\|Heartbeat"

# Verificar timestamps de heartbeats
curl http://localhost:3010/services | jq '.services[] | {name: .name, lastHeartbeat: .lastHeartbeat}'

# Simular problema de heartbeat (parar servicio temporalmente)
docker stop personas_service_dev
sleep 35  # Esperar más que el timeout de heartbeat
curl http://localhost:3010/services | jq '.services[] | select(.name=="personas-service").status'

# Reiniciar y verificar re-registro
docker start personas_service_dev
sleep 10
curl http://localhost:3010/services | jq '.services[] | select(.name=="personas-service").status'
```

#### 🔧 Problemas de Configuración

```bash
# Verificar variables de entorno
docker exec service_registry_dev env | grep SERVICE
docker exec auth_service_dev env | grep SERVICE_REGISTRY
docker exec personas_service_dev env | grep SERVICE_REGISTRY

# Verificar montaje del archivo compartido
docker exec personas_service_dev ls -la /app/shared/
docker exec personas_service_dev cat /app/shared/service-registry-client.js | head -10

# Test de conectividad entre contenedores
docker exec api_gateway_dev ping service-registry
docker exec personas_service_dev ping service-registry
```

### Frontend y JavaScript Issues

#### 🔔 Problemas con Notificaciones

```bash
# Verificar que NotificationManager está inicializado
# En Developer Console:
window.notificationManager
window.notificationHistory

# Test manual de notificaciones
window.showSuccess("Test notification")
window.showError("Test error")

# Verificar sessionStorage
sessionStorage.getItem('session_notifications')

# Limpiar notificaciones
sessionStorage.removeItem('session_notifications')
window.notificationHistory.clearAllNotifications()
```

#### 🎨 Problemas con Temas

```bash
# Verificar tema actual
document.documentElement.dataset.bsTheme

# Forzar tema específico
localStorage.setItem('preferred-theme', 'dark')
location.reload()

# Resetear tema
localStorage.removeItem('preferred-theme')
location.reload()
```

#### 🔍 Problemas de Validación

```bash
# Verificar eventos AJAX
# En Network tab: ver requests a /api/personas/existe/

# Test manual de validación
fetch('/api/personas/existe/1234567890')
  .then(r => r.json())
  .then(console.log)

# Verificar formularios
document.querySelector('#numero_documento').value
```

### Backend y API Issues

#### 🔧 Problemas de Error Handling

```bash
# Verificar logs de errores específicos
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend | grep "ERROR"

# Test de códigos de error específicos
curl -v -X POST http://localhost:8001/api/personas \
  -H "Content-Type: application/json" \
  -d '{"numero_documento":"existing_doc"}'

# Verificar gateway forwarding
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f gateway | grep "409"
```

#### 📊 Problemas de Dashboard

```bash
# Verificar cache invalidation
# Crear una persona y ver si el dashboard se actualiza

# Test manual de estadísticas
curl http://localhost:8001/api/dashboard/stats

# Verificar auto-refresh
# En Developer Console: ver requests cada 30 segundos
```

### Problemas Generales

#### Los cambios no se reflejan

```bash
# 1. Verificar que estés usando make dev
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# 2. Verificar volúmenes montados
docker-compose -f docker-compose.yml -f docker-compose.dev.yml config | grep volumes

# 3. Hard refresh del navegador
Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)

# 4. Reiniciar servicio específico
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart personas-service
```

### 🌐 Service Registry Development Commands

```bash
# Monitorear Service Registry en tiempo real
watch -n 2 'curl -s http://localhost:3010/services | jq'

# Ver servicios registrados
curl http://localhost:3010/services | jq

# Test manual del Service Registry
docker exec -it service_registry_dev node test-service-registry.js

# Verificar autodescubrimiento de servicios específicos
curl http://localhost:3010/discover/auth-service
curl http://localhost:3010/discover/personas-service
curl http://localhost:3010/discover/consulta-service

# Monitorear heartbeats
docker logs -f service_registry_dev | grep "💓\|registered\|heartbeat"

# Test del Gateway con Service Discovery
curl http://localhost:8001/health | jq '.registeredServices'
```

### Testing y Debugging con Service Registry

```bash
# Test completo del sistema con Service Registry
# 1. Verificar que todos los servicios están registrados
echo "Verificando autoregistro de servicios..."
curl -s http://localhost:3010/services | jq '.services[] | {name: .name, status: .status}'

# 2. Test de comunicación Gateway → Services vía Service Discovery
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Testing Gateway communication via Service Discovery..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8001/api/personas?limit=1" | jq

# 3. Simular fallo de servicio y verificar re-registro
docker stop personas_service_dev
sleep 10
echo "Verificando que el servicio se marcó como DOWN..."
curl -s http://localhost:3010/services | jq '.services[] | select(.name=="personas-service")'

docker start personas_service_dev
sleep 15
echo "Verificando re-registro automático..."
curl -s http://localhost:3010/services | jq '.services[] | select(.name=="personas-service")'
```

#### Problemas de permisos (Linux/Mac)

```bash
# Dar permisos al directorio node_modules
sudo chown -R $USER:$USER ./gateway/node_modules
sudo chown -R $USER:$USER ./services/*/node_modules

# Para archivos Python
sudo chown -R $USER:$USER ./frontend/__pycache__
```

#### Limpiar todo y empezar de nuevo

```bash
make down-dev
docker system prune -a -f
docker volume prune -f
make build-dev
make dev
```

#### Problemas de puertos ocupados

```bash
# Windows
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

## 📁 Estructura de Volúmenes y Hot Reload

### Configuración de Volúmenes Actualizada

```yaml
# Frontend Flask
volumes:
  - ./frontend:/app
  - /app/__pycache__  # Preserve Python cache

# Gateway Node.js
volumes:
  - ./gateway:/app
  - /app/node_modules  # Preserve node_modules

# Servicios Node.js
volumes:
  - ./services/auth:/app
  - ./services/personas:/app
  - ./services/consulta:/app  # Renombrado para consistencia
  - ./services/nlp:/app
  - ./services/log:/app
  - /app/node_modules  # En cada servicio
```

### Beneficios del Hot Reload

- ✅ **Editar archivos localmente** y ver cambios inmediatamente
- ✅ **Mantener dependencias** instaladas en el contenedor
- ✅ **Evitar conflictos** entre sistema host y contenedor
- ✅ **Debugging en tiempo real** sin rebuild
- 🔔 **Notificaciones** se actualizan automáticamente
- 🎨 **Temas CSS** se refrescan sin reload
- 🔍 **Validaciones JavaScript** se prueban instantáneamente

## 🔧 Comandos Útiles de Debug Actualizados

### Containers y Logs

```bash
# Ver estado de todos los contenedores
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Entrar a contenedores específicos
docker exec -it flask_app_dev bash
docker exec -it consulta_service_dev sh
docker exec -it gateway_dev sh

# Ver logs específicos con filtros
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend | grep "ERROR"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f consulta_service_dev | grep "409"

# Ver variables de entorno
docker exec flask_app_dev env | grep -E "(DB_|REDIS_|JWT_)"
docker exec consulta_service_dev env
```

### Database y Redis

```bash
# Conectar a PostgreSQL
docker exec -it personas_db psql -U admin -d personas_db

# Queries útiles
SELECT COUNT(*) FROM personas;
SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 5;

# Conectar a Redis
docker exec -it personas_redis redis-cli

# Comandos Redis útiles
KEYS *
FLUSHALL  # Limpiar cache
GET "session:*"
```

### 🗄️ Sistema de Migraciones de Base de Datos

El proyecto implementa un **sistema automático de backup/restore y migraciones** para garantizar la consistencia de la base de datos entre diferentes entornos.

#### Comandos de Base de Datos

```bash
# Ver estado de la base de datos
make db-status           # Muestra estadísticas (usuarios, personas, tablas, migraciones)

# Crear backup manual
make db-backup           # Crea un backup manual de la base de datos actual

# Restaurar desde backup
make db-restore          # Restaura desde latest_backup.sql (no destructivo)

# Reset completo (⚠️ PELIGROSO)
make db-reset            # Borra TODAS las tablas y restaura desde backup
                         # Espera 5 segundos para cancelar con Ctrl+C

# Ver migraciones aplicadas
make db-migrations       # Lista todas las migraciones con sus fechas
```

#### Workflow Automático

**Al iniciar contenedores** (`make up` o `make dev`):

1. Si existe un backup → Restaura automáticamente
2. Si NO existe backup → Ejecuta `init.sql` + aplica migraciones pendientes
3. Registra cada migración en `schema_migrations` para evitar duplicados

**Al detener contenedores** (`make down` o `make down-dev`):

1. Crea automáticamente un backup de la base de datos actual
2. Guarda como `latest_backup.sql` (último backup)
3. También crea copia con timestamp: `backup_YYYYMMDD_HHMMSS.sql`
4. Mantiene solo los últimos 5 backups

#### Crear Nueva Migración

```bash
# 1. Crear archivo en database/migrations/
# Ejemplo: database/migrations/003_add_notifications_table.sql

# 2. Escribir SQL con IF NOT EXISTS para idempotencia
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# 3. Aplicar migración automáticamente
make down     # Crea backup
make up       # Restaura + aplica nuevas migraciones

# 4. Verificar migración aplicada
make db-migrations
```

#### Estructura de Archivos

```
database/
├── init.sql                    # Schema inicial
├── init-db.sh                  # Script de inicialización
├── backup.sh                   # Script de backup automático
├── restore.sh                  # Script de restore automático
├── backups/                    # Backups (NO en git)
│   ├── latest_backup.sql       # Último backup (usado para restore)
│   ├── backup_20240101_120000.sql
│   └── .gitignore
└── migrations/                 # Migraciones (SÍ en git)
    ├── add_user_preferences.sql
    └── 002_add_notifications.sql
```

**📚 Documentación Completa**: Ver `DATABASE-MIGRATIONS.md` para detalles completos sobre:

- Casos de uso (clonar repo en nueva máquina, testing, recuperación)
- Troubleshooting
- Mejores prácticas
- Ejemplos avanzados

### Performance y Monitoring

```bash
# Ver uso de recursos
docker stats

# Ver espacio en disco
docker system df

# Verificar health de servicios
curl http://localhost:5000/health
curl http://localhost:8001/health

# Test de performance
time curl "http://localhost:8001/api/personas/search?q=Juan"
```

## 🚀 Tips de Desarrollo Productivo

### 1. **Setup Inicial Rápido**

```bash
# Clone y setup en un comando
git clone <repo> && cd gestion-personas-app && make dev
```

### 2. **Desarrollo Multiscreen**

```bash
# Terminal 1: Logs generales
make logs-dev

# Terminal 2: Logs específicos
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend

# Terminal 3: Comandos de testing
# Browser: Developer Tools abierto
```

### 3. **Testing Workflow**

```bash
# 1. Cambiar código
# 2. Ver hot reload automático
# 3. Test en navegador
# 4. Verificar logs si hay errores
# 5. Commit cuando funcione
```

### 4. **Shortcuts Útiles**

- **Ctrl+F5**: Hard refresh del navegador
- **F12**: Developer Tools
- **Ctrl+Shift+T**: Cambiar tema (en la app)
- **Ctrl+Shift+I**: Inspeccionar elemento

### 5. **Debugging Frontend**

```javascript
// En Developer Console:
// Ver estado de notificaciones
window.notificationHistory.getNotifications();

// Test manual de validación
window.validateDocument("1234567890");

// Ver tema actual
document.documentElement.dataset.bsTheme;

// Test de API directamente
fetch("/api/personas/search?q=test")
  .then((r) => r.json())
  .then(console.log);
```

---

## 📝 Notas de Desarrollo v3.0

### ✨ **Características Añadidas en esta Versión**

#### 🌐 **Service Registry Implementation**

- **Autodescubrimiento completo**: Todos los servicios se registran automáticamente
- **Service discovery dinámico**: Gateway encuentra servicios sin configuración hardcoded
- **Health monitoring**: Heartbeats cada 15 segundos con timestamps
- **Fault tolerance**: Re-registro automático en caso de fallos
- **Metadata enriquecida**: Versiones, tags, capabilities por cada servicio
- **API REST completa**: Endpoints para registro, discovery, heartbeats y cleanup
- **Testing automatizado**: Suite de tests incluida para verificar funcionalidad
- **Development friendly**: Hot reload preserva registros de servicios

#### 🔧 **Mejoras en Desarrollo**

- **Shared service client**: Archivo compartido entre todos los servicios
- **Graceful shutdown**: Desregistro limpio al cerrar servicios
- **Debugging avanzado**: Logs detallados de registro y heartbeats
- **Monitoring en tiempo real**: Comandos para ver estado de servicios
- **Network isolation**: Servicios se comunican a través del registry

#### 🎯 **Testing y Verificación**

- **Service Registry tests**: Tests automatizados incluidos
- **Integration tests**: Verificación de comunicación Gateway ↔ Services
- **Health check automation**: Verificación continua del estado
- **Development monitoring**: Comandos para debug en tiempo real

### 🔧 **Cambios en Desarrollo**

#### 📁 **Estructura de Archivos Actualizada**

- `services/shared/service-registry-client.js` - Cliente compartido para autoregistro
- `services/registry/` - Service Registry completo con API
- `services/registry/test-service-registry.js` - Tests automatizados
- Volúmenes compartidos actualizados en `docker-compose.dev.yml`

#### 🐳 **Docker Configuration**

- **Service Registry container**: `service_registry_dev:3010`
- **Shared volumes**: Cliente registry compartido entre servicios
- **Auto-registration**: Configuración automática de SERVICE_REGISTRY_URL
- **Development optimization**: Hot reload preserva registros

#### 🔄 **Workflow Actualizado**

- Los servicios se registran automáticamente al iniciar
- Gateway descubre servicios dinámicamente sin configuración estática
- Heartbeats mantienen servicios activos en el registry
- Re-registro automático en caso de fallos o reinicios

### 🎯 **Próximos Pasos en Desarrollo**

#### 🔄 **Service Registry Enhancements**

- [ ] **Load balancing**: Múltiples instancias del mismo servicio
- [ ] **Service versioning**: Versionado automático de APIs
- [ ] **Circuit breaker**: Protección contra servicios fallos
- [ ] **Metrics collection**: Recolección de métricas de servicios
- [ ] **Service mesh integration**: Preparación para Istio/Consul

#### 🧪 **Testing Improvements**

- [x] **Unit tests para middleware de autenticación** (Meta: 90%)
- [x] **Unit tests para validación de schemas Joi** (Meta: 95%)
- [x] **Unit tests para generación de tokens JWT** (Meta: 95%)
- [x] **Unit tests para procesamiento de imágenes Sharp** (Meta: 85%)
- [x] **Unit tests para utilidades y helpers** (Meta: 90-100%)
- [ ] Integration tests para todos los endpoints
- [ ] Performance tests para service discovery
- [ ] Chaos engineering tests para fault tolerance
- [ ] Automated deployment pipeline con registry

**Ver documentación completa en**: `gestion-personas-app/TESTING.md`

#### 🔧 **Development Tools**

- [ ] **VSCode extension**: Plugin para monitorear Service Registry
- [ ] **Dashboard web**: Interfaz gráfica para el registry
- [ ] **CLI tools**: Herramientas de línea de comandos
- [ ] **Monitoring integration**: Prometheus/Grafana setup
- [ ] **Log aggregation**: ELK stack integration

---

## 🔗 **Referencias y Enlaces Útiles**

### 📚 **Documentación Técnica**

- [Service Registry API Reference](http://localhost:3010/services) - Estado en tiempo real
- [Gateway Health Check](http://localhost:8001/health) - Servicios descubiertos
- [Development Logs](docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f) - Debugging

### 🧪 **Testing Resources**

#### **Tests Automatizados (Jest + Supertest)**

```powershell
# Ejecutar TODOS los tests con un solo comando
cd gestion-personas-app
.\run-all-tests.ps1

# Ver reportes de cobertura en navegador
.\open-coverage-reports.ps1

# Tests individuales por servicio
cd services/auth
npm test                    # Ejecutar todos los tests
npm test -- --coverage      # Con reporte de cobertura
npm run test:watch          # Modo watch (auto-ejecuta al guardar)

cd services/personas
npm test                    # Ejecutar todos los tests
```

**📊 Tests Implementados** (260+ tests, 2,834+ líneas de código):

- ✅ Middleware de autenticación JWT (40+ tests, 90% cobertura)
- ✅ Validación de schemas Joi (70+ tests, 95% cobertura)
- ✅ Generación de tokens JWT (50+ tests, 95% cobertura)
- ✅ Procesamiento de imágenes Sharp (55+ tests, 85% cobertura)
- ✅ Funciones auxiliares y helpers (45+ tests, 90-100% cobertura)

**📄 Documentación de Tests**:

- `TESTING.md` - Guía completa de testing
- `TESTS-SUMMARY.md` - Resumen de implementación
- `QUICK-START-TESTS.md` - Inicio rápido
- `INDEX-TESTS.md` - Índice completo de archivos

#### **Service Registry Tests**

```bash
# Test automatizado completo
docker exec -it service_registry_dev node test-service-registry.js

# Monitoring continuo
watch -n 2 'curl -s http://localhost:3010/services | jq ".services | length"'

# Debug de heartbeats
docker logs -f service_registry_dev | grep "💓"
```

### 🎯 **Quick Reference**

**Service Registry URLs:**

- Services List: `http://localhost:3010/services`
- Discovery: `http://localhost:3010/discover/{service-name}`
- Health: `http://localhost:3010/health`

**Development Commands:**

- Start: `make dev`
- Monitor: `watch -n 2 'curl -s http://localhost:3010/services | jq'`
- Test: `docker exec -it service_registry_dev node test-service-registry.js`
- Debug: `docker logs -f service_registry_dev`

**Troubleshooting:**

- Verificar autoregistro: `docker logs auth_service_dev | grep registered`
- Test de discovery: `curl http://localhost:3010/discover/auth-service`
- Gateway health: `curl http://localhost:8001/health | jq .registeredServices`
