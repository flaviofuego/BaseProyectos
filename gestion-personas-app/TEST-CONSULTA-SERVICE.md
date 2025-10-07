# Guía de Prueba: Control del Servicio de Consulta

## Resumen

Se ha implementado la funcionalidad backend completa para controlar el servicio de consulta por usuario/sesión.

## ✅ Componentes Implementados

### 1. Base de Datos
- ✅ Tabla `user_preferences` creada en `database/init.sql`
- ✅ Migración disponible en `database/migrations/add_user_preferences.sql`
- ✅ Preferencias por defecto: servicio HABILITADO para todos los usuarios
- ✅ Triggers para actualización automática de timestamps

### 2. Servicio de Autenticación (Backend)
- ✅ `GET /api/auth/preferences` - Obtener preferencias del usuario
- ✅ `PUT /api/auth/preferences/consulta-service` - Actualizar estado del servicio
- ✅ `GET /api/auth/preferences/consulta-service/check/:userId` - Verificar estado (interno)
- ✅ Funciones de cache en Redis con TTL de 5 minutos
- ✅ Invalidación automática de cache al actualizar preferencias
- ✅ Logging de todas las operaciones

### 3. API Gateway (Middleware)
- ✅ Middleware `checkConsultaServiceEnabled` implementado
- ✅ Intercepta todas las peticiones a `/api/consulta/*`
- ✅ Retorna 403 si el servicio está deshabilitado
- ✅ Fail-safe: permite acceso por defecto en caso de error
- ✅ No afecta health checks

### 4. Frontend (Archivos de Ejemplo)
- ✅ `frontend/static/js/consulta-service-manager.js` - Librería JavaScript
- ✅ `frontend/static/css/consulta-service-config.css` - Estilos CSS
- ✅ Funciones de utilidad para integrar con el UI

## 🧪 Cómo Probar

### Paso 1: Aplicar Cambios en la Base de Datos

```bash
# Si estás usando Docker Compose
docker-compose -f gestion-personas-app/docker-compose.dev.yml down
docker-compose -f gestion-personas-app/docker-compose.dev.yml up -d postgres

# Esperar a que PostgreSQL esté listo
sleep 5

# La tabla se creará automáticamente al iniciar los servicios
# ya que está en init.sql
```

### Paso 2: Reiniciar los Servicios

```bash
# Reiniciar todos los servicios
docker-compose -f gestion-personas-app/docker-compose.dev.yml restart

# O reconstruir si es necesario
docker-compose -f gestion-personas-app/docker-compose.dev.yml up -d --build
```

### Paso 3: Probar con cURL

```bash
# 1. Obtener token de autenticación
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

echo "Token obtenido: $TOKEN"

# 2. Verificar que el servicio de consulta funciona (debería funcionar)
echo -e "\n=== Prueba 1: Acceder al servicio de consulta (debería funcionar) ==="
curl -s http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# 3. Obtener preferencias actuales
echo -e "\n=== Prueba 2: Obtener preferencias ==="
curl -s http://localhost:8001/api/auth/preferences \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# 4. DESHABILITAR el servicio de consulta
echo -e "\n=== Prueba 3: Deshabilitar servicio de consulta ==="
curl -s -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' \
  | jq '.'

# 5. Intentar acceder al servicio (debería fallar con 403)
echo -e "\n=== Prueba 4: Intentar acceder al servicio (debería fallar con 403) ==="
curl -s -w "\nHTTP Status: %{http_code}\n" \
  http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# 6. Intentar buscar personas (también debería fallar)
echo -e "\n=== Prueba 5: Intentar buscar personas (debería fallar con 403) ==="
curl -s -w "\nHTTP Status: %{http_code}\n" \
  http://localhost:8001/api/consulta/search?limit=10 \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# 7. HABILITAR el servicio nuevamente
echo -e "\n=== Prueba 6: Habilitar servicio de consulta ==="
curl -s -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  | jq '.'

# 8. Verificar que funciona nuevamente
echo -e "\n=== Prueba 7: Acceder al servicio (debería funcionar nuevamente) ==="
curl -s http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

echo -e "\n✅ Pruebas completadas!"
```

### Paso 4: Probar desde el Navegador

1. **Abrir el navegador** y navegar a `http://localhost:5000`

2. **Iniciar sesión** con:
   - Usuario: `admin`
   - Contraseña: `admin123`

3. **Ir al Dashboard** - Debería funcionar normalmente

4. **Abrir la consola del navegador** (F12) y ejecutar:

