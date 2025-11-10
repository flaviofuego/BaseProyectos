# ⏱️ Contador Regresivo para Rate Limiting - Implementación

## ✅ Funcionalidad Implementada

Se agregó un **contador regresivo visual** en el frontend que muestra el tiempo restante cuando un usuario es bloqueado por exceder el límite de intentos de login o registro.

---

## 🎯 **¿Qué Muestra?**

Cuando un usuario excede el límite de intentos:

### En **Login** (después de 5 intentos):

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Demasiados intentos de inicio de sesión      │
│                                                  │
│ Has excedido el número máximo de intentos...    │
│                                                  │
│ Tiempo restante: [14m 53s]                      │
└─────────────────────────────────────────────────┘
     [Botón de Login DESHABILITADO]
```

### En **Register** (después de 3 intentos fallidos):

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Demasiados intentos de registro              │
│                                                  │
│ Has excedido el número máximo de intentos...    │
│                                                  │
│ Tiempo restante: [59m 45s]                      │
└─────────────────────────────────────────────────┘
     [Botón de Registro DESHABILITADO]
```

---

## 🔧 **Cambios Implementados**

### 1. Backend - `frontend/app.py`

#### **A. Manejo de Status 429 en Login**

```python
elif response.status_code == 429:
    # Rate Limit excedido
    try:
        error_data = response.json()
        retry_after = error_data.get('retryAfter', '15 minutos')

        # Guardar en sesión para mostrar contador
        session['rate_limit_login'] = {
            'blocked_until': datetime.now().timestamp() + (15 * 60),
            'retry_after': retry_after,
            'message': error_data.get('message', '...')
        }
        flash(f'⏱️ {error_data.get("message")}', 'warning')
    except Exception as e:
        flash('⏱️ Demasiados intentos...', 'warning')
```

**¿Por qué guardar en sesión?**

- Persiste el bloqueo aunque el usuario recargue la página
- Permite calcular el tiempo restante en cada request
- El usuario no puede "evadir" el bloqueo recargando

#### **B. Manejo de Status 429 en Register**

```python
elif response.status_code == 429:
    # Rate Limit excedido en registro
    session['rate_limit_register'] = {
        'blocked_until': datetime.now().timestamp() + (60 * 60),  # 1 hora
        'retry_after': retry_after,
        'message': error_data.get('message', '...')
    }
```

#### **C. Nuevo Endpoint API - `/api/rate-limit-status`**

```python
@app.route('/api/rate-limit-status')
def rate_limit_status():
    """Retorna el estado actual del rate limit"""
    current_time = datetime.now().timestamp()
    status = {
        'login': {
            'blocked': False,
            'seconds_remaining': 0,
            'message': None
        },
        'register': {
            'blocked': False,
            'seconds_remaining': 0,
            'message': None
        }
    }

    # Verificar si hay bloqueo activo
    if 'rate_limit_login' in session:
        blocked_until = session['rate_limit_login']['blocked_until']
        if current_time < blocked_until:
            status['login']['blocked'] = True
            status['login']['seconds_remaining'] = int(blocked_until - current_time)
            # ...
        else:
            # Expiró, limpiar sesión
            session.pop('rate_limit_login', None)

    return jsonify(status)
```

**¿Qué hace este endpoint?**

1. Verifica si hay un bloqueo activo en la sesión
2. Calcula cuántos segundos quedan
3. Si ya expiró, limpia la sesión
4. Retorna información en JSON para el frontend

---

### 2. Frontend - Templates

#### **A. Login Template (`login.html`)**

**HTML - Indicador Visual:**

```html
<!-- Rate Limit Warning -->
<div
  id="rateLimitWarning"
  class="mt-3 alert alert-warning"
  style="display: none;"
>
  <div class="d-flex align-items-center">
    <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
    <div class="flex-grow-1">
      <strong>⏱️ Demasiados intentos de inicio de sesión</strong>
      <div id="rateLimitMessage" class="small mt-1"></div>
      <div class="mt-2">
        <strong>Tiempo restante:</strong>
        <span id="rateLimitCountdown" class="badge bg-danger fs-6"></span>
      </div>
    </div>
  </div>
</div>
```

