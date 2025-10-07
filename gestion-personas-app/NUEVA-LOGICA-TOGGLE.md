# 🔄 Nueva Lógica del Toggle - Desactivación Global

## 📋 Cambios Implementados

### ✅ Cambio 1: Logging Completo

**Logs registrados en la base de datos:**

#### Al ACTIVAR servicio:
```javascript
Transaction Type: ENABLE_CONSULTA_SERVICE
Status: SUCCESS
Details: {
  username: "admin",
  enabled: true,
  docker_action: "start",
  docker_result: "success", // o "already_running"
  container_started: true,
  message: "User admin enabled service"
}
```

#### Al DESACTIVAR servicio:
```javascript
Transaction Type: DISABLE_CONSULTA_SERVICE
Status: SUCCESS
Details: {
  username: "admin",
  enabled: false,
  docker_action: "stop",
  docker_result: "success",
  affected_users: [1, 2, 3],  // IDs de usuarios afectados
  total_affected: 3,
  container_stopped: true,
  message: "User admin disabled service for all users"
}
```

#### En caso de ERROR:
```javascript
Transaction Type: ENABLE_CONSULTA_SERVICE
Status: ERROR
Details: {
  username: "admin",
  enabled: true,
  docker_action: "start",
  docker_result: "failed",
  error: "container_not_found"
}
Error Message: "Failed to start container"
```

---

### ✅ Cambio 2: Lógica Simplificada - Desactivación Global

## ❌ ANTES (Lógica Multi-Usuario Compleja)

```
Usuario A activa → Contenedor INICIA
Usuario B activa → Contenedor YA CORRIENDO
Usuario A desactiva → Contenedor SIGUE (B lo usa) ❌ Confuso
Usuario B desactiva → Contenedor SE DETIENE
```

**Problemas:**
- ❌ Confuso para los usuarios
- ❌ Un usuario no puede liberar recursos inmediatamente
- ❌ Comportamiento inconsistente
- ❌ Contenedor puede quedar corriendo sin necesidad

---

## ✅ AHORA (Lógica Global Simple)

```
Usuario A activa → Contenedor INICIA ✅
Usuario B activa → Contenedor YA CORRIENDO ✅
Usuario C activa → Contenedor YA CORRIENDO ✅

Usuario A desactiva → 🔴 DESACTIVA PARA TODOS
                     → Contenedor SE DETIENE ✅
                     → Usuario B pierde acceso
                     → Usuario C pierde acceso
                     → Recursos liberados inmediatamente

Cualquier usuario puede reactivar → Contenedor INICIA ✅
```

**Beneficios:**
- ✅ **Simple y claro**: Un usuario apaga = apaga para todos
- ✅ **Ahorro de recursos inmediato**: Contenedor se detiene en el momento
- ✅ **Comportamiento consistente**: Siempre hace lo mismo
- ✅ **Reversible**: Cualquiera puede reactivar
- ✅ **Transparente**: Modal advierte claramente

---

## 🎯 Comportamiento Detallado

### Escenario 1: Activar Servicio

**Usuario hace clic en Toggle (OFF → ON)**

```
1. Modal aparece con mensaje:
   "¿Deseas activar el servicio de consulta?"
   - Se iniciará contenedor Docker
   - Podrás consultar datos
   - Se registrará en service registry

2. Usuario confirma → Backend:
   a. Verificar si contenedor está corriendo
   b. Si NO está corriendo:
      - Ejecutar: docker start consulta_service_dev
      - Esperar 2 segundos
      - Verificar que inició correctamente
   c. Si ya está corriendo:
      - No hacer nada (éxito)
   d. Guardar preferencia en DB: consulta_service_enabled = TRUE
   e. Registrar log: ENABLE_CONSULTA_SERVICE

3. Frontend muestra:
   ✅ Badge: "Servicio Activo"
   🐳 Badge Docker: "Contenedor: Iniciado"
   ✅ Menú "Consultar Datos" aparece
```

---

### Escenario 2: Desactivar Servicio (NUEVO)

**Usuario hace clic en Toggle (ON → OFF)**

