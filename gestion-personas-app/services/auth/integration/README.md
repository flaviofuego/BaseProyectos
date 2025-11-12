# 🧪 Tests de Integración - Auth Service

## 📋 Descripción

Tests de integración que verifican el comportamiento completo del Auth Service interactuando con **bases de datos reales** (PostgreSQL y Redis) usando **Testcontainers**.

## 🎯 Escenario Implementado

### **Registro y Login Completo**

**Flujo completo:**

1. Levantar contenedores de PostgreSQL y Redis
2. Registrar un nuevo usuario → Verificar BD
3. Hacer login → Verificar token JWT
4. Verificar logs de transacciones
5. Verificar sesiones en Redis

**Tecnologías:**

- **Jest**: Framework de testing
- **Supertest**: Peticiones HTTP a la API
- **Testcontainers**: Contenedores Docker para PostgreSQL y Redis
- **pg**: Cliente PostgreSQL
- **redis**: Cliente Redis

## 🚀 Ejecución

### Ejecutar todos los tests de integración

```bash
# Opción 1: Script bash (recomendado)
./test-integration.sh

# Opción 2: npm script
npm run test:integration

# Opción 3: Jest directo
npx jest --config=jest.integration.config.js
```

### Ejecutar test específico

```bash
./test-integration.sh auth-flow.integration.test.js

# O con npm
npm run test:integration -- integration/auth-flow.integration.test.js
```

### Modo watch

```bash
./test-integration.sh --watch
```

## 📦 Prerequisitos

### 1. Docker Desktop corriendo

```bash
docker info
```

Si no funciona, inicia Docker Desktop.

### 2. Dependencias instaladas

```bash
npm install
```

**Paquetes necesarios:**

- `testcontainers`: ^10.2.1
- `supertest`: ^6.3.3
- `jest`: ^29.7.0
- `pg`: ^8.11.3
- `redis`: ^4.6.10

## 📊 Tests Incluidos

### **1. Registro de Usuario** (6 tests)

```javascript
describe('POST /register - Registro de Usuario', () => {
  ✅ Debe registrar un nuevo usuario exitosamente
  ✅ Debe crear el usuario en la base de datos
  ✅ Debe registrar el evento en logs
  ✅ Debe rechazar registro con username duplicado
  ✅ Debe rechazar registro con email duplicado
  ✅ Debe rechazar registro con contraseña débil
});
```

**Verificaciones:**

- Token JWT válido en respuesta
- Usuario creado en PostgreSQL
- Password hasheada (bcrypt)
- Normalización de username/email (lowercase)
- Log de transacción creado

### **2. Login de Usuario** (5 tests)

```javascript
describe('POST /login - Login de Usuario', () => {
  ✅ Debe hacer login exitosamente con credenciales correctas
  ✅ Debe registrar el login en logs
  ✅ Debe rechazar login con contraseña incorrecta
  ✅ Debe rechazar login con usuario inexistente
  ✅ Debe normalizar username en login (case-insensitive)
});
```

**Verificaciones:**

- Token JWT válido
- Usuario existe en BD
- Password verificada con bcrypt
- Log de login creado
- Case-insensitive (TESTUSER = testuser)

### **3. Flujo Completo End-to-End** (1 test)

```javascript
describe('Flujo Completo: Registro → Login → Verificación', () => {
  ✅ Debe completar flujo de registro y login correctamente
});
```

**Pasos:**

1. Registrar usuario nuevo
2. Verificar creación en BD
3. Login con mismo usuario
4. Verificar tokens (registro y login)
5. Verificar logs (REGISTER + LOGIN)

### **4. Redis Session Storage** (2 tests)

```javascript
describe('Redis Session Storage', () => {
  ✅ Debe poder almacenar y recuperar datos de sesión en Redis
  ✅ Debe expirar sesiones después del TTL
});
```

**Verificaciones:**

- Guardar/recuperar datos en Redis
- TTL de sesiones
- Expiración automática

## 🐳 Testcontainers

### **PostgreSQL Container**

```javascript
const pgContainer = await new GenericContainer("postgres:15-alpine")
  .withEnvironment({
    POSTGRES_USER: "testuser",
    POSTGRES_PASSWORD: "testpass",
    POSTGRES_DB: "testdb",
  })
  .withExposedPorts(5432)
  .withWaitStrategy(Wait.forLogMessage(/database system is ready/))
  .start();
```

**Tablas creadas:**

- `users`: Usuarios del sistema
- `user_preferences`: Preferencias de usuario
- `logs`: Logs de transacciones

### **Redis Container**

```javascript
const redisContainer = await new GenericContainer("redis:7-alpine")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
  .start();
```

## ⏱️ Tiempos de Ejecución

| Fase                                     | Tiempo Estimado |
| ---------------------------------------- | --------------- |
| Inicialización (pull images primera vez) | ~2-5 min        |
| Levantar contenedores                    | ~20-30 seg      |
| Ejecutar tests (14 tests)                | ~5-10 seg       |
| Limpiar recursos                         | ~5-10 seg       |
| **Total primera ejecución**              | **~3-6 min**    |
| **Total ejecuciones posteriores**        | **~40-60 seg**  |