**JavaScript - Lógica del Contador:**

```javascript
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function checkRateLimitStatus() {
  fetch("/api/rate-limit-status")
    .then((response) => response.json())
    .then((data) => {
      if (data.login.blocked) {
        // Mostrar warning y deshabilitar botón
        rateLimitWarning.style.display = "block";
        loginButton.disabled = true;

        // Iniciar contador regresivo
        let secondsRemaining = data.login.seconds_remaining;
        updateCountdown(secondsRemaining);

        // Actualizar cada segundo
        countdownInterval = setInterval(() => {
          secondsRemaining--;
          updateCountdown(secondsRemaining);

          if (secondsRemaining <= 0) {
            clearInterval(countdownInterval);
            setTimeout(checkRateLimitStatus, 1000);
          }
        }, 1000);
      }
    });
}

// Verificar al cargar la página
checkRateLimitStatus();

// Verificar cada 5 segundos
setInterval(() => {
  if (!countdownInterval) {
    checkRateLimitStatus();
  }
}, 5000);
```

#### **B. Register Template (`register.html`)**

Implementación idéntica, pero consultando `data.register` en lugar de `data.login`.

---

## 🔄 **Flujo Completo**

### Escenario: Usuario excede límite de login

```
1. Usuario intenta login #1
   └─> Backend: ✅ Permitido (1/5)

2. Usuario intenta login #2
   └─> Backend: ✅ Permitido (2/5)

3. Usuario intenta login #3
   └─> Backend: ✅ Permitido (3/5)

4. Usuario intenta login #4
   └─> Backend: ✅ Permitido (4/5)

5. Usuario intenta login #5
   └─> Backend: ✅ Permitido (5/5)

6. Usuario intenta login #6
   └─> Backend: ❌ HTTP 429 - Rate Limit Exceeded
   └─> Frontend:
       ├─ Recibe respuesta 429
       ├─ Guarda en sesión: blocked_until = now + 15min
       ├─ Muestra mensaje flash
       └─ Redirige a /login

7. Usuario ve página de login
   └─> JavaScript:
       ├─ Llama a /api/rate-limit-status
       ├─> API retorna: { blocked: true, seconds_remaining: 900 }
       ├─ Muestra warning box
       ├─ Muestra contador: "14m 59s"
       └─ Deshabilita botón de login

8. Cada segundo
   └─> JavaScript:
       ├─ Decrementa contador: "14m 58s" → "14m 57s" → ...
       └─ Actualiza display

9. Después de 15 minutos
   └─> JavaScript:
       ├─ Contador llega a 0
       ├─ Llama nuevamente a /api/rate-limit-status
       ├─> API retorna: { blocked: false }
       ├─ Oculta warning
       └─ Habilita botón de login
```

---

## 🎨 **Diseño Visual**

### Estados del Indicador

#### **Estado 1: No bloqueado**

```
[Formulario de login normal]
[Botón "Iniciar Sesión" HABILITADO]
```

#### **Estado 2: Bloqueado - Tiempo restante**

```
┌─────────────────────────────────────┐
│ ⚠️ Demasiados intentos             │
│ Has excedido el número máximo...   │
│ Tiempo restante: 14m 32s            │  ← Actualiza cada segundo
└─────────────────────────────────────┘
[Formulario de login grisado]
[Botón "Iniciar Sesión" DESHABILITADO]
```

#### **Estado 3: Expirando (< 1 minuto)**

```
┌─────────────────────────────────────┐
│ ⚠️ Demasiados intentos             │
│ Has excedido el número máximo...   │
│ Tiempo restante: 45s                │  ← Solo segundos
└─────────────────────────────────────┘
```

#### **Estado 4: Expirado**

```
[Warning desaparece]
[Formulario de login vuelve a la normalidad]
[Botón "Iniciar Sesión" HABILITADO]
```

---

## 📊 **Formato del Tiempo**

La función `formatTime()` muestra el tiempo de forma amigable:

