# Control del Servicio de Consulta

## Descripción
Funcionalidad que permite a los usuarios activar/desactivar el servicio de consulta desde el panel de configuración de cuenta. Cuando está desactivado, las opciones de consulta se ocultan del menú de navegación.

## Características Implementadas

### 1. Toggle Button en Configurar Cuenta
- **Ubicación**: `/configurar-cuenta`
- **Componente**: Switch toggle con diseño Bootstrap
- **Estado visual**: Badge que muestra "Servicio Activo" (verde) o "Servicio Desactivado" (rojo)
- **Confirmación**: Modal de confirmación antes de cambiar el estado

### 2. Modal de Confirmación
- **Propósito**: Prevenir cambios accidentales
- **Contenido dinámico**: 
  - Al activar: Muestra mensaje informativo con ícono de éxito
  - Al desactivar: Muestra advertencia sobre ocultación de menús
- **Acciones**: Botones de "Cancelar" y "Confirmar"

### 3. Backend - Endpoints

#### GET `/api/auth/preferences/consulta-service`
Obtiene las preferencias actuales del usuario.

**Response**:
```json
{
  "success": true,
  "preferences": {
    "consulta_service_enabled": true
  }
}
```

#### PUT `/api/auth/preferences/consulta-service`
Actualiza el estado del servicio de consulta.

**Request**:
```json
{
  "enabled": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Servicio de consulta deshabilitado correctamente",
  "preferences": {
    "consulta_service_enabled": false
  }
}
```

### 4. Base de Datos
**Tabla**: `user_preferences`
- `user_id` (FK a users.id)
- `consulta_service_enabled` (BOOLEAN, default TRUE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 5. Comportamiento del Menú
Cuando `consulta_service_enabled = false`:

**Menú "Personas"**:
- ✅ Crear Persona (visible)
- ✅ Modificar Datos (visible)
- 🔒 **Consultar Datos** (desactivado, texto gris)
- ✅ Borrar Persona (visible)

**Menú principal**:
- ✅ **Consulta IA** (permanece activo - usa NLP service que es independiente)
- ✅ Logs (visible)

**Nota importante**: El servicio de NLP (Consulta IA) NO depende del consulta-service. Por lo tanto, "Consulta IA" permanece disponible incluso cuando el servicio de consulta está desactivado.

### 6. Auto-reactivación en Logout
- Al cerrar sesión, el servicio se reactiva automáticamente
- Garantiza que el servicio esté activo por defecto para todos los usuarios
- La reactivación ocurre antes de limpiar la sesión

### 7. Persistencia de Estado
- El estado se guarda en la base de datos (`user_preferences`)
- Se carga automáticamente al hacer login
- Se incluye en el objeto `session.user.consulta_service_enabled`
- Cache de 5 minutos en Redis para optimizar rendimiento

## Flujo de Uso

### Usuario desactiva el servicio:
1. Usuario navega a "Configurar Cuenta"
2. Click en toggle (activo → desactivado)
3. Modal de confirmación aparece
4. Usuario confirma la acción
5. Request PUT a `/api/auth/preferences/consulta-service` con `enabled: false`
6. Backend actualiza la base de datos
7. Backend invalida cache de Redis
8. Frontend actualiza la sesión
9. Página se recarga automáticamente
10. Menú se actualiza ocultando opciones de consulta

### Usuario cierra sesión:
1. Usuario hace click en "Cerrar Sesión"
2. Frontend envía PUT a `/api/auth/preferences/consulta-service` con `enabled: true`
3. Backend reactiva el servicio
4. Se ejecuta el proceso normal de logout

### Usuario inicia sesión:
1. Usuario se autentica
2. Backend carga preferencias desde `user_preferences`
3. Si no existen, crea preferencias por defecto (enabled: true)
4. Incluye `consulta_service_enabled` en el objeto user
5. Frontend almacena en `session.user.consulta_service_enabled`
6. Menú se renderiza según el estado

## Archivos Modificados

### Frontend
- `frontend/templates/configurar_cuenta.html`: Toggle button y modal
- `frontend/templates/base.html`: Condicionales en menú de navegación
- `frontend/app.py`: Endpoints proxy y lógica de logout

### Backend
- `services/auth/index.js`: 
  - Endpoints de preferencias
  - Modificación en login para incluir preferencias
  - Función `getUserPreferences()`

### Base de Datos
- Tabla `user_preferences` ya existía
- Columna `consulta_service_enabled` ya existía

## Testing

### Prueba Manual
1. Login como admin
2. Verificar que menú muestra todas las opciones
3. Ir a "Configurar Cuenta"
4. Desactivar servicio de consulta
5. Confirmar en modal
6. Verificar que "Consultar Datos" está desactivado en menú
7. Verificar que "Consulta IA" no aparece en menú principal
8. Cerrar sesión
9. Login nuevamente
10. Verificar que servicio está activo de nuevo

### Prueba con cURL
```powershell
# Desactivar servicio
Invoke-WebRequest -Uri "http://localhost:8001/api/auth/preferences/consulta-service" `
  -Method PUT `
  -Headers @{"Authorization"="Bearer TOKEN"; "Content-Type"="application/json"} `
  -Body '{"enabled":false}'

# Verificar estado
Invoke-WebRequest -Uri "http://localhost:8001/api/auth/preferences" `
  -Method GET `
  -Headers @{"Authorization"="Bearer TOKEN"}
```

## Seguridad
- ✅ Endpoints protegidos con `@login_required` / JWT authentication
- ✅ Validación de entrada (`typeof enabled === 'boolean'`)
- ✅ Operaciones atómicas en base de datos
- ✅ Cache invalidation correcta
- ✅ Estado por defecto seguro (enabled: true)

## Performance
- ✅ Cache en Redis (5 minutos)
- ✅ Invalidación automática al actualizar preferencias
- ✅ Query optimizada con índice en `user_id`
- ✅ Carga lazy de preferencias (solo al login)

## UX
- ✅ Confirmación antes de cambios
- ✅ Feedback visual claro (badges, iconos)
- ✅ Mensajes informativos en modal
- ✅ Recarga automática para aplicar cambios
- ✅ Estado persistente entre sesiones
- ✅ Auto-reactivación en logout (comportamiento predecible)

## Limitaciones Conocidas
- El servicio se reactiva al cerrar sesión (diseño intencional)
- Cambios requieren recarga de página
- No hay opción para mantener desactivado permanentemente

## Futuras Mejoras Posibles
- [ ] Actualización del menú sin recarga (AJAX)
- [ ] Opción para mantener desactivado permanentemente
- [ ] Control granular por tipo de consulta
- [ ] Historial de cambios de preferencias
- [ ] Notificación cuando otro usuario desactiva el servicio

## Logs y Debugging
Los cambios de preferencias se registran en:
- Console del navegador (fetch requests)
- Logs del auth service (`console.log`)
- Tabla `transaction_logs` (transacción UPDATE_PREFERENCES)

## Changelog
- **2025-01-07**: Implementación inicial del toggle de servicio de consulta
  - Toggle button con modal de confirmación
  - Endpoints GET/PUT en auth service
  - Integración con menú de navegación
  - Auto-reactivación en logout
  - Persistencia en base de datos
