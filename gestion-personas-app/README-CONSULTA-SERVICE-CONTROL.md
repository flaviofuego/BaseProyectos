# 🎛️ Control del Servicio de Consulta - Guía Rápida

## 📌 Resumen Ejecutivo

Se ha implementado **exitosamente** la infraestructura backend completa que permite a los usuarios habilitar o deshabilitar el servicio de consulta desde su panel de configuración.

### ✅ Estado de Implementación

```
Backend:  ████████████████████ 100% COMPLETO
Frontend: ░░░░░░░░░░░░░░░░░░░░   0% PENDIENTE
Testing:  ████████████████████ 100% LISTO
```

## 🎯 Características Implementadas

- ✅ **Servicio habilitado por defecto** para todos los usuarios
- ✅ **Control individual** por usuario/sesión
- ✅ **Persistencia** en base de datos PostgreSQL
- ✅ **Cache optimizado** con Redis (TTL: 5 minutos)
- ✅ **API RESTful** completa y documentada
- ✅ **Middleware de seguridad** en API Gateway
- ✅ **Logging y auditoría** de todas las operaciones
- ✅ **Fail-safe**: Acceso permitido por defecto en caso de error
- ✅ **Archivos de ejemplo** para integración frontend

## 📂 Estructura de Archivos

```
gestion-personas-app/
├── 📄 README-CONSULTA-SERVICE-CONTROL.md    ← Estás aquí
├── 📘 BACKEND-IMPLEMENTATION-SUMMARY.md      (Resumen técnico detallado)
├── 📗 CONSULTA-SERVICE-CONFIG.md             (Documentación completa)
├── 📙 TEST-CONSULTA-SERVICE.md               (Guía de pruebas)
│
├── database/
│   ├── init.sql                              (✅ Modificado - tabla agregada)
│   └── migrations/
│       └── add_user_preferences.sql          (✅ Nuevo - para DBs existentes)
│
├── services/
│   ├── auth/
│   │   └── index.js                          (✅ Modificado - endpoints agregados)
│   └── ...
│
├── gateway/
│   └── index.js                              (✅ Modificado - middleware agregado)
│
├── frontend/
│   └── static/
│       ├── js/
│       │   └── consulta-service-manager.js   (✅ Nuevo - librería JS)
│       └── css/
│           └── consulta-service-config.css   (✅ Nuevo - estilos)
│
└── tests/
    └── test-consulta-service-toggle.ps1      (✅ Nuevo - script de prueba)
```

## 🚀 Inicio Rápido

### 1️⃣ Aplicar Cambios en la Base de Datos

Si tienes una base de datos existente:
```bash
# Aplicar migración
docker exec -it postgres_db psql -U usuario -d gestion_personas \
  -f /docker-entrypoint-initdb.d/migrations/add_user_preferences.sql
```

Si estás comenzando desde cero:
```bash
# Los cambios ya están en init.sql
docker-compose -f gestion-personas-app/docker-compose.dev.yml up -d postgres
```

### 2️⃣ Reiniciar Servicios

```bash
# Detener servicios
docker-compose -f gestion-personas-app/docker-compose.dev.yml down

# Iniciar con rebuild
docker-compose -f gestion-personas-app/docker-compose.dev.yml up -d --build
```

### 3️⃣ Probar la Funcionalidad

**Opción A: Script Automatizado (Windows)**
```powershell
cd gestion-personas-app\tests
.\test-consulta-service-toggle.ps1
```

**Opción B: Prueba Manual con cURL**
```bash
# Ver TEST-CONSULTA-SERVICE.md para comandos completos
```

**Opción C: Desde el Navegador**
```javascript
// Ver ejemplos en CONSULTA-SERVICE-CONFIG.md
```

## 🔌 API Endpoints

### Obtener Preferencias
```http
GET /api/auth/preferences
Authorization: Bearer <token>
```

### Cambiar Estado del Servicio
```http
PUT /api/auth/preferences/consulta-service
Authorization: Bearer <token>
Content-Type: application/json

{"enabled": false}
```

## 📖 Documentación

| Documento | Descripción |
|-----------|-------------|
| [BACKEND-IMPLEMENTATION-SUMMARY.md](./BACKEND-IMPLEMENTATION-SUMMARY.md) | Resumen técnico completo de la implementación |
| [CONSULTA-SERVICE-CONFIG.md](./CONSULTA-SERVICE-CONFIG.md) | Documentación detallada de la arquitectura y uso |
| [TEST-CONSULTA-SERVICE.md](./TEST-CONSULTA-SERVICE.md) | Guía completa de pruebas con ejemplos |

## 🎨 Próximos Pasos (Frontend)

Para completar la implementación necesitas crear la interfaz de usuario:

### 1. Crear/Modificar Página de Configuración

Edita `frontend/templates/configurar_cuenta.html` y agrega:

```html
<!-- Incluir archivos CSS y JS -->
<link rel="stylesheet" href="{{ url_for('static', filename='css/consulta-service-config.css') }}">
<script src="{{ url_for('static', filename='js/consulta-service-manager.js') }}"></script>

<!-- Toggle Switch del Servicio -->
<div class="setting-card">
  <h3>Servicio de Consulta</h3>
  <p>Controla el acceso al servicio de búsqueda y consulta de personas.</p>
  
  <div class="toggle-switch">
    <label>
      <input type="checkbox" id="consulta-service-toggle">
      <span class="slider"></span>
    </label>
    <span id="consulta-service-status">Cargando...</span>
  </div>
  
  <p class="description" id="consulta-service-description">
    Cargando configuración...
  </p>
</div>
```

