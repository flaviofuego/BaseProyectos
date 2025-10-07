# ✅ Bug Corregido: Toggle Simétrico

## 🐛 Problema Reportado

> "Si se apaga el servicio de consulta con un usuario y otro lo enciende, el servicio está disponible para todos, pero al primer usuario no se le reactiva el botón de consultar datos en persona"

---

## 🔍 Análisis del Bug

### Comportamiento Incorrecto:

```
Estado Inicial:
- Usuario A: servicio ON ✅
- Usuario B: servicio ON ✅
- Contenedor: RUNNING 🟢

Usuario A desactiva:
- Usuario A: servicio OFF ❌
- Usuario B: servicio OFF ❌  ← Correcto, afecta a todos
- Contenedor: STOPPED 🔴

Usuario B reactiva:
- Usuario A: servicio OFF ❌  ← ❌ BUG: Debería estar ON
- Usuario B: servicio ON ✅
- Contenedor: RUNNING 🟢

Resultado: Usuario A no ve el menú aunque el contenedor está activo
```

### Causa Raíz:

**Lógica Asimétrica:**
- **Desactivar:** Actualiza a TODOS los usuarios → ✅ Correcto
- **Activar:** Solo actualiza al usuario que activó → ❌ Incorrecto

```javascript
// PROBLEMA en services/auth/index.js (línea ~275)

if (enabled) {
  // ❌ SOLO actualiza al usuario actual
  await pool.query(
    `INSERT INTO user_preferences (user_id, consulta_service_enabled)
     VALUES ($1, $2)
     ON CONFLICT (user_id) 
     DO UPDATE SET consulta_service_enabled = $2`,
    [userId, enabled]  // ← Solo userId actual
  );
} else {
  // ✅ Actualiza a TODOS
  await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = FALSE
     WHERE consulta_service_enabled = TRUE`  // ← Todos los usuarios
  );
}
```

---

## ✅ Solución Implementada

### Nueva Lógica: Totalmente Simétrica

Ahora **AMBAS** acciones afectan a TODOS los usuarios:

```javascript
if (enabled) {
  // ✅ Activar para TODOS los usuarios
  const enableAllResult = await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE consulta_service_enabled = FALSE
     RETURNING user_id`
  );
  
  const affectedUsers = enableAllResult.rows.map(row => row.user_id);
  console.log(`✅ Enabled service for ${affectedUsers.length} user(s): [${affectedUsers.join(', ')}]`);
  
  // Invalidar cache de TODOS los afectados
  for (const affectedUserId of affectedUsers) {
    await invalidateUserPreferencesCache(affectedUserId);
  }
  
  // Log con usuarios afectados
  logTransaction(userId, 'ENABLE_CONSULTA_SERVICE', 'SUCCESS', req, {
    username: username,
    affected_users: affectedUsers,
    total_affected: affectedUsers.length,
    container_started: true,
    message: `User ${username} enabled service for all users`
  });
  
  return res.json({
    success: true,
    message: `Servicio de consulta habilitado para todos los usuarios`,
    affected_users: affectedUsers.length,  // ← Info para UI
    preferences: { consulta_service_enabled: true }
  });
  
} else {
  // ✅ Desactivar para TODOS (ya estaba correcto)
  const disableAllResult = await pool.query(
    `UPDATE user_preferences 
     SET consulta_service_enabled = FALSE
     WHERE consulta_service_enabled = TRUE
     RETURNING user_id`
  );
  // ... resto del código de desactivación
}
```

---

## 📝 Cambios Realizados

### 1. Backend: `services/auth/index.js`

✅ **Activación (líneas 160-230):**
- UPDATE afecta a todos los usuarios con servicio desactivado
- Invalidación de cache para TODOS los afectados
- Logging incluye `affected_users` array y `total_affected`
- Respuesta incluye `affected_users` count

❌ **Código eliminado (líneas ~275-310):**
- Query que solo actualizaba userId individual
- Invalidación de cache solo para un usuario
- Log sin información de usuarios afectados
- Respuesta genérica sin conteo

### 2. Frontend: `frontend/templates/configurar_cuenta.html`

✅ **Modal de Activación (líneas 520-550):**
```html
<div class="alert alert-success mb-0">
    <strong>✅ ATENCIÓN - Esta acción afecta a TODOS los usuarios:</strong>
    <ul>
        <li><strong>Se activará el servicio para TODOS los usuarios conectados</strong></li>
        <li>Se iniciará el contenedor Docker del servicio de consulta</li>
        <li>Todos podrán consultar datos de personas</li>
    </ul>
</div>
```

✅ **Botón actualizado:**
```html
<button class="btn btn-success">
    <i class="fas fa-check"></i> Activar para Todos
</button>
```

✅ **Mensaje de éxito (líneas 590-600):**
```javascript
if (data.affected_users) {
    if (pendingToggleState) {
        message = `Servicio activado para ${data.affected_users} usuario(s)`;
    } else {
        message = `Servicio desactivado para ${data.affected_users} usuario(s)`;
    }
}
```

✅ **Descripción del toggle (líneas 140-155):**
```html
<strong>⚠️ Atención:</strong> Este toggle afecta a TODOS los usuarios:
<ul>
    <li><strong>Activar:</strong> Inicia el contenedor y habilita el servicio para todos</li>
    <li><strong>Desactivar:</strong> Detiene el contenedor y deshabilita el servicio para todos</li>
</ul>
```

---

## 🧪 Flujo Corregido

### Caso de Uso: 3 Usuarios, Servicio Activo

**1. Estado Inicial:**
```
Usuario A: ON ✅  |  Usuario B: ON ✅  |  Usuario C: ON ✅
Contenedor: RUNNING 🟢
```

**2. Usuario A desactiva:**
```sql
-- UPDATE user_preferences SET consulta_service_enabled = FALSE
-- WHERE consulta_service_enabled = TRUE;
-- affected_users = [1, 2, 3]

docker stop consulta_service_dev
```
```
Usuario A: OFF ❌  |  Usuario B: OFF ❌  |  Usuario C: OFF ❌
Contenedor: STOPPED 🔴
```

**3. Usuario B reactiva (CORREGIDO):**
```sql
-- UPDATE user_preferences SET consulta_service_enabled = TRUE
-- WHERE consulta_service_enabled = FALSE;
-- affected_users = [1, 2, 3]  ← Ahora incluye a A y C

docker start consulta_service_dev
```
```
Usuario A: ON ✅ ← CORREGIDO  |  Usuario B: ON ✅  |  Usuario C: ON ✅ ← CORREGIDO
Contenedor: RUNNING 🟢
```

**4. Usuario A recarga su página:**
```
✅ Ve el menú "Consultar Datos"
✅ Puede hacer consultas
✅ Estado consistente con el contenedor
```

---

## 📊 Antes vs Después

| Escenario | ANTES ❌ | DESPUÉS ✅ |
|-----------|----------|------------|
| A desactiva → B reactiva → A recarga | A no ve menú | A ve menú ✓ |
| B reactiva, usuarios afectados | Solo B | A, B, C ✓ |
| Logs de activación | Sin affected_users | Con affected_users ✓ |
| Mensaje UI activación | "habilitado correctamente" | "habilitado para 3 usuario(s)" ✓ |
| Modal activación | "podrás consultar" | "TODOS podrán consultar" ✓ |
| Botón activación | "Activar Servicio" | "Activar para Todos" ✓ |
| Cache invalidation | Solo B | A, B, C ✓ |
| Consistencia | Asimétrica | Simétrica ✓ |

---

## ✅ Verificación del Fix

### Test Manual:

```bash
# 1. Abrir 3 navegadores/pestañas con usuarios diferentes
# 2. Verificar que todos tengan servicio activo
# 3. Usuario A desactiva
#    → Verificar que B y C pierden el menú
# 4. Usuario B reactiva
#    → Verificar que A recupera el menú ✅
# 5. Usuario A recarga
#    → Debe ver "Consultar Datos" ✅
```

### Verificar en Base de Datos:

```sql
-- Ver estado de todos los usuarios
SELECT 
  u.id,
  u.username,
  COALESCE(up.consulta_service_enabled, true) as servicio_activo
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
ORDER BY u.id;
```

**Resultado esperado después de que B reactive:**
```
 id | username | servicio_activo
----+----------+----------------
  1 | admin    | true           ← ✅ Ahora TRUE
  2 | user2    | true
  3 | user3    | true
```

### Verificar Logs:

```sql
-- Ver últimas activaciones con usuarios afectados
SELECT 
  TO_CHAR(tl.created_at, 'HH24:MI:SS') as hora,
  u.username as quien,
  tl.transaction_type as accion,
  tl.request_data->>'total_affected' as usuarios,
  tl.request_data->'affected_users' as ids
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type IN ('ENABLE_CONSULTA_SERVICE', 'DISABLE_CONSULTA_SERVICE')
ORDER BY tl.created_at DESC
LIMIT 5;
```

**Output esperado:**
```
   hora   | quien | accion                    | usuarios | ids
----------+-------+--------------------------+----------+---------
16:15:23  | user2 | ENABLE_CONSULTA_SERVICE  | 3        | [1,2,3]
16:14:50  | admin | DISABLE_CONSULTA_SERVICE | 3        | [1,2,3]
```

---

## 🎯 Beneficios del Fix

1. **Consistencia Perfecta** 🎯
   - Activar = global
   - Desactivar = global
   - No más estados inconsistentes

2. **UX Mejorada** 💡
   - Usuarios no pierden acceso sin razón
   - Comportamiento predecible
   - Mensajes claros del impacto

3. **Auditabilidad** 📝
   - Logs completos con affected_users
   - Trazabilidad de cambios globales
   - Historial de impacto

4. **Cache Correcto** ⚡
   - Invalidación global cuando corresponde
   - Menús sincronizados para todos
   - No requiere F5 manual

5. **UI Transparente** 🔍
   - Modales advierten impacto global
   - Botones explícitos: "para Todos"
   - Contadores de usuarios afectados

---

## 📦 Archivos Modificados

1. ✅ `services/auth/index.js`
   - Líneas 160-320: Reescrito endpoint PUT /preferences/consulta-service
   - Activación ahora actualiza a TODOS los usuarios
   - Logging con affected_users
   - Respuesta incluye affected_users count

2. ✅ `frontend/templates/configurar_cuenta.html`
   - Líneas 140-155: Descripción del toggle actualizada
   - Líneas 520-550: Modal de activación con advertencia global
   - Líneas 590-600: Mensaje de éxito con conteo de usuarios

3. ✅ `FIX-TOGGLE-SIMETRICO.md`
   - Documentación completa del bug y la solución

4. ✅ Auth service reiniciado
   - Cambios aplicados y funcionando

---

## 🚀 Estado Final

```
✅ BUG CORREGIDO:
   Usuario A recupera acceso cuando otro usuario reactiva ✓

✅ LÓGICA SIMÉTRICA:
   Activar y Desactivar afectan a TODOS ✓

✅ LOGS COMPLETOS:
   Ambas acciones registran affected_users ✓

✅ UI CONSISTENTE:
   Modales y mensajes reflejan impacto global ✓

✅ CACHE SINCRONIZADO:
   Invalidación para todos los afectados ✓

✅ TESTING READY:
   Sistema listo para validación ✓
```

---

## 🎓 Lección Aprendida

**Principio de Simetría en Control de Recursos Compartidos:**

Cuando un recurso compartido (contenedor Docker) puede ser controlado por múltiples usuarios:

- ✅ Las acciones deben ser **simétricas**
- ✅ Si "apagar" afecta a todos → "encender" debe afectar a todos
- ✅ La UI debe ser **explícita** sobre el impacto
- ✅ Los logs deben capturar el **alcance completo** de cada acción

**Anti-patrón evitado:**
```
❌ Acción A: afecta solo al usuario
❌ Acción B: afecta a todos
→ Estados inconsistentes e impredecibles
```

**Patrón correcto:**
```
✅ Acción A: afecta a todos
✅ Acción B: afecta a todos
→ Estados consistentes y predecibles
```

---

**✅ Bug corregido y documentado!** 🎉

**Issue:** Toggle asimétrico causaba estados inconsistentes  
**Fix:** Lógica simétrica con invalidación global de cache  
**Resultado:** Comportamiento consistente y predecible  
**Fecha:** 7 de octubre de 2025  
**Versión:** 2.1 - Toggle Simétrico
