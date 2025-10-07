# Configuración del Servicio de Consulta por Usuario

## Descripción General

Este documento describe la funcionalidad que permite a los usuarios habilitar o deshabilitar el servicio de consulta desde su panel de configuración.

## Características

- ✅ **Servicio habilitado por defecto**: Todos los usuarios tienen el servicio de consulta habilitado al iniciar sesión
- ✅ **Control por sesión/usuario**: Cada usuario puede habilitar o deshabilitar el servicio independientemente
- ✅ **Persistencia**: La configuración se guarda en la base de datos y se mantiene entre sesiones
- ✅ **Cache optimizado**: Uso de Redis para verificaciones rápidas sin impactar el rendimiento
- ✅ **Fail-safe**: Si hay errores al verificar el estado, el servicio permanece habilitado por defecto

## Arquitectura

### 1. Base de Datos

Se agregó la tabla `user_preferences` que almacena las configuraciones de cada usuario:

```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consulta_service_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

### 2. Servicio de Auth (Backend)

Se agregaron los siguientes endpoints en el servicio de autenticación:

#### GET `/api/auth/preferences`
Obtiene las preferencias del usuario autenticado.

**Headers requeridos:**
- `Authorization: Bearer <token>`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "preferences": {
    "consulta_service_enabled": true,
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT `/api/auth/preferences/consulta-service`
Actualiza el estado del servicio de consulta para el usuario autenticado.

**Headers requeridos:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "enabled": false
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Servicio de consulta deshabilitado correctamente",
  "preferences": {
    "consulta_service_enabled": false
  }
}
```

#### GET `/api/auth/preferences/consulta-service/check/:userId`
Verifica si el servicio de consulta está habilitado para un usuario específico.
Este endpoint es utilizado internamente por el API Gateway.

**Respuesta exitosa (200):**
```json
{
  "enabled": true,
  "user_id": 1
}
```

### 3. API Gateway (Middleware)

Se implementó el middleware `checkConsultaServiceEnabled` que:

1. Intercepta todas las peticiones a `/api/consulta/*`
2. Obtiene el `user_id` del header `x-user-id`
3. Consulta al servicio de auth si el servicio está habilitado para ese usuario
4. Si está deshabilitado, retorna un error 403
5. Si está habilitado o hay algún error en la verificación, permite continuar

**Respuesta cuando el servicio está deshabilitado (403):**
```json
{
  "error": "Servicio de consulta deshabilitado",
  "message": "El servicio de consulta está deshabilitado para tu usuario. Puedes habilitarlo desde la configuración de tu cuenta.",
  "service_disabled": true
}
```

### 4. Cache con Redis

Las preferencias de usuario se almacenan en cache durante 5 minutos para optimizar el rendimiento:

- **Clave en Redis**: `user_prefs:{userId}`
- **TTL**: 300 segundos (5 minutos)
- **Invalidación**: Al actualizar preferencias, se elimina automáticamente del cache

## Flujo de Funcionamiento

### Nuevo Usuario

1. Usuario se registra o inicia sesión
2. Si no tiene preferencias, se crean automáticamente con `consulta_service_enabled = TRUE`
3. Usuario puede acceder al servicio de consulta normalmente

### Deshabilitar Servicio

1. Usuario va a "Configurar Cuenta" en el frontend
2. Hace clic en "Deshabilitar Servicio de Consulta"
3. Frontend envía `PUT /api/auth/preferences/consulta-service` con `{"enabled": false}`
4. Backend actualiza la base de datos e invalida el cache
5. Próxima petición a `/api/consulta/*` será rechazada con error 403

### Habilitar Servicio

1. Usuario va a "Configurar Cuenta" en el frontend
2. Hace clic en "Habilitar Servicio de Consulta"
3. Frontend envía `PUT /api/auth/preferences/consulta-service` con `{"enabled": true}`
4. Backend actualiza la base de datos e invalida el cache
5. Usuario puede volver a acceder al servicio de consulta

## Rutas Afectadas

Todas las rutas del servicio de consulta están protegidas por este control:

- `GET /api/consulta/persona/:numero_documento`
- `GET /api/consulta/search`
- `GET /api/consulta/stats`
- `GET /api/consulta/dashboard/stats`
- `POST /api/consulta/cache/invalidate-stats`

**Excepción:** El endpoint de health check `/api/consulta/health` NO está protegido para permitir monitoreo.

