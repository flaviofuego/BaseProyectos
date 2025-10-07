# 🎛️ Toggle Servicio de Consulta - Guía de Uso

## 🚀 Inicio Rápido

### 1. Acceder al Panel de Configuración

```
URL: http://localhost:5000/configurar-cuenta
```

### 2. Ubicar el Toggle

En la sección "Servicio de Consulta" verás:
- **Toggle** (interruptor grande)
- **Badge de estado** del servicio
- **Badge de Docker** con estado del contenedor

---

## 🎯 Casos de Uso

### ✅ Activar Servicio de Consulta

**Pasos:**
1. Hacer clic en el toggle (cambiará a ON/verde)
2. Leer el modal de confirmación
3. Hacer clic en "Activar Servicio"
4. Esperar 2-5 segundos

**Resultado:**
- ✅ Contenedor Docker se inicia
- ✅ Servicio se registra en Service Registry
- ✅ Menú "Consultar Datos" aparece
- ✅ Badge muestra "Servicio Activo"
- ✅ Badge Docker muestra "Contenedor: Iniciado"

**Verificación:**
```bash
# Ver contenedor corriendo
docker ps | grep consulta_service_dev

# Probar endpoint
curl http://localhost:8001/api/consulta/stats
```

---

### ❌ Desactivar Servicio de Consulta

**Pasos:**
1. Hacer clic en el toggle (cambiará a OFF/rojo)
2. Leer el modal de confirmación
3. Hacer clic en "Desactivar Servicio"

**Resultado:**
- ❌ Contenedor Docker se detiene (si eres el último usuario)
- ❌ Servicio se desregistra del Service Registry
- ❌ Menú "Consultar Datos" desaparece
- ❌ Badge muestra "Servicio Desactivado"
- ❌ Badge Docker muestra "Contenedor: Detenido"

**Verificación:**
```bash
# Ver contenedor detenido
docker ps -a | grep consulta_service_dev
# Debe mostrar: "Exited"

# Service Registry no debe incluir consulta-service
curl http://localhost:8001/health
```

---

## 👥 Escenario Multi-Usuario

### Ejemplo: 3 Usuarios

```
🟢 Usuario A activa servicio
   → Contenedor INICIA
   → Usuarios activos: 1

🟢 Usuario B activa servicio
   → Contenedor YA CORRIENDO (no hace nada)
   → Usuarios activos: 2

🟢 Usuario C activa servicio
   → Contenedor YA CORRIENDO (no hace nada)
   → Usuarios activos: 3

🔴 Usuario A desactiva servicio
   → Contenedor SIGUE CORRIENDO (B y C lo usan)
   → Usuarios activos: 2

🔴 Usuario B desactiva servicio
   → Contenedor SIGUE CORRIENDO (C lo usa)
   → Usuarios activos: 1

🔴 Usuario C desactiva servicio
   → Contenedor SE DETIENE (último usuario)
   → Usuarios activos: 0
   → docker stop consulta_service_dev ✅
```

**Implicaciones:**
- ✅ Eficiencia de recursos
- ✅ No interrumpe a otros usuarios
- ✅ Solo detiene cuando nadie lo usa

---

## 🔍 Monitoreo

### Ver Estado del Contenedor

```bash
# Estado del contenedor
docker ps -a --filter "name=consulta_service_dev" --format "table {{.Names}}\t{{.Status}}"

# Logs del contenedor
docker logs consulta_service_dev -f

# Ver registro en Service Registry
curl http://localhost:8001/health | jq '.registeredServices[] | select(.name=="consulta-service")'
```

### Ver Usuarios con Servicio Activo

```bash
# Conectar a la base de datos
docker exec -it personas_db psql -U admin -d personas_db

# Query:
SELECT 
    u.username, 
    up.consulta_service_enabled, 
    up.updated_at 
FROM users u
JOIN user_preferences up ON u.id = up.user_id
WHERE up.consulta_service_enabled = TRUE;
```

---

## ⚠️ Comportamientos Especiales

### Auto-Reactivación en Logout

Cuando cierras sesión, el servicio se **reactiva automáticamente**.

**Razón:** Evitar que el contenedor quede detenido indefinidamente.

```javascript
// En logout():
try {
  make_request('PUT', '/api/auth/preferences/consulta-service', {
    'enabled': True
  });
} catch (error) {
  // No bloquear el logout
}
```

---

## 🐛 Troubleshooting

### Problema: Toggle no responde

**Solución:**
1. Verificar que estás autenticado
2. Abrir consola del navegador (F12)
3. Ver errores en Network tab
4. Verificar logs del auth-service:
   ```bash
   docker logs auth_service_dev --tail 50
   ```

