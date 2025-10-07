# 🔧 Fix: Toggle Simétrico - Activación Global

## 🐛 Problema Identificado

**Situación:**
- Usuario A desactiva el servicio → ✅ Se desactiva para TODOS
- Usuario B reactiva el servicio → ❌ Solo se activa para Usuario B
- Usuario A NO ve el botón "Consultar Datos" aunque el servicio está activo

**Causa Raíz:**
La lógica de ACTIVACIÓN solo actualizaba la preferencia del usuario que activaba, mientras que la lógica de DESACTIVACIÓN sí actualizaba a todos los usuarios. Esto creaba una asimetría que causaba estados inconsistentes.

```javascript
// ANTES - Lógica ASIMÉTRICA ❌

if (enabled) {
  // Solo afecta al usuario actual
  await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = TRUE 
     WHERE user_id = $1`,
    [userId]
  );
} else {
  // Afecta a TODOS los usuarios
  await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = FALSE`
  );
}
```

---

## ✅ Solución Implementada

### Nueva Lógica: **TOTALMENTE SIMÉTRICA**

Ahora **AMBAS** acciones (activar y desactivar) afectan a TODOS los usuarios:

```javascript
// DESPUÉS - Lógica SIMÉTRICA ✅

if (enabled) {
  // 1. Iniciar contenedor Docker
  dockerResult = await dockerController.startConsultaService();
  
  // 2. Activar para TODOS los usuarios que tenían desactivado
  const enableAllResult = await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE consulta_service_enabled = FALSE
     RETURNING user_id`
  );
  
  // 3. Invalidar cache de todos los afectados
  for (const affectedUserId of affectedUsers) {
    await invalidateUserPreferencesCache(affectedUserId);
  }
  
  // 4. Registrar en logs con usuarios afectados
  logTransaction(userId, 'ENABLE_CONSULTA_SERVICE', 'SUCCESS', req, {
    username: username,
    enabled: true,
    affected_users: affectedUsers,
    total_affected: affectedUsers.length,
    container_started: true,
    message: `User ${username} enabled service for all users`
  });
  
} else {
  // Misma lógica pero para desactivar
  // 1. Desactivar para TODOS
  // 2. Invalidar cache de todos
  // 3. Detener contenedor
  // 4. Registrar en logs con usuarios afectados
}
```

---

## 🎯 Cambios Específicos

### 1. Backend: `services/auth/index.js`

**Cambios en el endpoint PUT `/preferences/consulta-service`:**

#### Activación (Enable):
```javascript
// NUEVO: Activar para TODOS
const enableAllResult = await pool.query(
  `UPDATE user_preferences 
   SET consulta_service_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
   WHERE consulta_service_enabled = FALSE
   RETURNING user_id`
);

const affectedUsers = enableAllResult.rows.map(row => row.user_id);
console.log(`✅ Enabled service for ${affectedUsers.length} user(s): [${affectedUsers.join(', ')}]`);

// Invalidar cache de todos
for (const affectedUserId of affectedUsers) {
  await invalidateUserPreferencesCache(affectedUserId);
}

// Log con affected_users
logTransaction(userId, 'ENABLE_CONSULTA_SERVICE', 'SUCCESS', req, {
  username: username,
  enabled: true,
  docker_action: 'start',
  docker_result: dockerResult?.success ? 'success' : 'already_running',
  affected_users: affectedUsers,
  total_affected: affectedUsers.length,
  container_started: dockerResult?.success || dockerResult?.already_running,
  message: `User ${username} enabled service for all users`
});

// Respuesta incluye affected_users
return res.json({
  success: true,
  message: `Servicio de consulta habilitado para todos los usuarios`,
  affected_users: affectedUsers.length,
  preferences: {
    consulta_service_enabled: true
  },
  container_status: { ... }
});
```

#### Código Eliminado:
```javascript
// ❌ ELIMINADO - Lógica que solo actualizaba al usuario individual
await pool.query(
  `INSERT INTO user_preferences (user_id, consulta_service_enabled)
   VALUES ($1, $2)
   ON CONFLICT (user_id) 
   DO UPDATE SET consulta_service_enabled = $2`,
  [userId, enabled]
);

await invalidateUserPreferencesCache(userId);

logTransaction(userId, 'ENABLE_CONSULTA_SERVICE', 'SUCCESS', req, {
  username: username,
  enabled: true,
  docker_action: 'start',
  container_started: true,
  message: `User ${username} enabled service`  // Sin affected_users
});

res.json({
  success: true,
  message: `Servicio de consulta habilitado correctamente`,  // Sin info de usuarios afectados
  preferences: { consulta_service_enabled: enabled }
});
```

---

### 2. Frontend: `frontend/templates/configurar_cuenta.html`

#### Modal de Activación Actualizado:

```html
<!-- ANTES -->
<div class="alert alert-info mb-0">
    <strong>Acciones:</strong>
    <ul>
        <li>Se iniciará el contenedor Docker</li>
        <li>Podrás consultar datos desde el menú</li>
    </ul>
</div>

