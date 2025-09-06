# Guía de Desarrollo - Gestión de Personas App v2.5

## 🚀 Configuración para Desarrollo Avanzado

Esta guía actualizada te ayudará a configurar el entorno de desarrollo con **hot reload**, **debugging avanzado**, y **herramientas de desarrollo modernas** para que los cambios en el código se reflejen automáticamente.

## 🆕 Novedades en Desarrollo (Septiembre 2025)

### ✨ **Nuevas Características de Desarrollo**
- 🔔 **Sistema de notificaciones** con debugging tools
- 🎨 **Tema oscuro** completo para mejor desarrollo nocturno
- 🔍 **Validación en tiempo real** con hot reload instantáneo
- 📊 **Dashboard auto-refresh** con cache invalidation
- 🛡️ **Error handling avanzado** con códigos específicos (409, 422)
- 🔧 **Session storage debugging** para notificaciones

### 🏗️ **Arquitectura Actualizada**
- **Container renaming**: `consulta_service_dev` para consistencia
- **Gateway error forwarding**: Preservación de códigos HTTP
- **Frontend optimization**: AJAX validation y error display
- **Backend debugging**: Logs detallados para troubleshooting

## Estructura de Archivos para Desarrollo

- `docker-compose.yml` - Configuración de producción
- `docker-compose.dev.yml` - Configuración de desarrollo con volúmenes montados
- `Dockerfile` - Dockerfiles de producción (en cada servicio)
- `Dockerfile.dev` - Dockerfiles de desarrollo (en cada servicio)

## 🛠️ Comandos de Desarrollo Actualizados

### Desarrollo (con hot reload y debugging)
```bash
# Construir imágenes de desarrollo
make build-dev

# Iniciar servicios en modo desarrollo
make dev

# Ver logs de desarrollo con filtros
make logs-dev

# Logs específicos por servicio
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f consulta_service_dev

# Detener servicios de desarrollo
make down-dev

# Restart específico (útil para cambios en Python/Node)
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

### 1. **Desarrollo Frontend (JavaScript/CSS)**:
   ```bash
   make dev
   # Editar archivos en frontend/static/js/ o frontend/static/css/
   # Los cambios se reflejan automáticamente en el navegador
   # Verificar en Developer Tools que los archivos se cargan
   ```

### 2. **Desarrollo Backend (Python/Node.js)**:
   ```bash
   make dev
   # Editar archivos en frontend/app.py o services/*/index.js
   # Los servicios se reinician automáticamente
   # Verificar logs: docker-compose ... logs -f [servicio]
   ```

### 3. **Testing de Nuevas Características**:
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

### 4. **Debugging Avanzado**:
   ```bash
   # Backend debugging
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
   
   # Frontend debugging
   # En Developer Tools:
   # - Console: Ver logs de JavaScript
   # - Network: Verificar requests AJAX
   # - Application: Ver sessionStorage y localStorage
   ```

### 5. **Testing/Staging**:
   ```bash
   make down-dev
   make build
   make up
   # Probar en modo producción antes de deploy
   ```

## 🌐 Puertos y Servicios en Desarrollo

### Frontend y Gateway
- **Frontend Flask**: `http://localhost:5000` (con debugging habilitado)
- **API Gateway**: `http://localhost:8001` (puerto actualizado)
- **Health Checks**: 
  - Frontend: `http://localhost:5000/health`
  - Gateway: `http://localhost:8001/health`

### Bases de Datos y Cache
- **PostgreSQL**: `localhost:5432` 
  - User: `admin`, DB: `personas_db`
  - Conexión: `psql -h localhost -U admin -d personas_db`
- **Redis**: `localhost:6379`
  - Conexión: `redis-cli -h localhost`
- **Qdrant Vector DB**: `http://localhost:6333`
  - Dashboard: `http://localhost:6333/dashboard`

### Servicios Internos (entre contenedores)
- **Auth Service**: `http://auth_service_dev:3001`
- **Personas Service**: `http://personas_service_dev:3002`
- **Consulta Service**: `http://consulta_service_dev:3003` *(nombre actualizado)*
- **NLP Service**: `http://nlp_service_dev:3004`
- **Log Service**: `http://log_service_dev:3005`

### URLs de Testing
```bash
# Test de autenticación
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test de error 409 (documento duplicado)
curl -X POST http://localhost:8001/api/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"numero_documento":"1234567890", "primer_nombre":"Test"}'

# Test de consulta avanzada
curl "http://localhost:8001/api/consulta/avanzada?nombre=Juan"
```

## 🐛 Troubleshooting Avanzado

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
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend
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
window.notificationHistory.getNotifications()

// Test manual de validación
window.validateDocument('1234567890')

// Ver tema actual
document.documentElement.dataset.bsTheme

// Test de API directamente
fetch('/api/personas/search?q=test').then(r=>r.json()).then(console.log)
```

---

## 📝 Notas de Desarrollo v2.5

### ✨ **Características Añadidas en esta Versión**
- Sistema de notificaciones con dropdown e historial
- Tema oscuro completo y optimizado
- Validación en tiempo real con AJAX
- Error handling específico (409, 422, etc.)
- Dashboard con auto-refresh inteligente
- Búsqueda silenciosa en logs de auditoría

### 🔧 **Cambios en Desarrollo**
- Container `consulta_service_dev` renombrado para consistencia
- Hot reload mejorado para componentes JavaScript
- Debugging tools específicos para notificaciones y temas
- Testing workflows actualizados para nuevas características

### 🎯 **Próximos Pasos en Desarrollo**
- [ ] PWA setup para desarrollo offline
- [ ] Unit tests para componentes JavaScript
- [ ] Integration tests para API endpoints
- [ ] Performance profiling tools
- [ ] Automated deployment pipeline