```javascript
// Obtener token (asumiendo que está en session o localStorage)
const token = 'temp-admin-token'; // O el token real de tu sesión

// Deshabilitar servicio
fetch('/api/auth/preferences/consulta-service', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ enabled: false })
})
.then(r => r.json())
.then(console.log);

// Intentar acceder al dashboard stats (debería fallar)
fetch('/api/consulta/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(async r => {
  console.log('Status:', r.status);
  console.log('Data:', await r.json());
});

// Habilitar servicio nuevamente
fetch('/api/auth/preferences/consulta-service', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ enabled: true })
})
.then(r => r.json())
.then(console.log);
```

### Paso 5: Verificar en la Base de Datos

```bash
# Conectarse a PostgreSQL
docker exec -it postgres_db psql -U usuario -d gestion_personas

# Verificar la tabla de preferencias
SELECT * FROM user_preferences;

# Verificar los logs de transacciones
SELECT * FROM transaction_logs 
WHERE transaction_type = 'UPDATE_PREFERENCES' 
ORDER BY created_at DESC 
LIMIT 10;

# Salir
\q
```

## 📊 Resultados Esperados

### Servicio HABILITADO (por defecto)
- ✅ `GET /api/consulta/stats` → 200 OK con datos
- ✅ `GET /api/consulta/search` → 200 OK con resultados
- ✅ `GET /api/consulta/persona/:id` → 200 OK o 404
- ✅ Dashboard funciona normalmente

### Servicio DESHABILITADO
- ❌ `GET /api/consulta/stats` → 403 Forbidden
- ❌ `GET /api/consulta/search` → 403 Forbidden
- ❌ `GET /api/consulta/persona/:id` → 403 Forbidden
- ✅ `GET /api/consulta/health` → 200 OK (no protegido)
- ✅ Otros servicios funcionan normalmente

**Respuesta 403 esperada:**
```json
{
  "error": "Servicio de consulta deshabilitado",
  "message": "El servicio de consulta está deshabilitado para tu usuario. Puedes habilitarlo desde la configuración de tu cuenta.",
  "service_disabled": true
}
```

## 🔄 Comportamiento Multi-Usuario

### Usuario A deshabilita el servicio
1. Usuario A: `consulta_service_enabled = false`
2. Usuario A no puede acceder a `/api/consulta/*`
3. Usuario B: `consulta_service_enabled = true` (sin cambios)
4. Usuario B puede acceder a `/api/consulta/*` normalmente

### Nuevo usuario se registra
1. Se crea automáticamente en `user_preferences`
2. `consulta_service_enabled = TRUE` por defecto
3. Puede acceder al servicio inmediatamente

## 🐛 Debugging

### Ver logs del Gateway
```bash
docker logs -f api_gateway_dev
```

### Ver logs del Servicio de Auth
```bash
docker logs -f auth_service_dev
```

### Ver cache de Redis
```bash
docker exec -it redis redis-cli

# Ver todas las claves de preferencias
KEYS user_prefs:*

# Ver una preferencia específica
GET user_prefs:1

# Ver TTL
TTL user_prefs:1

# Limpiar cache (para testing)
FLUSHDB
```

## 📝 Próximos Pasos (Frontend)

Para completar la funcionalidad necesitas:

1. **Crear la página de configuración de cuenta** si no existe
2. **Agregar el toggle switch** usando los archivos de ejemplo proporcionados
3. **Incluir los scripts** en `templates/configurar_cuenta.html`:
   ```html
   <link rel="stylesheet" href="{{ url_for('static', filename='css/consulta-service-config.css') }}">
   <script src="{{ url_for('static', filename='js/consulta-service-manager.js') }}"></script>
   ```
4. **Agregar el HTML del toggle** (ver ejemplo en CONSULTA-SERVICE-CONFIG.md)
5. **Manejar errores 403** en las páginas que usan el servicio de consulta

## 📚 Documentación Adicional

- **Documentación completa**: `CONSULTA-SERVICE-CONFIG.md`
- **Migración SQL**: `database/migrations/add_user_preferences.sql`
- **Esquema de base de datos**: `database/init.sql`

## ✨ Características Implementadas

- [x] Base de datos con tabla de preferencias
- [x] Endpoints REST en el servicio de auth
- [x] Middleware de verificación en el gateway
- [x] Cache con Redis para rendimiento
- [x] Logging de todas las operaciones
- [x] Fail-safe en caso de errores
- [x] Soporte multi-usuario
- [x] Archivos de ejemplo para frontend
- [x] Documentación completa

## 🎯 Estado: ✅ BACKEND COMPLETO

El backend está 100% funcional y listo para ser usado desde el frontend. Solo falta implementar la interfaz de usuario para que los usuarios puedan controlar la configuración desde el panel.