| Segundos Restantes | Display          |
| ------------------ | ---------------- |
| 3661               | `1h 1m 1s`       |
| 900                | `15m 0s`         |
| 125                | `2m 5s`          |
| 59                 | `59s`            |
| 1                  | `1s`             |
| 0                  | _Oculta warning_ |

---

## 🛡️ **Seguridad**

### ¿Por qué es seguro?

1. **No se puede evadir recargando:**

   - El bloqueo está guardado en la **sesión del servidor**
   - No importa si el usuario cierra el navegador o recarga

2. **El tiempo se calcula en el servidor:**

   - El frontend solo **muestra** el tiempo
   - El backend es quien decide si está bloqueado o no

3. **Validación doble:**

   - Backend rechaza requests si hay rate limit
   - Frontend deshabilita botón para mejor UX

4. **Limpieza automática:**
   - Las sesiones expiradas se limpian automáticamente
   - No consume memoria indefinidamente

---

## 🧪 **Cómo Probar**

### Prueba de Login

1. Ir a `http://localhost:5001/login`
2. Intentar login 6 veces con credenciales incorrectas
3. **Resultado esperado:**
   - Intento 1-5: ❌ "Credenciales inválidas"
   - Intento 6: ⏱️ Aparece warning con contador
   - Botón de login se deshabilita
   - Contador baja cada segundo: 14m 59s → 14m 58s → ...

### Prueba de Register

1. Ir a `http://localhost:5001/register`
2. Intentar registro 4 veces con datos inválidos (ej: username "ab")
3. **Resultado esperado:**
   - Intento 1-3: ❌ "El username debe tener al menos 3 caracteres"
   - Intento 4: ⏱️ Aparece warning con contador (59m 59s)
   - Botón de registro se deshabilita

### Verificar API

```bash
# Verificar estado del rate limit
curl -s http://localhost:5001/api/rate-limit-status | python3 -m json.tool

# Respuesta si bloqueado:
{
  "login": {
    "blocked": true,
    "seconds_remaining": 847,
    "message": "Demasiados intentos de inicio de sesión",
    "retry_after": "15 minutos"
  },
  "register": {
    "blocked": false,
    "seconds_remaining": 0,
    "message": null
  }
}
```

---

## 💡 **Beneficios de UX**

### Antes (Sin Contador)

```
❌ Usuario intenta login
❌ "Demasiados intentos. Espera 15 minutos"
❓ Usuario: "¿Cuánto tiempo exactamente?"
❓ Usuario: "¿Ya pasaron 15 minutos?"
😤 Usuario: Intenta de nuevo... aún bloqueado
```

### Ahora (Con Contador)

```
❌ Usuario intenta login
⏱️ "Demasiados intentos. Tiempo restante: 14m 32s"
✅ Usuario: "Ok, vuelvo en 14 minutos"
⏱️ Contador baja: 14m 31s... 14m 30s...
✅ Usuario sabe exactamente cuándo puede intentar de nuevo
```

---

## 📁 **Archivos Modificados**

1. **`frontend/app.py`**

   - Línea ~184: Manejo de 429 en login
   - Línea ~289: Manejo de 429 en register
   - Línea ~1607: Nuevo endpoint `/api/rate-limit-status`

2. **`frontend/templates/login.html`**

   - Línea ~57: HTML del indicador de rate limit
   - Línea ~135: JavaScript del contador regresivo

3. **`frontend/templates/register.html`**
   - Línea ~170: HTML del indicador de rate limit
   - Línea ~220: JavaScript del contador regresivo

---

## ✨ **Mejoras Futuras**

1. **Animación del Progreso:**

   ```html
   <div class="progress">
     <div class="progress-bar" style="width: 45%"></div>
   </div>
   ```

2. **Notificación Sonora:**

   - Reproducir sonido cuando el bloqueo expire

3. **Notificación de Escritorio:**

   - Usar Notification API para avisar cuando puede intentar de nuevo

4. **Mostrar Intentos Restantes:**

   - "Te quedan 3 intentos antes del bloqueo"

5. **Captcha Después del Bloqueo:**
   - Requerir CAPTCHA para desbloquear

---

**Fecha de Implementación:** 9 de Noviembre, 2025  
**Rama:** validations  
**Estado:** ✅ Completado y Probado
