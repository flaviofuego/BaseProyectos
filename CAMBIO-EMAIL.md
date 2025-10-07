# Cambio: Reemplazar "Cambiar Nombre de Usuario" por "Cambiar Correo Electrónico"

## 📋 Resumen

Se ha **eliminado** la funcionalidad de cambiar nombre de usuario debido a un bug crítico que causaba:
- ❌ Creación de cuentas duplicadas
- ❌ Usuarios con dos nombres de usuario diferentes
- ❌ Errores en el frontend

Se ha **reemplazado** con la funcionalidad de **cambiar correo electrónico**, que es más segura y útil.

## 🔧 Archivos Modificados

### 1. **Frontend Template** (`frontend/templates/configurar_cuenta.html`)

**Cambios:**
- ✅ Eliminada sección "Cambiar Nombre de Usuario"
- ✅ Agregada sección "Cambiar Correo Electrónico"
- ✅ Validación de formato de email en JavaScript
- ✅ Validación de email diferente al actual
- ✅ Redireccionamiento a logout después de cambiar email (por seguridad)

**Campos del formulario:**
```html
- nuevo_email (type="email", required, maxlength=255)
- password_confirm_email (type="password", required)
- user_id_email (hidden)
```

**Validaciones frontend:**
- Formato de email válido (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Email diferente al actual
- Contraseña actual requerida
- Toggle de visibilidad de contraseña

### 2. **Flask Routes** (`frontend/app.py`)

**Ruta eliminada:**
```python
❌ POST /api/auth/cambiar-usuario
```

**Ruta agregada:**
```python
✅ POST /api/auth/cambiar-email
```

**Funcionalidad:**
- Recibe: `nuevo_email`, `password_confirm`, `user_id`
- Proxy al servicio de autenticación
- Actualiza el email en la sesión si tiene éxito
- Retorna respuesta JSON

### 3. **Auth Service** (`services/auth/index.js`)

**Endpoint eliminado:**
```javascript
❌ POST /cambiar-usuario
```

**Endpoint agregado:**
```javascript
✅ POST /cambiar-email
```

**Validaciones backend:**
1. ✅ Autenticación JWT requerida
2. ✅ Validación de campos requeridos (`nuevo_email`, `password_confirm`, `user_id`)
3. ✅ Autorización: user_id debe coincidir con el usuario autenticado
4. ✅ Validación de formato de email (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
5. ✅ Verificación de contraseña actual con bcrypt
6. ✅ **Validación de email único**: Query SQL verifica que el email no esté en uso por otro usuario
7. ✅ Actualización en base de datos con timestamp

**SQL Queries:**
```sql
-- Verificar email único
SELECT id FROM users WHERE email = $1 AND id != $2

-- Actualizar email
UPDATE users 
SET email = $1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $2
```

**Logging de transacciones:**
- `CHANGE_EMAIL` - Cambio exitoso
- `CHANGE_EMAIL_FAILED` - Contraseña incorrecta

### 4. **Corrección de Bug en Cambiar Contraseña**

**Problema encontrado:**
- El endpoint `/cambiar-password` usaba `user.password` en lugar de `user.password_hash`
- Esto causaba errores al comparar contraseñas

**Corrección:**
```javascript
// ANTES (INCORRECTO)
const validPassword = await bcrypt.compare(password_actual, user.password);
const samePassword = await bcrypt.compare(password_nueva, user.password);
await pool.query('UPDATE users SET password = $1 WHERE id = $2', ...);

// DESPUÉS (CORRECTO)
const validPassword = await bcrypt.compare(password_actual, user.password_hash);
const samePassword = await bcrypt.compare(password_nueva, user.password_hash);
await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ...);
```

## 🔒 Seguridad

### Validación de Email Único

La validación SQL asegura que no haya duplicados:

```javascript
const existingUser = await pool.query(
  'SELECT id FROM users WHERE email = $1 AND id != $2',
  [nuevo_email, user_id]
);

if (existingUser.rows.length > 0) {
  return res.status(409).json({ 
    message: 'El correo electrónico ya está en uso' 
  });
}
```

**Previene:**
- ✅ Dos usuarios con el mismo email
- ✅ SQL injection (usa prepared statements)
- ✅ Usuario puede mantener su email actual (verifica `id != $2`)

### Verificación de Contraseña

Ambos endpoints requieren contraseña actual:

```javascript
const validPassword = await bcrypt.compare(password_confirm, user.password_hash);
if (!validPassword) {
  logTransaction(user_id, 'CHANGE_EMAIL_FAILED', 'FAILED', req, {
    reason: 'Invalid password'
  });
  return res.status(401).json({ message: 'Contraseña incorrecta' });
}
```

### Logging de Transacciones

Todas las acciones se registran en `transaction_logs`:

```javascript
// Cambio exitoso
logTransaction(user_id, 'CHANGE_EMAIL', 'SUCCESS', req, {
  old_email: user.email,
  new_email: nuevo_email
});

// Cambio fallido
logTransaction(user_id, 'CHANGE_EMAIL_FAILED', 'FAILED', req, {
  reason: 'Invalid password'
});
```

## 🎯 Flujo de Usuario

### Cambiar Email

1. Usuario navega a **Configurar Cuenta**
2. Ingresa nuevo email en el formulario
3. Confirma con su contraseña actual
4. Frontend valida formato y envía request a `/api/auth/cambiar-email`
5. Flask proxy al servicio de autenticación
6. Backend valida:
   - Formato de email
   - Email no está en uso
   - Contraseña correcta
7. Actualiza email en base de datos
8. Frontend muestra mensaje de éxito
9. **Redirige a logout después de 2 segundos** (por seguridad)
10. Usuario debe iniciar sesión nuevamente

### Códigos de Respuesta

| Código | Significado | Escenario |
|--------|-------------|-----------|
| 200 | ✅ Success | Email actualizado correctamente |
| 400 | ❌ Bad Request | Formato de email inválido o campos faltantes |
| 401 | ❌ Unauthorized | Contraseña incorrecta |
| 403 | ❌ Forbidden | user_id no coincide con usuario autenticado |
| 404 | ❌ Not Found | Usuario no encontrado |
| 409 | ❌ Conflict | Email ya está en uso por otro usuario |
| 500 | ❌ Server Error | Error interno del servidor |

## 🧪 Testing

### Test Manual

```bash
# 1. Iniciar servicios
make dev

# 2. Login en http://localhost:5000/login
# Credenciales: admin / admin123

# 3. Navegar a Configurar Cuenta

# 4. Test: Cambiar email exitoso
# - Nuevo email: nuevo@ejemplo.com
# - Contraseña: admin123
# Resultado esperado: ✅ Email actualizado, redirige a logout

# 5. Login nuevamente con el nuevo email (opcional)

# 6. Test: Email duplicado
# - Nuevo email: admin@example.com (ya existe)
# - Contraseña: admin123
# Resultado esperado: ❌ Error 409 "El correo electrónico ya está en uso"

# 7. Test: Contraseña incorrecta
# - Nuevo email: otro@ejemplo.com
# - Contraseña: incorrecta123
# Resultado esperado: ❌ Error 401 "Contraseña incorrecta"

# 8. Test: Formato de email inválido
# - Nuevo email: no-es-un-email
# - Contraseña: admin123
# Resultado esperado: ❌ Error en frontend "correo electrónico válido"
```

### Test con cURL

```bash
# Login primero
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Test: Cambiar email exitoso
curl -X POST http://localhost:8001/api/auth/cambiar-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nuevo_email": "nuevo@ejemplo.com",
    "password_confirm": "admin123",
    "user_id": 1
  }' | jq

# Test: Email duplicado (409)
curl -X POST http://localhost:8001/api/auth/cambiar-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nuevo_email": "admin@example.com",
    "password_confirm": "admin123",
    "user_id": 1
  }' | jq

# Test: Contraseña incorrecta (401)
curl -X POST http://localhost:8001/api/auth/cambiar-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nuevo_email": "otro@ejemplo.com",
    "password_confirm": "incorrecta123",
    "user_id": 1
  }' | jq
```

### Verificar en Base de Datos

```sql
-- Ver usuario antes del cambio
SELECT id, username, email, updated_at FROM users WHERE id = 1;

-- Después del cambio, verificar actualización
SELECT id, username, email, updated_at FROM users WHERE id = 1;

-- Ver logs de transacciones
SELECT * FROM transaction_logs 
WHERE transaction_type IN ('CHANGE_EMAIL', 'CHANGE_EMAIL_FAILED')
ORDER BY created_at DESC 
LIMIT 5;
```

## ✅ Ventajas del Cambio

### Por qué eliminar cambio de nombre de usuario:

1. **Bug crítico**: Causaba duplicados y errores
2. **Complejidad**: Requiere actualizar referencias en toda la app
3. **Riesgo de seguridad**: Podría permitir suplantación de identidad
4. **Poco común**: Los usuarios rara vez necesitan cambiar su username

### Por qué agregar cambio de email:

1. **Más útil**: Los usuarios cambian de email con más frecuencia
2. **Más seguro**: Email no se usa para login (solo username)
3. **Recuperación de cuenta**: Necesario para reset de contraseña
4. **Contacto actualizado**: Importante para notificaciones

## 🚀 Despliegue

### Desarrollo

```bash
# Reconstruir servicios con los cambios
make down-dev
make build-dev
make dev

# Verificar logs
docker logs -f auth_service_dev
docker logs -f flask_app_dev
```

### Producción

```bash
# Backup de base de datos primero
docker exec personas_db pg_dump -U admin personas_db > backup.sql

# Rebuild y deploy
make down
make build
make up

# Verificar servicios
curl http://localhost:8001/health
```

## 📊 Monitoreo

### Logs a Revisar

```bash
# Logs de cambios de email exitosos
docker logs auth_service_dev 2>&1 | grep "CHANGE_EMAIL"

# Logs de intentos fallidos
docker logs auth_service_dev 2>&1 | grep "CHANGE_EMAIL_FAILED"

# Logs de errores 409 (email duplicado)
docker logs auth_service_dev 2>&1 | grep "409"
```

### Métricas Importantes

- Cantidad de cambios de email exitosos
- Cantidad de intentos fallidos por contraseña incorrecta
- Cantidad de errores 409 (email duplicado)
- Tiempo promedio de respuesta del endpoint

## 🔄 Rollback

Si necesitas revertir este cambio:

```bash
# 1. Revertir commits de Git
git log --oneline
git revert <commit-hash>

# 2. O restaurar archivos específicos
git checkout HEAD~1 -- frontend/templates/configurar_cuenta.html
git checkout HEAD~1 -- frontend/app.py
git checkout HEAD~1 -- services/auth/index.js

# 3. Reconstruir servicios
make down-dev
make build-dev
make dev
```

## 📝 Notas Adicionales

- El nombre de usuario **NO puede** ser cambiado (decisión de diseño)
- El email **NO se usa para login**, solo username
- Después de cambiar email, el usuario debe **re-autenticarse**
- Los logs se guardan en `transaction_logs` para auditoría
- El campo `updated_at` se actualiza automáticamente en la base de datos

## 🎓 Lecciones Aprendidas

1. **Validar unicidad en backend**: No confiar solo en validación frontend
2. **Usar prepared statements**: Prevenir SQL injection
3. **Logging completo**: Registrar tanto éxitos como fallos
4. **Nombres de campos consistentes**: `password_hash` vs `password` causó bugs
5. **Re-autenticación después de cambios críticos**: Mejor UX y seguridad

---

**Fecha:** 6 de octubre de 2025  
**Versión:** v3.1  
**Autor:** GitHub Copilot  
**Branch:** Service-registry
