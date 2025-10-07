# Documentación - Configurar Cuenta

## 📋 Descripción

Nueva funcionalidad para permitir a los usuarios cambiar su nombre de usuario y contraseña desde la aplicación.

## ✨ Características

### 1. **Interfaz de Usuario**
- Menú dropdown del usuario actualizado con opción "Configurar Cuenta"
- Página dedicada con dos secciones:
  - Cambiar nombre de usuario
  - Cambiar contraseña
- Validación en tiempo real
- Indicador de fortaleza de contraseña
- Confirmación de contraseña
- Diseño responsivo con cards

### 2. **Seguridad**
- Requiere autenticación JWT
- Verificación de contraseña actual obligatoria
- Validación de fortaleza de contraseña:
  - Mínimo 8 caracteres
  - Al menos una mayúscula
  - Al menos una minúscula
  - Al menos un número
- Hash bcrypt para contraseñas
- Logging de cambios para auditoría
- Prevención de reutilización de contraseña actual

### 3. **Validaciones**
- Username:
  - Solo letras, números y guión bajo
  - Longitud: 3-50 caracteres
  - Unicidad en la base de datos
- Password:
  - Requisitos de fortaleza
  - No puede ser igual a la actual
  - Confirmación obligatoria

## 🔧 Componentes Creados/Modificados

### Frontend

#### 1. **`templates/base.html`** (Modificado)
```html
<!-- Menú dropdown del usuario actualizado -->
<li><a class="dropdown-item" href="{{ url_for('configurar_cuenta') }}">
    <i class="fas fa-cog" aria-hidden="true"></i> 
    <span>Configurar Cuenta</span>
</a></li>
<li><hr class="dropdown-divider"></li>
<li><a class="dropdown-item" href="{{ url_for('logout') }}">
    <i class="fas fa-sign-out-alt" aria-hidden="true"></i> 
    <span>Cerrar Sesión</span>
</a></li>
```

#### 2. **`templates/configurar_cuenta.html`** (Nuevo)
Características:
- Dos formularios independientes
- Validación en tiempo real con JavaScript
- Indicador visual de fortaleza de contraseña
- Toggle para mostrar/ocultar contraseñas
- Consejos de seguridad
- Diseño con cards modernas
- Totalmente responsivo

#### 3. **`app.py`** (Modificado)
Rutas agregadas:
- `GET /configurar-cuenta` - Renderiza la página
- `POST /api/auth/cambiar-usuario` - Proxy al servicio auth
- `POST /api/auth/cambiar-password` - Proxy al servicio auth

### Backend

#### 4. **`services/auth/index.js`** (Modificado)
Endpoints agregados:

##### `POST /cambiar-usuario`
Cambia el nombre de usuario del usuario autenticado.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "nuevo_username": "nuevo_usuario",
  "password_confirm": "password_actual",
  "user_id": 1
}
```

**Response Success (200):**
```json
{
  "message": "Nombre de usuario actualizado correctamente. Por favor, inicia sesión con tu nuevo usuario.",
  "username": "nuevo_usuario"
}
```

**Response Error (409):**
```json
{
  "message": "El nombre de usuario ya está en uso"
}
```

**Response Error (401):**
```json
{
  "message": "Contraseña incorrecta"
}
```

##### `POST /cambiar-password`
Cambia la contraseña del usuario autenticado.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "password_actual": "contraseña_actual",
  "password_nueva": "Nueva123",
  "user_id": 1
}
```

**Response Success (200):**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

**Response Error (400):**
```json
{
  "message": "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número"
}
```

**Response Error (401):**
```json
{
  "message": "Contraseña actual incorrecta"
}
```

## 🔄 Flujo de Usuario

### Cambiar Usuario

1. Usuario autenticado navega a "Configurar Cuenta"
2. Ingresa nuevo nombre de usuario
3. Confirma con contraseña actual
4. Click en "Actualizar Usuario"
5. Frontend envía request a `/api/auth/cambiar-usuario`
6. Backend valida:
   - Autenticación JWT
   - Formato del username
   - Password correcta
   - Username no en uso
7. Actualiza en base de datos
8. Log de transacción
9. Usuario debe cerrar sesión y entrar con nuevo usuario

### Cambiar Contraseña

