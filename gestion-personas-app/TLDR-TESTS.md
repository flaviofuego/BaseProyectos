# ⚡ TL;DR - Ejecución de Tests

## 🎯 Respuesta Ultra-Rápida

> **Pregunta**: "Los test hay que ejecutarlos localmente, pero se deben hacer las peticiones a los docker que estan corriendo los modulos, es asi?"

**Respuesta**: **DEPENDE** del tipo de test:

### 📊 Tabla Rápida

| Tipo de Test                 | Dónde Ejecuta | Servicios en Docker | HTTP a Docker | Testcontainers |
| ---------------------------- | ------------- | ------------------- | ------------- | -------------- |
| **Unitarios** (60%)          | ✅ Local      | ❌ No               | ❌ No         | ❌ No          |
| **Integración Actual** (15%) | ✅ Local      | ⚠️ Solo BD/Redis    | ❌ No         | ✅ Sí          |
| **Integración Tradicional**  | ✅ Local      | ✅ Todos            | ✅ Sí         | ❌ No          |

---

## 🚀 Lo que REALMENTE hicimos (Estrategia Actual)

### Escenarios 1-5 (Integración con Testcontainers)

```bash
# 1. Ejecutas (en tu máquina):
cd services/consulta
npm run test:integration

# 2. Lo que sucede:
# ✅ Test corre en TU MÁQUINA (Node.js local)
# ✅ index.js corre en TU MÁQUINA (require('../index.js'))
# ✅ Testcontainers levanta PostgreSQL en DOCKER (puerto aleatorio)
# ✅ Testcontainers levanta Redis en DOCKER (puerto aleatorio)
# ✅ index.js se conecta a esos contenedores (TCP, no HTTP)
# ✅ Supertest hace llamadas directas a app (no HTTP)
# ✅ Al terminar: Testcontainers limpia todo

# 3. NO necesitas hacer:
docker compose up -d  # ← NO es necesario
```

### Diagrama Mental