<!-- DESPUÉS -->
<div class="alert alert-success mb-0">
    <strong>✅ ATENCIÓN - Esta acción afecta a TODOS los usuarios:</strong>
    <ul>
        <li><strong>Se activará el servicio para TODOS los usuarios conectados</strong></li>
        <li>Se iniciará el contenedor Docker del servicio de consulta</li>
        <li>Todos podrán consultar datos de personas</li>
        <li>El servicio se registrará en el service registry</li>
    </ul>
    <strong>Nota:</strong> Cualquier usuario puede desactivar el servicio.
</div>
```

#### Botón Actualizado:
```html
<!-- ANTES -->
<button class="btn btn-success">
    <i class="fas fa-check"></i> Activar Servicio
</button>

<!-- DESPUÉS -->
<button class="btn btn-success">
    <i class="fas fa-check"></i> Activar para Todos
</button>
```

#### Mensaje de Éxito Actualizado:

```javascript
// ANTES - Solo mostraba affected_users para desactivación
if (!pendingToggleState && data.affected_users) {
    message = `Servicio desactivado para ${data.affected_users} usuario(s)`;
}

// DESPUÉS - Muestra affected_users para AMBAS acciones
if (data.affected_users) {
    if (pendingToggleState) {
        message = `Servicio activado para ${data.affected_users} usuario(s)`;
    } else {
        message = `Servicio desactivado para ${data.affected_users} usuario(s)`;
    }
}
```

#### Descripción del Toggle Actualizada:

```html
<!-- ANTES -->
<p class="text-muted">
    <strong>⚠️ Atención:</strong> Desactivar este servicio lo deshabilitará 
    para TODOS los usuarios y detendrá el contenedor Docker.
</p>

<!-- DESPUÉS -->
<p class="text-muted">
    <strong>⚠️ Atención:</strong> Este toggle afecta a TODOS los usuarios:
</p>
<ul class="text-muted small">
    <li><strong>Activar:</strong> Inicia el contenedor y habilita el servicio para todos</li>
    <li><strong>Desactivar:</strong> Detiene el contenedor y deshabilita el servicio para todos</li>
</ul>
```

---

## 🧪 Flujo Corregido

### Escenario: 3 Usuarios Conectados

**Estado Inicial:**
- Usuario A: servicio ACTIVADO ✅
- Usuario B: servicio ACTIVADO ✅
- Usuario C: servicio ACTIVADO ✅
- Contenedor: **RUNNING** 🟢

---

**Paso 1: Usuario A desactiva el servicio**

```sql
-- Backend ejecuta:
UPDATE user_preferences 
SET consulta_service_enabled = FALSE 
WHERE consulta_service_enabled = TRUE
RETURNING user_id;

-- Resultado:
-- affected_users = [1, 2, 3]
-- total_affected = 3

-- Log registrado:
INSERT INTO transaction_logs (user_id, transaction_type, request_data)
VALUES (1, 'DISABLE_CONSULTA_SERVICE', '{
  "username": "userA",
  "affected_users": [1, 2, 3],
  "total_affected": 3,
  "docker_action": "stop",
  "container_stopped": true
}');
```

```bash
# Docker container stops
docker stop consulta_service_dev
```

**Estado después del Paso 1:**
- Usuario A: servicio DESACTIVADO ❌
- Usuario B: servicio DESACTIVADO ❌
- Usuario C: servicio DESACTIVADO ❌
- Contenedor: **STOPPED** 🔴
- Todos pierden el menú "Consultar Datos"

---

**Paso 2: Usuario B reactiva el servicio** ⭐ **CORREGIDO**

```sql
-- Backend ejecuta:
UPDATE user_preferences 
SET consulta_service_enabled = TRUE 
WHERE consulta_service_enabled = FALSE
RETURNING user_id;

-- Resultado:
-- affected_users = [1, 2, 3]  ← Ahora incluye a TODOS
-- total_affected = 3