### Problema: Contenedor no inicia

**Verificar:**
```bash
# ¿Docker socket montado?
docker exec auth_service_dev ls -la /var/run/docker.sock

# ¿Docker CLI disponible?
docker exec auth_service_dev docker --version

# ¿Contenedor existe?
docker ps -a | grep consulta_service_dev
```

**Solución:**
```bash
# Reiniciar auth-service
docker-compose -f docker-compose.dev.yml restart auth-service

# Si falla, rebuild
docker-compose -f docker-compose.dev.yml build auth-service
docker-compose -f docker-compose.dev.yml up -d auth-service
```

### Problema: Badge muestra estado incorrecto

**Limpiar caché:**
1. Ctrl + Shift + R (reload sin caché)
2. Cerrar sesión y volver a entrar
3. Verificar endpoint directamente:
   ```bash
   curl http://localhost:8001/api/auth/preferences \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Problema: Servicio no responde después de iniciar

**Esperar más tiempo:**
- Inicio del contenedor: ~2-5 segundos
- Registro en Service Registry: ~1-2 segundos
- Cache de Service Discovery: hasta 30 segundos

**Forzar actualización:**
```bash
# Reiniciar gateway para limpiar cache
docker restart api_gateway_dev
```

---

## 📊 Mensajes del Sistema

### Éxito

```
✅ Servicio de consulta habilitado correctamente
   (Contenedor iniciado)

✅ Servicio de consulta deshabilitado correctamente
   (Contenedor detenido)
```

### Advertencias

```
⚠️ El contenedor no se detuvo porque hay otros 
   usuarios usando el servicio
```

### Errores

```
❌ No se pudo iniciar el servicio de consulta. 
   Revisa que Docker esté funcionando.

❌ Error de conexión: No se pudo contactar con 
   el servidor
```

---

## 🧪 Testing Manual

### Test 1: Toggle Básico

1. Login en http://localhost:5000/login
2. Ir a Configurar Cuenta
3. Desactivar servicio → Verificar que menú "Consultar Datos" desaparece
4. Activar servicio → Verificar que menú reaparece
5. Probar acceder a "Consultar Datos" → Debe funcionar

### Test 2: Verificación Docker

```bash
# Mientras servicio está ACTIVO:
docker ps | grep consulta_service_dev
# Debe mostrar "Up"

# Desactivar servicio desde UI

# Verificar que se detuvo:
docker ps -a | grep consulta_service_dev
# Debe mostrar "Exited"

# Reactivar servicio desde UI

# Verificar que está corriendo nuevamente:
docker ps | grep consulta_service_dev
# Debe mostrar "Up X seconds"
```

### Test 3: Multi-Usuario

**Terminal 1 (Usuario A):**
```bash
# Login como admin
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Desactivar servicio
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'
```

**Terminal 2 (Usuario B):**
```bash
# Login como otro usuario
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123"}'

# Activar servicio
curl -X PUT http://localhost:8001/api/auth/preferences/consulta-service \
  -H "Authorization: Bearer TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

**Verificación:**
```bash
# Contenedor debe SEGUIR CORRIENDO (Usuario B lo activó)
docker ps | grep consulta_service_dev
```

---

## 📚 Referencias

- **Documentación Técnica**: `TOGGLE-DOCKER-IMPLEMENTATION.md`
- **Resumen Completo**: `IMPLEMENTACION-COMPLETADA.md`
- **Código Backend**: `services/auth/docker-controller.js`
- **Código Frontend**: `templates/configurar_cuenta.html`

---

## 💡 Tips

1. **Performance**: El contenedor tarda ~5 segundos en estar listo después de iniciar
2. **Seguridad**: Solo funciona para usuarios autenticados
3. **Multi-Usuario**: Si alguien más usa el servicio, no se detendrá
4. **Auto-Reactivación**: Se reactiva automáticamente al cerrar sesión
5. **Service Discovery**: El API Gateway detecta automáticamente cuando el servicio está disponible

---

## ✅ Checklist de Funcionalidad

- [x] Toggle visual funciona
- [x] Modal de confirmación aparece
- [x] Contenedor se inicia al activar
- [x] Contenedor se detiene al desactivar (sin otros usuarios)
- [x] Badge muestra estado correcto
- [x] Menú "Consultar Datos" aparece/desaparece
- [x] Service Registry se actualiza
- [x] API Gateway rutea correctamente
- [x] Multi-usuario funciona correctamente
- [x] Auto-reactivación en logout funciona

---

**¡Disfruta tu nuevo control de contenedores Docker integrado!** 🚀🐳
