# 🏗️ Arquitectura de Ejecución de Tests

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Tests Unitarios (60%)](#tests-unitarios-60)
3. [Tests de Integración sin Testcontainers (15%)](#tests-de-integración-sin-testcontainers)
4. [Tests de Integración con Testcontainers (15%)](#tests-de-integración-con-testcontainers)
5. [Comparación de Estrategias](#comparación-de-estrategias)
6. [Cuándo Usar Cada Estrategia](#cuándo-usar-cada-estrategia)
7. [Comandos de Ejecución](#comandos-de-ejecución)

---

## Resumen Ejecutivo

**¿Dónde se ejecutan los tests?**

- ✅ **Todos los tests se ejecutan LOCALMENTE** (en tu máquina Windows/WSL)
- ✅ **Nunca ejecutas tests dentro de contenedores Docker** (salvo casos especiales de CI/CD)

**¿Qué pasa con Docker?**

- 🐳 **Opción A**: Los tests hacen peticiones HTTP a servicios corriendo en Docker
- 🐳 **Opción B**: Los tests levantan sus propios contenedores temporales (Testcontainers)

---

## Tests Unitarios (60%)

### 🎯 Objetivo

Verificar funciones y componentes individuales **de forma aislada**.

### 🏃 Dónde se ejecuta

```
┌─────────────────────────────────┐
│      Tu Máquina Local           │
│                                 │
│  ┌──────────────────────┐       │
│  │   npm test           │       │
│  │   (Jest runner)      │       │
│  └──────────┬───────────┘       │
│             │                   │
│             ↓                   │
│  ┌──────────────────────┐       │
│  │  Código a testear    │       │
│  │  + MOCKS             │       │
│  └──────────────────────┘       │
│                                 │
│  ❌ NO usa Docker               │
│  ❌ NO usa BD real              │
│  ❌ NO usa servicios externos   │
└─────────────────────────────────┘
```

### 📝 Ejemplo: Test de Middleware de Autenticación

```javascript
// auth.middleware.test.js (UNITARIO)
const { verifyToken } = require("./middleware/auth");

describe("Auth Middleware - Unit Tests", () => {
  test("should reject request without token", () => {
    const req = { headers: {} }; // Mock request
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    verifyToken(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No token provided",
    });
  });

  test("should populate req.user with valid token", () => {
    const token = jwt.sign({ id: 123 }, "secret");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(req.user).toEqual({ id: 123 });
    expect(next).toHaveBeenCalled();
  });
});
```

### ⚡ Características

- **Velocidad**: < 1 segundo
- **Cobertura**: 90-100%
- **Dependencias**: SOLO mocks
- **Ejecución**: `npm test` o `npm run test:unit`
- **Sin Docker**: ✅ No requiere contenedores

### 📦 Qué testear (POR HACER)

#### Backend (Node.js)

- ✅ Middleware de autenticación (90% cobertura)
- ✅ Validación de schemas Joi (95% cobertura)
- ✅ Generación de tokens JWT (95% cobertura)
- ✅ Procesamiento de imágenes con Sharp (85% cobertura)
- ✅ Utilidades y helpers (90-100% cobertura)

#### Frontend (Flask + JavaScript)

- ✅ Rutas de Flask (80% cobertura - Pytest)
- ✅ NotificationManager (90% cobertura - Jest)
- ✅ ThemeManager (85% cobertura - Jest)
- ✅ Validación de formularios (90% cobertura - Jest)
- ✅ Utilidades de formateo (95% cobertura - Jest)

---

## Tests de Integración sin Testcontainers

### 🎯 Objetivo

Verificar que los servicios **se comunican correctamente** cuando están corriendo en Docker.

### 🏃 Dónde se ejecuta

```
┌────────────────────────────┐         ┌─────────────────────────────┐
│    Tu Máquina Local        │         │      Docker Engine          │
│                            │         │                             │
│  ┌──────────────────────┐  │         │  ┌───────────────────────┐  │
│  │  npm run test:int    │  │         │  │  auth-service         │  │
│  │  (Jest + Supertest)  │  │  HTTP   │  │  localhost:3001       │  │
│  └──────────┬───────────┘  │ ──────→ │  └───────────────────────┘  │
│             │               │         │                             │
│             │ HTTP Request  │         │  ┌───────────────────────┐  │
│             └──────────────┼────────→ │  │  personas-service     │  │
│                            │         │  │  localhost:3002       │  │
│                            │         │  └───────────────────────┘  │
│                            │         │                             │
│                            │         │  ┌───────────────────────┐  │
│                            │         │  │  PostgreSQL           │  │
│                            │         │  │  localhost:5432       │  │
│                            │         │  └───────────────────────┘  │
│                            │         │                             │
│                            │         │  ┌───────────────────────┐  │
│                            │         │  │  Redis                │  │
│                            │         │  │  localhost:6379       │  │
│                            │         │  └───────────────────────┘  │
└────────────────────────────┘         └─────────────────────────────┘

Requisito previo: docker compose -f docker-compose.dev.yml up -d
```

### 📝 Ejemplo: Test haciendo HTTP a servicio en Docker

```javascript
// personas-crud.integration.test.js
const request = require("supertest");

describe("CRUD de Persona con JWT", () => {
  const AUTH_SERVICE = "http://localhost:3001";
  const GATEWAY = "http://localhost:3000";
  let token;

  beforeAll(async () => {
    // Obtener token del auth-service que está corriendo en Docker
    const loginResponse = await request(AUTH_SERVICE)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    token = loginResponse.body.token;
  });

  test("should create persona with valid JWT", async () => {
    // Llamar al Gateway que está corriendo en Docker
    const response = await request(GATEWAY)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Juan",
        apellido: "Pérez",
        tipo_documento: "DNI",
        numero_documento: "12345678",
      });

    expect(response.status).toBe(201);
    expect(response.body.nombre).toBe("Juan");
  });
});
```

### ⚡ Características

- **Velocidad**: 2-10 segundos por test
- **Dependencias**: Servicios en Docker
- **Ejecución**: `npm run test:integration`
- **Requisito previo**: `docker compose up -d`

### 📦 Escenarios NO implementados aún con esta estrategia

Si quisieras usar esta estrategia (en lugar de Testcontainers), necesitarías:

1. **Levantar servicios**: `docker compose -f docker-compose.dev.yml up -d`
2. **Esperar que estén listos**: ~10-30 segundos
3. **Ejecutar tests**: Hacer peticiones HTTP a `localhost:300X`
4. **Limpiar datos**: Reset BD entre tests

**Ventaja**: Tests más realistas (ambiente igual a producción)
**Desventaja**: Lento, difícil de limpiar, puede tener datos sucios

---

## Tests de Integración con Testcontainers

### 🎯 Objetivo

Verificar interacciones con **bases de datos y servicios reales**, pero de forma **aislada y automática**.

### 🏃 Dónde se ejecuta

```
┌─────────────────────────────────────────────────────────────┐
│              Tu Máquina Local (Windows/WSL)                 │
│                                                             │
│  1. npm run test:integration                                │
│     └─→ Jest ejecuta el test                                │
│                                                             │
│  2. beforeAll() - Testcontainers levanta contenedores      │
│     ┌────────────────────────────────────────┐             │
│     │ new GenericContainer('postgres:15')    │             │
│     │   .withExposedPorts(5432)              │             │
│     │   .start()                             │             │
│     └────────────┬───────────────────────────┘             │
│                  ↓                                          │
│     Docker crea: postgres_test_abc123 → localhost:32768    │
│                                                             │
│     ┌────────────────────────────────────────┐             │
│     │ new GenericContainer('redis:7')        │             │
│     │   .withExposedPorts(6379)              │             │
│     │   .start()                             │             │
│     └────────────┬───────────────────────────┘             │
│                  ↓                                          │
│     Docker crea: redis_test_xyz789 → localhost:32769       │
│                                                             │
│  3. Configurar app para usar estos contenedores            │
│     ┌────────────────────────────────────────┐             │
│     │ process.env.DATABASE_URL =             │             │
│     │   `postgresql://localhost:32768/...`   │             │
│     │ process.env.REDIS_URL =                │             │
│     │   `redis://localhost:32769`            │             │
│     └────────────┬───────────────────────────┘             │
│                  ↓                                          │
│  4. const app = require('../index.js')                     │
│     └─→ App se conecta a los contenedores de test          │
│                                                             │
│  5. Tests ejecutan con Supertest                           │
│     ┌────────────────────────────────────────┐             │
│     │ await request(app)                     │             │
│     │   .get('/api/stats')                   │             │
│     │   .expect(200)                         │             │
│     └────────────────────────────────────────┘             │
│                                                             │
│  6. afterAll() - Testcontainers limpia todo                │
│     └─→ Detiene y elimina contenedores automáticamente     │
└─────────────────────────────────────────────────────────────┘
```

### 📝 Ejemplo Real: Escenario 1 (Auth Flow)

```javascript
// auth-flow.integration.test.js
const request = require("supertest");
const { GenericContainer } = require("testcontainers");
const { Pool } = require("pg");
const redis = require("redis");

describe("Integration Tests - Auth Service", () => {
  let app;
  let pgContainer;
  let redisContainer;
  let pgPool;
  let redisClient;

  beforeAll(async () => {
    // 1. Testcontainers levanta PostgreSQL (puerto aleatorio)
    pgContainer = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_USER: "testuser",
        POSTGRES_PASSWORD: "testpass",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .start();

    const pgPort = pgContainer.getMappedPort(5432);
    console.log(`✅ PostgreSQL en puerto ${pgPort}`);

    // 2. Testcontainers levanta Redis (puerto aleatorio)
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .start();

    const redisPort = redisContainer.getMappedPort(6379);
    console.log(`✅ Redis en puerto ${redisPort}`);

    // 3. Conectar a los contenedores temporales
    pgPool = new Pool({
      host: "localhost",
      port: pgPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    // 4. Crear schema de la BD
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      );
    `);

    // 5. Configurar variables de entorno para la app
    process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
    process.env.REDIS_URL = `redis://localhost:${redisPort}`;
    process.env.JWT_SECRET = "test-secret";

    // 6. Cargar la aplicación (se conecta a contenedores de test)
    app = require("../index");

    console.log("✅ Setup completo - App lista");
  }, 180000); // 3 minutos timeout

  afterAll(async () => {
    // 7. Limpieza automática
    await pgPool.end();
    await pgContainer.stop();
    await redisContainer.stop();
    console.log("✅ Contenedores detenidos");
  });

  // 8. Tests usan la app con BD y Redis reales
  test("should register new user in PostgreSQL", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);

    // Verificar que se guardó en PostgreSQL
    const result = await pgPool.query(
      "SELECT * FROM users WHERE username = $1",
      ["testuser"]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe("test@example.com");
  });

  test("should login and save session in Redis", async () => {
    // Primero registrar
    await request(app).post("/api/auth/register").send({
      username: "user2",
      email: "user2@example.com",
      password: "pass123",
    });

    // Luego hacer login
    const loginResponse = await request(app).post("/api/auth/login").send({
      username: "user2",
      password: "pass123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty("token");

    // Verificar que hay algo en Redis (ejemplo simplificado)
    const keys = await redisClient.keys("session:*");
    expect(keys.length).toBeGreaterThan(0);
  });
});
```

### ⚡ Características

- **Velocidad**: 5-15 segundos por suite (incluye setup)
- **Dependencias**: Docker instalado localmente
- **Aislamiento**: Cada ejecución usa contenedores limpios
- **Limpieza**: Automática (Testcontainers lo hace)
- **Puertos**: Aleatorios (no hay conflictos)

### 📦 Escenarios Implementados

#### ✅ Escenario 1: Auth Flow (`services/auth/integration/`)

- Testcontainers: PostgreSQL + Redis
- Tests: Registro, Login, Verificación de token
- Puertos: Aleatorios (ej. 32768, 32769)

#### ✅ Escenario 2: CRUD con JWT (`services/auth/integration/`)

- Testcontainers: PostgreSQL + Redis
- Tests: Crear/Leer/Actualizar/Eliminar personas con JWT

#### ✅ Escenario 3: NLP Queries (`services/auth/integration/`)

- Testcontainers: PostgreSQL
- Mock: Gemini API
- Tests: Consultas en lenguaje natural

#### ✅ Escenario 4: Service Registry (`services/registry/integration/`)

- **SIN Testcontainers** (registry usa memoria)
- Tests: Registro, Discovery, Health checks, Load balancing

#### ✅ Escenario 5: Cache Search (`services/consulta/integration/`)

- Testcontainers: PostgreSQL + Redis
- Tests: Cache miss/hit, TTL, Invalidation, Performance
- **Resultado**: 14/16 tests passing (87.5%)

---

## Comparación de Estrategias

| Aspecto              | Unitarios     | Integración sin Testcontainers | Integración con Testcontainers    |
| -------------------- | ------------- | ------------------------------ | --------------------------------- |
| **Velocidad**        | ⚡⚡⚡ < 1s   | ⚡⚡ 2-10s                     | ⚡ 5-15s                          |
| **Setup previo**     | Ninguno       | `docker compose up -d`         | Ninguno                           |
| **Aislamiento**      | ✅ Total      | ❌ Compartido                  | ✅ Total                          |
| **Limpieza**         | ✅ Automática | ❌ Manual                      | ✅ Automática                     |
| **BD Real**          | ❌ Mocks      | ✅ Sí                          | ✅ Sí                             |
| **Servicios reales** | ❌ Mocks      | ✅ Sí                          | ⚠️ Solo BD/Redis                  |
| **Ejecución**        | Local         | Local → Docker                 | Local (app) + Testcontainers (BD) |
| **Cobertura**        | 90-100%       | 70-85%                         | 80-95%                            |
| **Dificultad**       | 🟢 Fácil      | 🟡 Media                       | 🟠 Alta                           |

---

## Cuándo Usar Cada Estrategia

### ✅ Tests Unitarios

**Usar cuando**:

- Testeando funciones puras (sin I/O)
- Validando lógica de negocio aislada
- Buscando alta cobertura (90-100%)
- Necesitas feedback rápido (< 1s)

**Ejemplos**:

- Middleware de autenticación
- Validación de schemas Joi
- Generación de JWT
- Procesamiento de imágenes
- Helpers y utilidades

### ✅ Integración sin Testcontainers

**Usar cuando**:

- Testeando flujo completo entre microservicios
- Quieres ambiente idéntico a producción
- Los servicios ya están levantados en Docker
- No te importa limpiar datos manualmente

**Ejemplos**:

- Tests end-to-end completos
- Smoke tests en staging
- Tests de performance con carga real

### ✅ Integración con Testcontainers

**Usar cuando**:

- Necesitas BD real pero tests aislados
- Quieres limpieza automática
- Ejecutas tests en CI/CD
- Testeando lógica de cache (Redis)
- Testeando queries complejas de SQL

**Ejemplos**:

- Escenario 1: Auth Flow (PostgreSQL + Redis)
- Escenario 5: Cache Search (PostgreSQL + Redis)
- Tests de migraciones de BD
- Tests de transacciones

---

## Comandos de Ejecución

### Tests Unitarios (POR HACER)

```bash
# Backend (Node.js + Jest)
cd services/auth
npm test                           # Todos los tests unitarios
npm run test:unit                  # Solo unitarios
npm run test:unit -- --coverage   # Con cobertura

# Frontend (Python + Pytest)
cd frontend
pytest tests/unit/                 # Tests unitarios de Flask
pytest --cov=app tests/unit/       # Con cobertura

# Frontend (JavaScript + Jest)
cd frontend/static
npm test                           # Tests de JS (NotificationManager, etc.)
```

### Tests de Integración SIN Testcontainers

```bash
# 1. Levantar servicios
docker compose -f docker-compose.dev.yml up -d

# 2. Esperar que estén listos (10-30 segundos)
sleep 30

# 3. Ejecutar tests
cd services/auth
npm run test:integration

# 4. Limpiar (opcional)
docker compose -f docker-compose.dev.yml down -v
```

### Tests de Integración CON Testcontainers (ACTUAL)

```bash
# Escenarios 1, 2, 3 (en services/auth/)
cd services/auth
./test-integration.sh                    # Ejecutar todos
./test-integration.sh auth-flow          # Solo Escenario 1
./test-integration.sh personas-crud      # Solo Escenario 2
./test-integration.sh nlp-query          # Solo Escenario 3

# Escenario 4 (Service Registry)
cd services/registry
./test-integration.sh

# Escenario 5 (Cache Search)
cd services/consulta
./test-integration.sh
```

### Configuración de Scripts

Cada `test-integration.sh` tiene la configuración:

```bash
# Por defecto: ejecución LOCAL (necesario para Testcontainers)
USE_DOCKER=${USE_DOCKER:=0}

# Si quieres forzar Docker (solo para Escenario 4):
export USE_DOCKER=1
./test-integration.sh
```

---

## 🎯 Respuesta Directa a tu Pregunta

> "Tengo entendido que los test hay que ejecutarlos localmente, pero se deben hacer las peticiones a los docker que estan corriendo los modulos, es asi?"

**Respuesta corta**: Depende de la estrategia 😊

### Estrategia 1: Tests Unitarios

```
Tu máquina (tests) → Funciones con MOCKS
❌ NO usa Docker en absoluto
```

### Estrategia 2: Integración tradicional (NO usada actualmente)

```
Tu máquina (tests) → HTTP → Servicios en Docker
✅ Tests locales, servicios en Docker
📝 Requiere: docker compose up -d antes de ejecutar
```

### Estrategia 3: Testcontainers (ESTRATEGIA ACTUAL)

```
Tu máquina (tests + app) → PostgreSQL/Redis en Testcontainers
✅ Tests locales
✅ App corre localmente (require('../index.js'))
✅ Solo BD/Redis en contenedores temporales
📝 NO requiere docker compose up
```

### Entonces, ¿qué hemos implementado?

**Para Escenarios 1-5 de Integración**: Usamos **Testcontainers**

1. ✅ Tests se ejecutan en **tu máquina** (localmente)
2. ✅ La **aplicación** (index.js) también corre localmente
3. ✅ Solo **PostgreSQL y Redis** corren en contenedores (Testcontainers los crea)
4. ❌ NO necesitas hacer `docker compose up` antes
5. ❌ NO haces peticiones HTTP a servicios en Docker

**Código real**:

```javascript
// Test corre localmente
beforeAll(async () => {
  // Testcontainers crea PostgreSQL (puerto aleatorio)
  pgContainer = await new GenericContainer("postgres:15").start();
  pgPort = pgContainer.getMappedPort(5432);

  // Configurar app para usar ese PostgreSQL
  process.env.DATABASE_URL = `postgresql://localhost:${pgPort}/testdb`;

  // Cargar app LOCALMENTE (no en Docker)
  app = require("../index"); // ← App corre en tu máquina
});

test("should work", async () => {
  // Supertest hace peticiones a la app LOCAL
  const response = await request(app) // ← No es HTTP a Docker
    .post("/api/auth/register")
    .send({ username: "test" });

  // La app internamente consulta PostgreSQL en Testcontainer
  expect(response.status).toBe(201);
});
```

---

## 📚 Referencias

- [Testcontainers Documentation](https://node.testcontainers.org/)
- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