```
1. Modal aparece con advertencia ROJA:
   "⚠️ ATENCIÓN - Esta acción afecta a TODOS los usuarios"
   - Se desactivará para TODOS los usuarios conectados
   - Se detendrá el contenedor Docker
   - Opción "Consultar Datos" se deshabilitará para todos
   - Cualquier usuario puede reactivarlo

2. Usuario confirma "Desactivar para Todos" → Backend:
   a. 🔴 Actualizar DB para TODOS:
      UPDATE user_preferences 
      SET consulta_service_enabled = FALSE
      WHERE consulta_service_enabled = TRUE
      
   b. 🧹 Invalidar cache de Redis para todos los usuarios afectados
   
   c. 🛑 Detener contenedor Docker:
      docker stop consulta_service_dev
      
   d. 📝 Registrar log completo:
      - Usuario que desactivó
      - Lista de usuarios afectados
      - Estado del contenedor
      - Resultado de la acción

3. Frontend muestra:
   ❌ Badge: "Servicio Desactivado"
   🐳 Badge Docker: "Contenedor: Detenido"
   ❌ Menú "Consultar Datos" desaparece
   📊 Mensaje: "Servicio desactivado para X usuario(s) - Contenedor detenido"

4. Otros usuarios en sesión:
   - Al hacer siguiente request → Gateway detecta servicio deshabilitado
   - Retorna 403: "Servicio deshabilitado"
   - Frontend muestra mensaje
```

---

## 🔍 Verificación de Logs

### Ver logs en la base de datos:

```sql
-- Logs de activación
SELECT 
  tl.created_at,
  u.username,
  tl.transaction_type,
  tl.status,
  tl.request_data,
  tl.response_data
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type = 'ENABLE_CONSULTA_SERVICE'
ORDER BY tl.created_at DESC
LIMIT 10;

-- Logs de desactivación
SELECT 
  tl.created_at,
  u.username,
  tl.transaction_type,
  tl.status,
  tl.request_data->>'total_affected' as usuarios_afectados,
  tl.request_data->>'container_stopped' as contenedor_detenido,
  tl.request_data->>'message' as mensaje
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type = 'DISABLE_CONSULTA_SERVICE'
ORDER BY tl.created_at DESC
LIMIT 10;

-- Ver usuarios afectados por última desactivación
SELECT 
  tl.created_at,
  u.username as quien_desactivo,
  tl.request_data->'affected_users' as usuarios_afectados_ids
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type = 'DISABLE_CONSULTA_SERVICE'
ORDER BY tl.created_at DESC
LIMIT 1;
```

### Ver logs desde el servicio:

```bash
# Conectar a la base de datos
docker exec -it personas_db psql -U admin -d personas_db

# Query completo:
SELECT 
  TO_CHAR(tl.created_at, 'YYYY-MM-DD HH24:MI:SS') as fecha,
  u.username,
  tl.transaction_type,
  tl.status,
  tl.request_data::text
FROM transaction_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.transaction_type IN ('ENABLE_CONSULTA_SERVICE', 'DISABLE_CONSULTA_SERVICE')
ORDER BY tl.created_at DESC
LIMIT 20;
```

---

## 📊 Ejemplo Real de Logs

### Escenario: Usuario "admin" desactiva servicio

**Log registrado:**
```json
{
  "transaction_id": 1234,
  "user_id": 1,
  "username": "admin",
  "transaction_type": "DISABLE_CONSULTA_SERVICE",
  "status": "SUCCESS",
  "created_at": "2025-10-07 15:30:45",
  "request_data": {
    "username": "admin",
    "enabled": false,
    "docker_action": "stop",
    "docker_result": "success",
    "affected_users": [1, 2, 3, 5, 8],
    "total_affected": 5,
    "container_stopped": true,
    "message": "User admin disabled service for all users"
  },
  "response_data": null,
  "error_message": null,
  "ip_address": "172.18.0.1",
  "user_agent": "Mozilla/5.0..."
}
```

**Interpretación:**
- Usuario "admin" (ID: 1) desactivó el servicio
- Afectó a 5 usuarios (IDs: 1, 2, 3, 5, 8)
- Contenedor Docker se detuvo exitosamente
- Acción completada a las 15:30:45

---

## 🎨 UI Actualizada

### Modal de Desactivación (NUEVO)

```
┌────────────────────────────────────────────────────┐
│ ⚠️  Confirmar acción                         ❌    │
├────────────────────────────────────────────────────┤
│                                                    │
│ ⚠️  ¿Estás seguro de desactivar el servicio?     │
│                                                    │
│ 🚨 ATENCIÓN - Esta acción afecta a TODOS:        │
│                                                    │
│ • Se desactivará para TODOS los usuarios          │
│ • Se detendrá el contenedor Docker                │
│ • La opción "Consultar Datos" se deshabilitará    │
│ • El servicio se desregistrará del registry       │
│                                                    │
│ 📝 Nota: La función "Consulta IA" permanece      │
│          activa (servicio independiente).          │
│                                                    │
│          Cualquier usuario puede reactivarlo.      │
│                                                    │
│      [Cancelar]  [🔴 Desactivar para Todos]       │
└────────────────────────────────────────────────────┘
```

### Descripción del Servicio (ACTUALIZADA)

