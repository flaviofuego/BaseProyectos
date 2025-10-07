# Toggle Servicio de Consulta con Control Docker

## 📋 Resumen de Implementación

Implementación completa del toggle para **apagar y encender realmente el contenedor Docker** del servicio de consulta, integrado con Service Registry y API Gateway.

---

## 🏗️ Arquitectura

### Componentes Involucrados:

1. **Docker Controller** (`services/auth/docker-controller.js`)
   - Módulo para controlar contenedores Docker
   - Ejecuta comandos `docker start` y `docker stop`
   - Verifica estado de contenedores

2. **Auth Service** (`services/auth/index.js`)
   - Endpoint PUT `/preferences/consulta-service` modificado
   - Maneja lógica multi-usuario para control de contenedor
   - Integra Docker Controller

3. **Service Registry** (`services/registry/index.js`)
   - Mantiene registro de servicios activos
   - Marca servicios como DOWN automáticamente si no reciben heartbeat

4. **API Gateway** (`gateway/index.js`)
   - Middleware `checkConsultaServiceEnabled` verifica preferencias de usuario
   - Service Discovery busca servicios saludables en el registry

5. **Frontend** (`templates/configurar_cuenta.html`)
   - Toggle visual con estado del contenedor
   - Mensajes informativos sobre acciones Docker

---

## 🔧 Funcionamiento

### 1. **Activar Servicio (Toggle ON)**

```javascript
Usuario activa toggle
    ↓
Frontend envía PUT /api/auth/preferences/consulta-service { enabled: true }
    ↓
Auth Service:
    1. Actualiza preferencia en DB (user_preferences.consulta_service_enabled = TRUE)
    2. Ejecuta: docker start consulta_service_dev
    3. Espera 2 segundos para que el servicio se registre
    4. Retorna éxito con info del contenedor
    ↓
Consulta Service (al iniciar):
    1. Se registra automáticamente en Service Registry
    2. Envía heartbeats periódicos
    ↓
Service Registry:
    1. Agrega servicio a la lista de servicios disponibles
    2. Marca servicio como "UP"
    ↓
API Gateway:
    1. Service Discovery detecta consulta-service disponible
    2. Rutea peticiones /api/consulta al servicio
    ↓
Usuario puede acceder a "Consultar Datos"
```

### 2. **Desactivar Servicio (Toggle OFF)**

```javascript
Usuario desactiva toggle
    ↓
Frontend envía PUT /api/auth/preferences/consulta-service { enabled: false }
    ↓
Auth Service:
    1. Actualiza preferencia en DB (user_preferences.consulta_service_enabled = FALSE)
    2. Verifica cuántos usuarios tienen el servicio habilitado
    3. Si es el ÚLTIMO usuario:
        a. Ejecuta: docker stop consulta_service_dev
        b. Retorna éxito
    4. Si hay MÁS usuarios con servicio activo:
        a. NO detiene contenedor
        b. Retorna éxito (contenedor sigue corriendo para otros usuarios)
    ↓
Si se detuvo el contenedor:
    Consulta Service deja de enviar heartbeats
        ↓
    Service Registry (después de 30 segundos):
        1. Marca servicio como "DOWN"
        2. Service Discovery no retorna este servicio
        ↓
    API Gateway:
        1. No encuentra consulta-service en Service Discovery
        2. Retorna 404 en rutas /api/consulta
        ↓
API Gateway (middleware checkConsultaServiceEnabled):
    1. Verifica preferencia del usuario
    2. Retorna 403 si servicio deshabilitado para ese usuario
    ↓
Frontend oculta opción "Consultar Datos"
```

### 3. **Lógica Multi-Usuario**

El contenedor **SOLO se detiene** cuando el último usuario lo desactiva:

```sql
-- Verificar usuarios con servicio activo
SELECT COUNT(*) FROM user_preferences 
WHERE consulta_service_enabled = TRUE;

-- Si count = 0: DETENER contenedor
-- Si count > 0: MANTENER contenedor corriendo
```