## 🔧 Configuración

### **jest.integration.config.js**

```javascript
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/integration/**/*.integration.test.js"],
  testTimeout: 180000, // 3 minutos
  maxWorkers: 1, // Secuencial
  forceExit: true,
};
```

**Características:**

- Timeout de 3 minutos (contenedores toman tiempo)
- Ejecución secuencial (evitar conflictos de puertos)
- Force exit (limpiar handles de contenedores)

### **Variables de Entorno**

Los tests configuran automáticamente:

```javascript
process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
process.env.REDIS_URL = `redis://localhost:${redisPort}`;
process.env.JWT_SECRET = "test-secret-key-for-integration-tests";
process.env.NODE_ENV = "test";
```

## 📈 Ejemplo de Salida

```
========================================
  Tests de Integración - Auth Service
========================================

✅ Docker está corriendo

🧪 Ejecutando tests de integración...
⏰ Esto puede tomar varios minutos (levantando contenedores)

🚀 Iniciando contenedores de PostgreSQL y Redis...
✅ PostgreSQL levantado en puerto 55432
✅ Redis levantado en puerto 55433
✅ Tablas creadas en PostgreSQL
✅ Redis client conectado
✅ Aplicación cargada y lista para tests

Integration Tests - Auth Service: Registro y Login
  POST /register - Registro de Usuario
    ✓ Debe registrar un nuevo usuario exitosamente (245 ms)
    ✓ Debe crear el usuario en la base de datos (12 ms)
    ✓ Debe registrar el evento en logs (8 ms)
    ✓ Debe rechazar registro con username duplicado (34 ms)
    ✓ Debe rechazar registro con email duplicado (31 ms)
    ✓ Debe rechazar registro con contraseña débil (15 ms)
  POST /login - Login de Usuario
    ✓ Debe hacer login exitosamente con credenciales correctas (45 ms)
    ✓ Debe registrar el login en logs (9 ms)
    ✓ Debe rechazar login con contraseña incorrecta (38 ms)
    ✓ Debe rechazar login con usuario inexistente (32 ms)
    ✓ Debe normalizar username en login (case-insensitive) (41 ms)
  Flujo Completo: Registro → Login → Verificación
    ✓ Debe completar flujo de registro y login correctamente (89 ms)
  Redis Session Storage
    ✓ Debe poder almacenar y recuperar datos de sesión en Redis (15 ms)
    ✓ Debe expirar sesiones después del TTL (2023 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        35.234 s

🧹 Limpiando recursos...
✅ PostgreSQL pool cerrado
✅ Redis client desconectado
✅ Contenedor PostgreSQL detenido
✅ Contenedor Redis detenido

✅ Tests de Integración - PASSED
```

## 🐛 Troubleshooting

### "Docker is not running"

```bash
# Verificar Docker
docker info

# Si falla, inicia Docker Desktop
```

### "Port already in use"

Los tests usan puertos aleatorios mapeados por Testcontainers, así que esto no debería pasar. Si ocurre:

```bash
# Matar procesos en puertos específicos (Linux/Mac)
lsof -ti:5432 | xargs kill -9
lsof -ti:6379 | xargs kill -9

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5432).OwningProcess | Stop-Process
```

### "Timeout waiting for container"

Aumenta el timeout en el test:

```javascript
.withStartupTimeout(240000) // 4 minutos
```

O verifica tu conexión a internet (Docker necesita descargar imágenes).

### "Cannot find module '../index'"

Asegúrate de que el path al archivo index.js sea correcto:

```javascript
app = require("../index"); // Desde integration/auth-flow.integration.test.js
```

### Tests fallan intermitentemente

Es normal con contenedores. Asegúrate de:

- Ejecutar con `maxWorkers: 1` (secuencial)
- Usar `forceExit: true` en Jest config
- Limpiar recursos en `afterAll()`

## 📚 Referencias

- [Testcontainers Node.js](https://node.testcontainers.org/)
- [Supertest](https://github.com/ladjs/supertest)
- [Jest](https://jestjs.io/)

## 🎯 Escenarios Implementados

### ✅ **Escenario 1: Registro y Login Completo**
- **Archivo**: `auth-flow.integration.test.js`
- **Tests**: 14 tests
- **Tiempo**: ~40-60 segundos
- **Cobertura**: Registro, Login, Validaciones, Redis sessions

### ✅ **Escenario 2: CRUD de Persona con JWT**
- **Archivo**: `personas-crud.integration.test.js`
- **Tests**: 15 tests
- **Tiempo**: ~50-70 segundos
- **Cobertura**: Auth → JWT → Crear Persona → Consultar → Validaciones

### ⏳ **Próximos Escenarios**

3. **Consulta NLP end-to-end** (NLP Service → PostgreSQL)
4. **Service Registry discovery** (Registry → Personas Service)
5. **Búsqueda con cache** (Consulta Service → PostgreSQL + Redis)

---

**Nivel de esfuerzo**: 15% (Medio)  
**Estado**: ✅ 2 de 5 escenarios completados (40%)  
**Siguiente**: Escenario 3 - Consulta NLP