## Implementación en el Frontend

Para implementar la interfaz de usuario en el frontend, necesitarás:

### 1. Obtener Estado Actual

```javascript
// En la página de configuración de cuenta
const response = await fetch('/api/auth/preferences', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
const isEnabled = data.preferences.consulta_service_enabled;
```

### 2. Cambiar Estado

```javascript
// Al hacer clic en el botón de habilitar/deshabilitar
const response = await fetch('/api/auth/preferences/consulta-service', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: !currentState
  })
});

const data = await response.json();
if (data.success) {
  // Actualizar UI
  console.log(data.message);
}
```

### 3. Manejar Errores 403

Cuando el servicio está deshabilitado y el usuario intenta acceder:

```javascript
// En las funciones que llaman al servicio de consulta
try {
  const response = await fetch('/api/consulta/search?...', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 403) {
    const error = await response.json();
    if (error.service_disabled) {
      // Mostrar mensaje al usuario
      alert('El servicio de consulta está deshabilitado. Ve a Configuración para habilitarlo.');
    }
  }
} catch (error) {
  console.error('Error:', error);
}
```

## Ejemplo de UI (Sugerido)

```html
<!-- En la página de configuración de cuenta -->
<div class="setting-card">
  <h3>Servicio de Consulta</h3>
  <p>Controla si deseas tener acceso al servicio de búsqueda y consulta de personas.</p>
  
  <div class="toggle-switch">
    <label>
      <input 
        type="checkbox" 
        id="consulta-service-toggle"
        checked="{{ preferences.consulta_service_enabled }}"
        onchange="toggleConsultaService(this.checked)"
      >
      <span class="slider"></span>
    </label>
    <span id="consulta-service-status">
      {{ 'Habilitado' if preferences.consulta_service_enabled else 'Deshabilitado' }}
    </span>
  </div>
  
  <p class="description">
    Cuando está deshabilitado, no podrás acceder a las funciones de búsqueda 
    y consulta de personas. El dashboard y otras funcionalidades no se verán afectadas.
  </p>
</div>
```

## Consideraciones de Seguridad

1. **Autenticación requerida**: Todos los endpoints requieren token JWT válido
2. **Autorización por usuario**: Cada usuario solo puede modificar sus propias preferencias
3. **Validación de entrada**: Se valida que el campo `enabled` sea un booleano
4. **Logging**: Todos los cambios de preferencias se registran en el log de transacciones
5. **Fail-safe**: En caso de error al verificar, se permite acceso por defecto

## Migración de Datos

Si ya tienes usuarios en la base de datos, ejecuta:

```bash
# Aplicar la migración
psql -U usuario -d base_datos -f gestion-personas-app/database/migrations/add_user_preferences.sql
```

Esto creará:
- La tabla `user_preferences`
- Preferencias por defecto para todos los usuarios existentes (servicio habilitado)

## Testing

### Probar con cURL

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# 2. Obtener preferencias
curl http://localhost:8001/api/auth/preferences \
  -H "Authorization: Bearer $TOKEN"

# 3. Deshabilitar servicio
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 4. Intentar acceder al servicio de consulta (debería fallar con 403)
curl http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer $TOKEN"

# 5. Habilitar servicio nuevamente
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 6. Intentar acceder nuevamente (debería funcionar)
curl http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### El servicio siempre está habilitado aunque lo deshabilite
- Verifica que el cache de Redis esté funcionando
- Revisa los logs del gateway para ver si el middleware se está ejecutando
- Confirma que la actualización en la base de datos se esté realizando correctamente

### Error al verificar preferencias
- El sistema está diseñado para permitir acceso por defecto en caso de error
- Revisa los logs del servicio de auth
- Verifica la conexión entre el gateway y el servicio de auth

### Las preferencias no persisten entre sesiones
- Verifica que la tabla `user_preferences` exista en la base de datos
- Confirma que el trigger de actualización funcione correctamente
- Revisa que el TTL del cache no sea demasiado largo

## Monitoreo

Los siguientes eventos se registran en el log de transacciones:

- `UPDATE_PREFERENCES`: Cuando un usuario cambia sus preferencias
- `DASHBOARD_STATS`: Incluye información sobre acceso al servicio
- `QUERY`, `SEARCH`, `STATS`: Todos incluyen el `user_id` para auditoría

Puedes consultar estos logs en `/logs` del panel de administración.