Esto permite:
- ✅ Usuario A activa servicio → Contenedor inicia
- ✅ Usuario B activa servicio → Contenedor ya está corriendo (no hace nada)
- ✅ Usuario A desactiva servicio → Contenedor sigue corriendo (Usuario B lo usa)
- ✅ Usuario B desactiva servicio → Contenedor se detiene (último usuario)

---

## 🐳 Docker Socket Access

Para que el servicio de auth pueda controlar contenedores Docker, se monta el socket de Docker:

### docker-compose.dev.yml
```yaml
auth-service:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  environment:
    - CONSULTA_SERVICE_CONTAINER=consulta_service_dev
```

### docker-compose.yml (producción)
```yaml
auth-service:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  environment:
    - CONSULTA_SERVICE_CONTAINER=consulta_service
```

**Nota de Seguridad:** Montar `/var/run/docker.sock` da acceso completo al daemon de Docker. Solo usar en entornos controlados.

---

## 📡 API Endpoints

### PUT `/api/auth/preferences/consulta-service`
**Autenticación:** JWT requerido

**Request Body:**
```json
{
  "enabled": true  // o false
}
```

**Response (éxito):**
```json
{
  "success": true,
  "message": "Servicio de consulta habilitado correctamente",
  "preferences": {
    "consulta_service_enabled": true
  },
  "container_status": {
    "action": "started",  // o "stopped"
    "success": true,
    "message": "Container started successfully",
    "container": "consulta_service_dev"
  }
}
```

**Response (error al iniciar):**
```json
{
  "success": false,
  "message": "No se pudo iniciar el servicio de consulta. Revisa que Docker esté funcionando.",
  "error": "container_not_found"
}
```

### GET `/api/auth/preferences/consulta-service/container-status`
**Autenticación:** JWT requerido

**Response:**
```json
{
  "success": true,
  "container": {
    "container_name": "consulta_service_dev",
    "status": "running",  // o "stopped", "not_found", "error"
    "is_running": true,
    "timestamp": "2025-10-07T15:30:00.000Z"
  },
  "users_with_service_enabled": 2
}
```

---

## 🔍 Service Registry Integration

### Heartbeat Automático

Cuando el contenedor inicia, el servicio de consulta:
1. Se registra inmediatamente en Service Registry
2. Envía heartbeats cada 10 segundos
3. Si pasa 30 segundos sin heartbeat → marcado como DOWN

### Service Discovery

API Gateway usa Service Discovery para encontrar servicios:
```javascript
const serviceUrl = await serviceDiscovery.getServiceUrl('consulta-service');
// Si el servicio está DOWN o no existe: throw Error
// Si está UP: retorna URL del servicio
```

---

## 🎨 Frontend UI

### Estado Visual

El badge muestra información en tiempo real:

**Servicio Activo:**
```html
<span class="badge bg-success">
  <i class="fas fa-check-circle"></i> Servicio Activo
</span>
<span class="badge bg-info ms-2">
  <i class="fas fa-docker"></i> Contenedor: Iniciado
</span>
```

**Servicio Desactivado:**
```html
<span class="badge bg-danger">
  <i class="fas fa-times-circle"></i> Servicio Desactivado
</span>
<span class="badge bg-secondary ms-2">
  <i class="fas fa-docker"></i> Contenedor: Detenido
</span>
```

### Modal de Confirmación

Mensajes informativos sobre las acciones Docker:

**Al Activar:**
- Se iniciará el contenedor Docker
- Podrás consultar datos de personas
- El servicio se registrará en el service registry

**Al Desactivar:**
- Se detendrá el contenedor (si no hay otros usuarios)
- Se deshabilitará "Consultar Datos"
- El servicio se desregistrará del registry

---

## 🧪 Testing

### Verificar Estado del Contenedor

```bash
# Ver contenedores corriendo
docker ps --filter "name=consulta_service_dev"

# Ver todos los contenedores (incluyendo detenidos)
docker ps -a --filter "name=consulta_service_dev"

# Ver logs del contenedor
docker logs consulta_service_dev -f
```

### Probar Toggle

1. **Usuario 1 activa servicio:**
   ```bash
   # El contenedor debe iniciar
   docker ps | grep consulta_service_dev
   # Debe aparecer "Up X seconds/minutes"
   ```