1. Usuario autenticado navega a "Configurar Cuenta"
2. Ingresa contraseña actual
3. Ingresa nueva contraseña (con validación en tiempo real)
4. Confirma nueva contraseña
5. Click en "Actualizar Contraseña"
6. Frontend envía request a `/api/auth/cambiar-password`
7. Backend valida:
   - Autenticación JWT
   - Password actual correcta
   - Fortaleza de nueva password
   - Password nueva diferente a actual
8. Actualiza hash en base de datos
9. Log de transacción
10. Usuario puede seguir usando la sesión actual

## 🧪 Testing

### Test Manual

```bash
# 1. Iniciar servicios
make dev

# 2. Login en http://localhost:5000

# 3. Navegar a Configurar Cuenta desde el menú del usuario

# 4. Test cambiar usuario
# - Ingresar nuevo username (válido)
# - Confirmar password
# - Verificar que actualiza
# - Verificar que solicita nuevo login

# 5. Test cambiar contraseña
# - Ingresar password actual
# - Ingresar nueva password con requisitos
# - Confirmar nueva password
# - Verificar que actualiza
# - Logout y login con nueva contraseña
```

### Test con cURL

```bash
# Login primero
TOKEN=$(curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Test cambiar username
curl -X POST http://localhost:8001/api/auth/cambiar-usuario \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nuevo_username": "admin_nuevo",
    "password_confirm": "admin123",
    "user_id": 1
  }'

# Test cambiar password
curl -X POST http://localhost:8001/api/auth/cambiar-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "password_actual": "admin123",
    "password_nueva": "NuevaPass123",
    "user_id": 1
  }'
```

## 📊 Logging y Auditoría

Todos los cambios se registran en `transaction_logs`:

```sql
-- Cambio de username exitoso
INSERT INTO transaction_logs (user_id, transaction_type, status, metadata)
VALUES (1, 'CHANGE_USERNAME', 'SUCCESS', '{"old_username":"admin","new_username":"admin_nuevo"}');

-- Cambio de username fallido
INSERT INTO transaction_logs (user_id, transaction_type, status, metadata)
VALUES (1, 'CHANGE_USERNAME_FAILED', 'FAILED', '{"reason":"Invalid password"}');

-- Cambio de password exitoso
INSERT INTO transaction_logs (user_id, transaction_type, status)
VALUES (1, 'CHANGE_PASSWORD', 'SUCCESS');

-- Cambio de password fallido
INSERT INTO transaction_logs (user_id, transaction_type, status, metadata)
VALUES (1, 'CHANGE_PASSWORD_FAILED', 'FAILED', '{"reason":"Invalid current password"}');
```

## 🔐 Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints requieren JWT válido
2. **Autorización**: Solo puede cambiar sus propios datos
3. **Validación**: Múltiples capas (frontend, backend, base de datos)
4. **Logging**: Auditoría completa de cambios
5. **Password Hashing**: Bcrypt con salt rounds = 10
6. **Rate Limiting**: Aplicado por el gateway
7. **CORS**: Configurado en todos los servicios
8. **Session Cleanup**: Logout obligatorio tras cambio de username

## 📝 Mejoras Futuras

1. **Email de confirmación** al cambiar credenciales
2. **Two-Factor Authentication (2FA)** opcional
3. **Historial de cambios** visible para el usuario
4. **Política de contraseñas** configurable
5. **Recuperación de cuenta** mejorada
6. **Cambio de email** (actualmente no implementado)
7. **Verificación por SMS** como alternativa
8. **Detección de compromiso** de contraseñas comunes

## 🚀 Deployment

Los cambios son compatibles con la arquitectura actual:

1. ✅ No requiere cambios en base de datos
2. ✅ Compatible con Docker existente
3. ✅ No rompe funcionalidad existente
4. ✅ Totalmente retrocompatible
5. ✅ Funciona en desarrollo y producción

Para desplegar:

```bash
# Desarrollo
make build-dev
make dev

# Producción
make build
make up
```

## 📞 URLs de Acceso

- **Página de Configuración**: http://localhost:5000/configurar-cuenta
- **API Cambiar Usuario**: http://localhost:8001/api/auth/cambiar-usuario
- **API Cambiar Password**: http://localhost:8001/api/auth/cambiar-password

---

**Fecha de Implementación**: 6 de octubre de 2025
**Versión**: 3.1.0
**Autor**: Sistema de Gestión de Personas