```
┌────────────────────────────────────────────────────┐
│ ⚙️  Servicio de Consulta                          │
├────────────────────────────────────────────────────┤
│                                                    │
│ Estado del Servicio de Consulta                   │
│                                                    │
│ ℹ️ ⚠️ Atención: Desactivar este servicio lo      │
│    deshabilitará para TODOS los usuarios y        │
│    detendrá el contenedor Docker.                 │
│                                                    │
│    La función "Consulta IA" permanecerá activa.   │
│    Cualquier usuario puede reactivarlo.           │
│                                              🟢 ON │
│                                                    │
│ ✅ Servicio Activo  🐳 Contenedor: Iniciado      │
└────────────────────────────────────────────────────┘
```

### Mensaje de Éxito (NUEVO)

```
Cuando se desactiva:
✅ Servicio desactivado para 3 usuario(s) - Contenedor detenido

Cuando se activa:
✅ Servicio habilitado correctamente - Contenedor iniciado
```

---

## 🧪 Testing

### Test 1: Desactivación Global

```bash
# Terminal 1: Login usuario A
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
# ✅ Servicio activado para usuario A

# Terminal 2: Login usuario B
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
# ✅ Servicio activado para usuario B

# Terminal 3: Verificar contenedor
docker ps | grep consulta_service_dev
# ✅ Up X seconds

# Terminal 1: Usuario A desactiva servicio
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
# ✅ Response: {"affected_users": 2, "message": "Servicio desactivado para todos"}

# Terminal 3: Verificar contenedor
docker ps -a | grep consulta_service_dev
# ✅ Exited X seconds ago

# Terminal 2: Usuario B intenta consultar
curl http://localhost:8001/api/consulta/stats \
  -H "Authorization: Bearer TOKEN_B"
# ❌ 403 Forbidden: "Servicio de consulta deshabilitado"
```

### Test 2: Verificar Logs

```bash
# Ver log de desactivación
docker exec -it personas_db psql -U admin -d personas_db \
  -c "SELECT request_data FROM transaction_logs WHERE transaction_type = 'DISABLE_CONSULTA_SERVICE' ORDER BY created_at DESC LIMIT 1;"

# Output esperado:
{
  "username": "admin",
  "enabled": false,
  "docker_action": "stop",
  "docker_result": "success",
  "affected_users": [1, 2],
  "total_affected": 2,
  "container_stopped": true,
  "message": "User admin disabled service for all users"
}
```

---

## ✅ Ventajas de la Nueva Lógica

### 1. **Simplicidad**
- Un botón, una acción clara
- No hay estados intermedios confusos

### 2. **Ahorro de Recursos**
- Contenedor se detiene inmediatamente
- No queda corriendo sin uso

### 3. **Transparencia**
- Modal advierte claramente el impacto
- Logs completos de toda la acción

### 4. **Reversibilidad**
- Cualquier usuario puede reactivar
- No requiere permisos especiales

### 5. **Auditabilidad**
- Logs completos en base de datos
- Trazabilidad total de quién hizo qué

---

## 📝 Notas Importantes

1. **Auto-reactivación en logout**: Se mantiene para evitar que el servicio quede desactivado indefinidamente

2. **Mensajes claros**: El UI advierte explícitamente que afecta a todos

3. **Logs detallados**: Incluyen lista de usuarios afectados y resultados Docker

4. **Error handling**: Si falla detener contenedor, la preferencia se guarda igual

5. **Cache invalidation**: Se invalida el cache de todos los usuarios afectados

---

## 🎓 Decisiones de Diseño

### ¿Por qué desactivación global?

**Opción A (anterior): Multi-usuario complejo**
- ❌ Confuso: "¿Por qué no se detuvo el contenedor?"
- ❌ Desperdicio: Contenedor corriendo sin usuarios activos
- ❌ Complejo: Tracking de múltiples usuarios

**Opción B (actual): Desactivación global**
- ✅ Simple: "Un usuario apaga = apaga para todos"
- ✅ Eficiente: Recursos liberados inmediatamente
- ✅ Claro: El modal lo advierte explícitamente
- ✅ Reversible: Cualquiera puede reactivar

### Consideraciones

- **Colaboración**: Si el equipo necesita el servicio, lo mantienen activo
- **Recursos**: Si alguien no lo necesita, lo apaga y libera recursos
- **Flexibilidad**: Reactivar es tan fácil como desactivar

---

## 🚀 Conclusión

La nueva lógica es:
- ✅ **Más simple** de entender
- ✅ **Más eficiente** en recursos
- ✅ **Más transparente** con logs completos
- ✅ **Más clara** con advertencias explícitas

**¡Cambios aplicados y funcionando!** 🎉

---

**Fecha de actualización:** 7 de octubre de 2025  
**Versión:** 2.0 (Desactivación Global con Logging)