2. **Usuario 2 activa servicio:**
   ```bash
   # El contenedor ya está corriendo (no debe reiniciar)
   docker ps | grep consulta_service_dev
   # Mismo contenedor, tiempo Up continúa
   ```

3. **Usuario 1 desactiva servicio:**
   ```bash
   # El contenedor sigue corriendo (Usuario 2 lo usa)
   docker ps | grep consulta_service_dev
   # Debe seguir "Up"
   ```

4. **Usuario 2 desactiva servicio:**
   ```bash
   # Ahora sí se detiene (último usuario)
   docker ps -a | grep consulta_service_dev
   # Debe aparecer "Exited"
   ```

### Verificar Service Registry

```bash
# Ver servicios registrados
curl http://localhost:8001/health

# Debe incluir consulta-service si está activo
{
  "status": "OK",
  "registeredServices": [
    {
      "name": "consulta-service",
      "status": "UP",
      "isHealthy": true
    }
  ]
}
```

---

## ⚠️ Consideraciones

### Seguridad

1. **Docker Socket Access:**
   - Da acceso completo al daemon de Docker
   - Solo usar en entornos de desarrollo/producción controlados
   - Considerar alternativas como Docker API remota con TLS

2. **Permisos:**
   - Solo usuarios autenticados pueden cambiar preferencias
   - JWT token requerido

### Performance

1. **Inicio de Contenedor:**
   - Toma ~2-5 segundos iniciar
   - Frontend muestra spinner durante el proceso

2. **Cache:**
   - Service Discovery cachea URLs por 30 segundos
   - Preferencias de usuario cacheadas en Redis

### Reliability

1. **Timeouts:**
   - Comandos Docker tienen timeout de 10 segundos
   - Health checks cada 30 segundos en registry

2. **Fallbacks:**
   - Si falla detener contenedor: preferencia se guarda igual
   - Si falla iniciar contenedor: preferencia se revierte

---

## 📝 Logs

### Auth Service

```
✅ User 1 enabling service - ensuring container is running
🚀 Starting consulta_service_dev...
✅ Successfully started consulta_service_dev

🛑 User 2 disabling service - remaining users with service: 1
✅ Container will remain running for 1 other user(s)

🛑 User 1 disabling service - remaining users with service: 0
🛑 No users left with service enabled - stopping container
🛑 Stopping consulta_service_dev...
✅ Successfully stopped consulta_service_dev
```

### Service Registry

```
✅ Service registered: consulta-service (consulta-1) at http://consulta-service:3003
💓 Heartbeat received from consulta-service (consulta-1)
❌ Service consulta-service (consulta-1) marked as DOWN - no heartbeat for 30s
```

---

## 🚀 Despliegue

### Reiniciar Auth Service

```bash
# Modo desarrollo
cd gestion-personas-app
docker-compose -f docker-compose.dev.yml restart auth-service

# Modo producción
docker-compose restart auth-service
```

### Verificar Montaje del Socket

```bash
# Verificar que el socket está montado
docker exec auth_service_dev ls -la /var/run/docker.sock

# Debe mostrar el socket montado
srw-rw---- 1 root docker 0 Oct  7 15:00 /var/run/docker.sock
```

---

## 📚 Referencias

- [Docker API - Start Container](https://docs.docker.com/engine/api/v1.41/#operation/ContainerStart)
- [Docker API - Stop Container](https://docs.docker.com/engine/api/v1.41/#operation/ContainerStop)
- [Docker Socket Access](https://docs.docker.com/engine/security/protect-access/)
- [Service Discovery Pattern](https://microservices.io/patterns/server-side-discovery.html)

---

## ✅ Checklist de Implementación

- [x] Docker Controller creado
- [x] Auth Service modificado con lógica multi-usuario
- [x] Endpoint container-status agregado
- [x] docker-compose.dev.yml actualizado
- [x] docker-compose.yml actualizado
- [x] Frontend actualizado con estado de contenedor
- [x] Modal de confirmación mejorado
- [x] Logs informativos agregados
- [x] Documentación creada

---

**Fecha:** 7 de octubre de 2025
**Versión:** 1.0.0
**Autor:** Sistema de Gestión de Personas