```
┌───────────────────────────────────┐
│   TU MÁQUINA (Windows/WSL)        │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  npm run test:integration   │  │
│  └──────────┬──────────────────┘  │
│             ↓                     │
│  ┌─────────────────────────────┐  │
│  │  Jest ejecuta test          │  │
│  └──────────┬──────────────────┘  │
│             ↓                     │
│  ┌─────────────────────────────┐  │
│  │  Testcontainers levanta:    │  │
│  │  - PostgreSQL (puerto 32768)│◀─┼─┐
│  │  - Redis (puerto 32769)     │◀─┼─┼─ Docker Engine
│  └──────────┬──────────────────┘  │ │
│             ↓                     │ │
│  ┌─────────────────────────────┐  │ │
│  │  require('../index.js')     │  │ │
│  │  ↓                          │  │ │
│  │  app corre AQUÍ (local)     │  │ │
│  │  ↓                          │  │ │
│  │  se conecta a PostgreSQL    │──┼─┘
│  │  se conecta a Redis         │──┼─┐
│  └──────────┬──────────────────┘  │ │
│             ↓                     │ │
│  ┌─────────────────────────────┐  │ │
│  │  request(app).get('/stats') │  │ │
│  │  ↓                          │  │ │
│  │  Llamada DIRECTA (no HTTP)  │  │ │
│  │  ↓                          │  │ │
│  │  app.query(PostgreSQL)      │──┼─┘
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

---

## 📝 Código Real Simplificado

### Test Unitario (60% - POR HACER)

```javascript
// NO usa Docker en absoluto
describe("Auth Middleware", () => {
  test("should reject invalid token", () => {
    const req = { headers: {} }; // Mock
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };

    verifyToken(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// Ejecutar: npm test
// Velocidad: < 1 segundo
```

### Test de Integración con Testcontainers (15% - HECHO)

```javascript
// Usa Testcontainers para BD
describe("Cache Search", () => {
  let app;
  let pgContainer;

  beforeAll(async () => {
    // 1. Levantar PostgreSQL en Docker
    pgContainer = await new GenericContainer("postgres:15")
      .withExposedPorts(5432)
      .start();

    const pgPort = pgContainer.getMappedPort(5432);

    // 2. Configurar app para usar ese PostgreSQL
    process.env.DATABASE_URL = `postgresql://localhost:${pgPort}/testdb`;

    // 3. Cargar app LOCALMENTE (no en Docker)
    app = require("../index");
  });

  test("should cache in Redis", async () => {
    // Supertest hace llamada DIRECTA a app
    const response = await request(app).get("/stats").expect(200);

    expect(response.body._cache).toBe(false);
  });

  afterAll(async () => {
    // 4. Limpieza automática
    await pgContainer.stop();
  });
});

// Ejecutar: ./test-integration.sh
// Velocidad: 10-15 segundos
```

### Test de Integración Tradicional (NO usado)

```javascript
// Requiere docker compose up -d ANTES
describe("End-to-End Flow", () => {
  test("should call service in Docker", async () => {
    // Petición HTTP real a servicio en Docker
    const response = await request("http://localhost:3001")
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    expect(response.status).toBe(200);
  });
});

// Ejecutar:
// 1. docker compose -f docker-compose.dev.yml up -d
// 2. npm run test:integration
// 3. docker compose down
// Velocidad: 20-60 segundos
```

---

## ✅ Checklist de Verificación

### ¿Cómo sé qué estrategia estoy usando?

**Testcontainers** (estrategia actual):

- ✅ Ves `new GenericContainer()` en el test
- ✅ Ves `require('../index.js')` en el test
- ✅ NO necesitas `docker compose up` antes
- ✅ Puertos aleatorios (32768, 32769, etc.)
- ✅ Script tiene `USE_DOCKER=0`

**Docker Compose** (NO usado actualmente):

- ✅ Haces peticiones HTTP a `localhost:300X`
- ✅ Necesitas `docker compose up -d` antes
- ✅ Puertos fijos (3001, 3002, 5432, 6379)
- ✅ NO ves `GenericContainer` en el test

**Mocks** (tests unitarios - por hacer):

- ✅ Funciones tienen `.mock()`, `jest.fn()`
- ✅ NO ves `require('testcontainers')`
- ✅ NO ves conexiones de BD
- ✅ Velocidad < 1 segundo

---

## 🎬 Comandos Rápidos

### Tests Actuales (Integración con Testcontainers)

```bash
# Escenario 1-3: Auth, CRUD, NLP
cd services/auth
./test-integration.sh

# Escenario 4: Service Registry
cd services/registry
./test-integration.sh

# Escenario 5: Cache Search
cd services/consulta
./test-integration.sh
```

### Tests Unitarios (Por Hacer)

```bash
# Backend
cd services/auth
npm test

# Frontend Python
cd frontend
pytest tests/unit/

# Frontend JavaScript
cd frontend/static
npm test
```

---

## 🔍 Debugging

### Si quieres ver qué contenedores crea Testcontainers:

```bash
# Durante la ejecución del test, en otra terminal:
docker ps

# Verás algo como:
# CONTAINER ID   IMAGE             PORTS
# abc123def456   postgres:15       0.0.0.0:32768->5432/tcp
# 789ghi012jkl   redis:7           0.0.0.0:32769->6379/tcp
```

### Si quieres ver logs del contenedor:

```bash
# Mientras el test corre:
docker logs <container_id>
```

### Si quieres conectarte a la BD del test:

```bash
# Mientras el test corre (pausa con debugger):
psql postgresql://testuser:testpass@localhost:32768/testdb
```

---

## 📚 Documentación Completa

Para más detalles, ver:

- `ARQUITECTURA-TESTS.md` - Explicación completa de estrategias
- `FLUJO-EJECUCION-TESTS.md` - Timeline detallado
- `INTEGRATION-TESTS.md` - Documentación de escenarios 1-5
- `services/consulta/integration/TEST-RESULTS.md` - Resultados Escenario 5