### 2. Manejar Errores 403

En las páginas que usan el servicio de consulta, agrega manejo de errores:

```javascript
try {
  const response = await fetch('/api/consulta/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 403) {
    const error = await response.json();
    if (error.service_disabled) {
      // Mostrar mensaje al usuario
      consultaServiceManager.handleServiceDisabledError(() => {
        location.reload(); // Recargar después de habilitar
      });
    }
  }
} catch (error) {
  console.error('Error:', error);
}
```

### 3. Agregar Ruta en Flask

Si no existe, agrega la ruta en `frontend/app.py`:

```python
@app.route('/configurar-cuenta')
@login_required
def configurar_cuenta():
    """Página para configurar cuenta de usuario"""
    return render_template('configurar_cuenta.html', user=session.get('user'))
```

## 🧪 Verificación

### ✅ Checklist de Pruebas

Después de implementar, verifica:

- [ ] Usuario puede ver el toggle en la página de configuración
- [ ] Toggle refleja el estado actual (habilitado por defecto)
- [ ] Al deshabilitar, el toggle cambia y muestra mensaje de éxito
- [ ] Al intentar acceder a consultas, se muestra error 403
- [ ] Dashboard y otras páginas siguen funcionando normalmente
- [ ] Al habilitar nuevamente, el acceso se restaura
- [ ] Los cambios persisten al cerrar sesión y volver a entrar
- [ ] Usuarios diferentes tienen configuraciones independientes

### 🔍 Debug

Si algo no funciona:

1. **Ver logs del gateway**:
   ```bash
   docker logs -f api_gateway_dev
   ```

2. **Ver logs del servicio de auth**:
   ```bash
   docker logs -f auth_service_dev
   ```

3. **Verificar Redis**:
   ```bash
   docker exec -it redis redis-cli
   KEYS user_prefs:*
   GET user_prefs:1
   ```

4. **Verificar base de datos**:
   ```bash
   docker exec -it postgres_db psql -U usuario -d gestion_personas
   SELECT * FROM user_preferences;
   ```

## 🎯 Comportamiento Esperado

### Escenario 1: Usuario Nuevo
```
1. Usuario se registra → Preferencias creadas automáticamente
2. consulta_service_enabled = TRUE (por defecto)
3. Usuario puede acceder al servicio inmediatamente
```

### Escenario 2: Deshabilitar Servicio
```
1. Usuario va a Configuración
2. Desactiva el toggle del servicio
3. Backend actualiza BD y limpia cache
4. Peticiones a /api/consulta/* retornan 403
5. Dashboard y otras funciones siguen funcionando
```

### Escenario 3: Habilitar Servicio
```
1. Usuario activa el toggle
2. Backend actualiza BD y limpia cache
3. Peticiones a /api/consulta/* funcionan normalmente
```

### Escenario 4: Multi-Usuario
```
Usuario A: Servicio DESHABILITADO → No puede acceder
Usuario B: Servicio HABILITADO → Accede normalmente
Usuario C: Nuevo usuario → Servicio HABILITADO por defecto
```

## 🛡️ Seguridad

- ✅ Autenticación JWT requerida para todos los endpoints
- ✅ Usuarios solo pueden modificar sus propias preferencias
- ✅ Validación de tipos de datos en el backend
- ✅ Logging de todas las operaciones para auditoría
- ✅ Cache con TTL para prevenir datos obsoletos
- ✅ Fail-safe: acceso permitido si hay error de verificación

## 📊 Monitoreo

Puedes monitorear el uso en la tabla de logs:

```sql
-- Ver cambios de preferencias
SELECT u.username, tl.created_at, tl.request_data->>'preference' as preference,
       tl.request_data->>'new_value' as new_value
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type = 'UPDATE_PREFERENCES'
ORDER BY tl.created_at DESC;

-- Ver intentos de acceso bloqueados
SELECT u.username, tl.created_at, tl.transaction_type
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.status = 'FAILED' 
  AND tl.transaction_type IN ('QUERY', 'SEARCH', 'STATS')
ORDER BY tl.created_at DESC;
```

## 💡 Tips

1. **Para desarrollo**: Usa el script PowerShell para pruebas rápidas
2. **Cache**: Si ves comportamiento extraño, limpia Redis: `docker exec -it redis redis-cli FLUSHDB`
3. **Migración**: Siempre aplica la migración antes de actualizar los servicios
4. **Testing**: Prueba con múltiples usuarios para verificar aislamiento
5. **Frontend**: Los archivos JS y CSS son plug-and-play, solo inclúyelos

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs (gateway y auth service)
2. Verifica la base de datos (tabla `user_preferences`)
3. Limpia el cache de Redis
4. Consulta la documentación completa en `CONSULTA-SERVICE-CONFIG.md`
5. Ejecuta el script de prueba para verificar el backend

## 📝 Notas Finales

- El backend está **100% completo y funcional**
- Todos los endpoints han sido probados
- La documentación está completa con ejemplos
- Los archivos de ejemplo para frontend están listos
- Solo falta implementar la interfaz de usuario

---

**✨ ¡El backend está listo para que agregues la UI y completes la funcionalidad!**

**Fecha**: 2025-01-07  
**Versión**: 1.0.0  
**Estado**: ✅ Backend Completo - Pendiente Frontend