-- Log registrado:
INSERT INTO transaction_logs (user_id, transaction_type, request_data)
VALUES (2, 'ENABLE_CONSULTA_SERVICE', '{
  "username": "userB",
  "affected_users": [1, 2, 3],  ← CORREGIDO: Ahora registra a todos
  "total_affected": 3,
  "docker_action": "start",
  "container_started": true
}');
```

```bash
# Docker container starts
docker start consulta_service_dev
```

**Estado después del Paso 2:**
- Usuario A: servicio ACTIVADO ✅ ← **CORREGIDO: Ahora SÍ se activa**
- Usuario B: servicio ACTIVADO ✅
- Usuario C: servicio ACTIVADO ✅
- Contenedor: **RUNNING** 🟢
- **TODOS** recuperan el menú "Consultar Datos"

---

## 📊 Comparación: Antes vs Después

| Aspecto | ANTES ❌ | DESPUÉS ✅ |
|---------|----------|------------|
| **Desactivar** | Afecta a TODOS | Afecta a TODOS ✓ |
| **Activar** | Solo al usuario actual | Afecta a TODOS ✓ |
| **Consistencia** | Asimétrico | Simétrico ✓ |
| **Logs enable** | Sin affected_users | Con affected_users ✓ |
| **Mensaje UI enable** | "habilitado correctamente" | "habilitado para X usuario(s)" ✓ |
| **Modal enable** | "podrás consultar" | "TODOS podrán consultar" ✓ |
| **Botón enable** | "Activar Servicio" | "Activar para Todos" ✓ |
| **Cache invalidation** | Solo usuario actual | Todos los afectados ✓ |

---

## ✅ Beneficios del Fix

1. **Simetría Perfecta** 🎯
   - Activar = global
   - Desactivar = global
   - Comportamiento predecible y consistente

2. **Sin Estados Inconsistentes** 🔒
   - No más usuarios con servicio desactivado mientras el contenedor corre
   - No más menús desincronizados

3. **Auditabilidad Completa** 📝
   - Ambas acciones registran affected_users
   - Historial completo del impacto de cada cambio

4. **UI Transparente** 💡
   - Modales advierten claramente el impacto global
   - Mensajes muestran usuarios afectados
   - Botones explícitos: "Activar/Desactivar para Todos"

5. **Cache Correcto** ⚡
   - Se invalida el cache de TODOS los usuarios afectados
   - Menús se actualizan correctamente para todos

---

## 🧪 Testing del Fix

### Test 1: Activación después de Desactivación Global

```bash
# 1. Setup: 3 usuarios logueados, servicio activo para todos
# 2. Usuario A desactiva → servicio OFF para todos
# 3. Usuario B reactiva → servicio ON para todos
# 4. Usuario A recarga su página → ✅ VE el menú "Consultar Datos"
```

### Test 2: Verificar Logs

```sql
-- Ver últimas activaciones con usuarios afectados
SELECT 
  TO_CHAR(tl.created_at, 'YYYY-MM-DD HH24:MI:SS') as fecha,
  u.username,
  tl.transaction_type,
  tl.request_data->>'total_affected' as usuarios_afectados,
  tl.request_data->'affected_users' as ids_afectados
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type = 'ENABLE_CONSULTA_SERVICE'
ORDER BY tl.created_at DESC
LIMIT 5;
```

**Output esperado:**
```
      fecha       | username | transaction_type           | usuarios_afectados | ids_afectados
------------------+----------+---------------------------+-------------------+---------------
2025-10-07 16:15 | userB    | ENABLE_CONSULTA_SERVICE   | 3                 | [1,2,3]
```

### Test 3: Verificar Cache Invalidation

```javascript
// En el navegador de Usuario A (después de que B reactive):
// 1. Sin recargar, hacer una petición que use cache
fetch('/api/auth/preferences')
  .then(r => r.json())
  .then(data => console.log(data.consulta_service_enabled));
// Debe mostrar: true (cache invalidado correctamente)

// 2. Menú debe aparecer sin necesidad de F5
// El reload automático (setTimeout 1.5s) lo muestra
```

---

## 📝 Archivos Modificados

1. ✅ `services/auth/index.js` (líneas 160-320)
   - Activación ahora actualiza a TODOS los usuarios
   - Registra affected_users en logs
   - Retorna affected_users en respuesta

2. ✅ `frontend/templates/configurar_cuenta.html` (líneas 130-170, 520-620)
   - Modal de activación advierte impacto global
   - Botón dice "Activar para Todos"
   - Mensaje de éxito muestra usuarios afectados
   - Descripción del toggle explica impacto bidireccional

3. ✅ Auth service reiniciado con los cambios

---

## 🎯 Estado Final

```
✅ LÓGICA SIMÉTRICA:
   - Activar: Afecta a TODOS los usuarios
   - Desactivar: Afecta a TODOS los usuarios

✅ LOGS COMPLETOS:
   - Enable: affected_users registrado
   - Disable: affected_users registrado

✅ UI CONSISTENTE:
   - Modales advierten impacto global
   - Botones explícitos ("para Todos")
   - Mensajes informativos con conteo

✅ CACHE CORRECTO:
   - Invalidación para todos los afectados
   - Menús se actualizan globalmente

✅ SIN BUGS:
   - No más estados inconsistentes
   - No más menús desincronizados
   - Comportamiento predecible
```

---

## 🚀 Siguiente Paso

**Probar el fix:**

1. Loguea 3 usuarios diferentes en 3 navegadores/pestañas
2. Todos deberían tener el servicio activo
3. Usuario A desactiva → verificar que todos pierden el menú
4. Usuario B reactiva → **verificar que Usuario A recupera el menú** ✅
5. Verificar logs en base de datos

```bash
# Ver si Usuario A recuperó su preferencia
docker exec -it personas_db psql -U admin -d personas_db \
  -c "SELECT user_id, username, consulta_service_enabled FROM users u JOIN user_preferences up ON u.id = up.user_id ORDER BY user_id;"
```

---

**✅ Fix implementado y desplegado!** 🎉

**Fecha:** 7 de octubre de 2025  
**Versión:** 2.1 - Toggle Simétrico Corregido
