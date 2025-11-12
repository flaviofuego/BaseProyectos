# 🎬 Flujo de Ejecución: Tests de Integración con Testcontainers

## Paso a Paso - Escenario 5 (Cache Search)

### ⏱️ Timeline de Ejecución

```
┌────────────────────────────────────────────────────────────────────┐
│ MINUTO 0:00 - Ejecutas: npm run test:integration                  │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:01 - Jest inicia y ejecuta beforeAll()                          │
│                                                                    │
│  console.log('🚀 Starting Integration Tests: Cache Layer...')    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:02 - Testcontainers levanta PostgreSQL                          │
│                                                                    │
│  pgContainer = await new GenericContainer('postgres:15-alpine')   │
│    .withEnvironment({ POSTGRES_USER: 'testuser', ... })           │
│    .withExposedPorts(5432)                                        │
│    .start(); // ← Aquí Docker crea el contenedor                 │
│                                                                    │
│  🐳 Docker ejecuta:                                               │
│     docker run -d -p 32804:5432 postgres:15-alpine               │
│                                                                    │
│  pgPort = 32804 (puerto aleatorio asignado por Docker)           │
│  console.log(`✅ PostgreSQL started on port 32804`)              │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:03 - Testcontainers levanta Redis                               │
│                                                                    │
│  redisContainer = await new GenericContainer('redis:7-alpine')    │
│    .withExposedPorts(6379)                                        │
│    .start();                                                      │
│                                                                    │
│  🐳 Docker ejecuta:                                               │
│     docker run -d -p 32805:6379 redis:7-alpine                   │
│                                                                    │
│  redisPort = 32805 (puerto aleatorio)                            │
│  console.log(`✅ Redis started on port 32805`)                   │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:04 - Crear conexión a PostgreSQL                                │
│                                                                    │
│  pgPool = new Pool({                                              │
│    host: 'localhost',                                             │
│    port: 32804, // ← Puerto del Testcontainer                    │
│    user: 'testuser',                                              │
│    password: 'testpass',                                          │
│    database: 'testdb'                                             │
│  });                                                              │
│                                                                    │
│  // Crear schema                                                  │
│  await pgPool.query(`                                             │
│    CREATE TABLE IF NOT EXISTS personas (                          │
│      id SERIAL PRIMARY KEY,                                       │
│      nombre VARCHAR(100),                                         │
│      ...                                                          │
│    );                                                             │
│  `);                                                              │
│                                                                    │
│  console.log('✅ PostgreSQL connection verified')                │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:05 - Insertar datos de prueba                                   │
│                                                                    │
│  await pgPool.query(`                                             │
│    INSERT INTO personas (nombre, apellido, tipo_documento, ...)   │
│    VALUES ('Juan', 'Pérez', 'DNI', '12345678'),                  │
│           ('María', 'García', 'DNI', '87654321'),                │
│           ...                                                     │
│  `);                                                              │
│                                                                    │
│  console.log('✅ Test data inserted')                            │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:06 - Conectar a Redis                                           │
│                                                                    │
│  redisClient = redis.createClient({                               │
│    socket: {                                                      │
│      host: 'localhost',                                           │
│      port: 32805 // ← Puerto del Testcontainer                   │
│    }                                                              │
│  });                                                              │
│                                                                    │
│  await redisClient.connect();                                     │
│  console.log('✅ Redis client connected')                        │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:07 - Configurar variables de entorno                            │
│                                                                    │
│  process.env.DATABASE_URL =                                       │
│    `postgresql://testuser:testpass@localhost:32804/testdb`;      │
│                                                                    │
│  process.env.REDIS_URL = `redis://localhost:32805`;              │
│                                                                    │
│  process.env.NODE_ENV = 'test';                                   │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:08 - Cargar la aplicación (CORRE EN TU MÁQUINA)                │
│                                                                    │
│  consultaApp = require('../index.js');                            │
│  //                     ↑                                         │
│  //                     └─ Este archivo corre LOCALMENTE          │
│  //                        NO en Docker                           │
│                                                                    │
│  // Cuando index.js se ejecuta:                                   │
│  const pool = new Pool({                                          │
│    connectionString: process.env.DATABASE_URL                     │
│    // ← Se conecta al PostgreSQL de Testcontainer (puerto 32804) │
│  });                                                              │
│                                                                    │
│  const redisClient = redis.createClient({                         │
│    url: process.env.REDIS_URL                                     │
│    // ← Se conecta al Redis de Testcontainer (puerto 32805)      │
│  });                                                              │
│                                                                    │
│  console.log('🚀 Starting Consulta Service...')                  │
│  // NOTA: NO ejecuta app.listen() porque está en modo test       │
│  module.exports = app; // ← Exporta la app para Supertest        │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:09 - Setup completo ✅                                          │
│                                                                    │
│  console.log('✅ Setup complete!')                               │
│                                                                    │
│  Estado actual:                                                   │
│  ✓ PostgreSQL corriendo (puerto 32804)                           │
│  ✓ Redis corriendo (puerto 32805)                                │
│  ✓ Tabla personas creada con 5 registros                         │
│  ✓ App cargada (conectada a Testcontainers)                      │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:10 - Ejecutar Test #1: Health Check                            │
│                                                                    │
│  test('should return healthy status', async () => {               │
│    const response = await request(consultaApp) // ← En memoria   │
│      .get('/health')                                              │
│      .expect(200);                                                │
│                                                                    │
│    // Supertest NO hace HTTP real, llama directamente a app      │
│    // consultaApp.handle(request) ← Así internamente             │
│                                                                    │
│    expect(response.body.ready).toBe(true);                        │
│  });                                                              │
│                                                                    │
│  ✅ Test passed (2ms)                                            │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:11 - Ejecutar Test #2: Cache Miss                              │
│                                                                    │
│  test('should fetch from PostgreSQL (cache miss)', async () => {  │
│    await redisClient.del('consulta:stats:{}'); // Limpiar cache  │
│                                                                    │
│    const response = await request(consultaApp)                    │
│      .get('/stats')                                               │
│      .expect(200);                                                │
│                                                                    │
│    // Internamente la app ejecuta:                                │
│    // 1. Buscar en Redis → NO encontrado                         │
│    // 2. Query a PostgreSQL (puerto 32804):                      │
│    //    SELECT COUNT(*) FROM personas                           │
│    // 3. Guardar resultado en Redis                              │
│    // 4. Devolver respuesta con _cache: false                    │
│                                                                    │
│    expect(response.body._cache).toBe(false);                      │
│    expect(response.body.total_personas).toBe(5);                  │
│  });                                                              │
│                                                                    │
│  ✅ Test passed (50ms) ← Tiempo de query a PostgreSQL           │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:12 - Ejecutar Test #3: Cache Hit                               │
│                                                                    │
│  test('should fetch from Redis (cache hit)', async () => {        │
│    // Primera llamada (ya ejecutada en test anterior)             │
│                                                                    │
│    // Segunda llamada                                             │
│    const response = await request(consultaApp)                    │
│      .get('/stats')                                               │
│      .expect(200);                                                │
│                                                                    │
│    // Internamente la app ejecuta:                                │
│    // 1. Buscar en Redis → ✅ ENCONTRADO                         │
│    // 2. NO query a PostgreSQL                                    │
│    // 3. Devolver respuesta con _cache: true                     │
│                                                                    │
│    expect(response.body._cache).toBe(true);                       │
│    expect(response.body.total_personas).toBe(5);                  │
│  });                                                              │
│                                                                    │
│  ✅ Test passed (3ms) ← 10-50x más rápido desde cache           │
└────────────────────────────────────────────────────────────────────┘
                                ↓
          ... (14 tests más) ...
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:25 - Todos los tests completados                               │
│                                                                    │
│  Test Suites: 1 passed, 1 total                                   │
│  Tests:       14 passed, 2 failed, 16 total                       │
│  Time:        14.844s                                             │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:26 - afterAll() - Limpieza                                     │
│                                                                    │
│  console.log('🧹 Cleaning up...')                                │
│                                                                    │
│  // Cerrar conexiones                                             │
│  await redisClient.quit();                                        │
│  console.log('✅ Redis client disconnected')                     │
│                                                                    │
│  await pgPool.end();                                              │
│  console.log('✅ PostgreSQL pool closed')                        │
│                                                                    │
│  // Testcontainers detiene y elimina contenedores                │
│  await redisContainer.stop();                                     │
│  console.log('✅ Redis container stopped')                       │
│                                                                    │
│  await pgContainer.stop();                                        │
│  console.log('✅ PostgreSQL container stopped')                  │
│                                                                    │
│  // Docker ejecuta:                                               │
│  // docker stop <container_id>                                    │
│  // docker rm <container_id>                                      │
│                                                                    │
│  console.log('✅ Cleanup complete!')                             │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│ 0:27 - FIN                                                        │
│                                                                    │
│  Estado del sistema:                                              │
│  ✓ Contenedores eliminados (NO quedan procesos)                  │
│  ✓ Puertos liberados (32804, 32805 disponibles)                  │
│  ✓ No quedan datos sucios                                        │
│  ✓ Sistema listo para próxima ejecución                          │
└────────────────────────────────────────────────────────────────────┘
```

## 🔍 Aclaraciones Importantes

### ❓ ¿Dónde corre la aplicación (index.js)?

```
❌ NO aquí:
┌────────────────┐
│  Docker Engine │
│  🐳            │  ← La app NO corre aquí
└────────────────┘

✅ Corre aquí:
┌────────────────┐
│ Tu Máquina     │
│ (Node.js)      │  ← index.js ejecuta en tu máquina
│                │
│  require()     │
│    ↓           │
│  index.js      │
└────────────────┘
```

### ❓ ¿Cómo se conecta la app a la BD?

```
┌──────────────────────────────────────────────────────┐
│  Tu Máquina                                          │
│                                                      │
│  ┌────────────────────────────────────┐             │
│  │  index.js (Node.js)                │             │
│  │                                    │             │
│  │  const pool = new Pool({           │             │
│  │    host: 'localhost',   ←────────┐ │             │
│  │    port: 32804          ←────┐   │ │             │
│  │  });                         │   │ │             │
│  └──────────────────────────────┼───┼─┘             │
│                                 │   │               │
│  ┌──────────────────────────────┼───┼─┐             │
│  │  Docker Engine               │   │ │             │
│  │                              │   │ │             │
│  │  ┌────────────────────────┐  │   │ │             │
│  │  │ PostgreSQL Container   │  │   │ │             │
│  │  │ Port: 32804 ←──────────┘   │ │ │             │
│  │  └────────────────────────┘    │ │               │
│  │                                 │ │               │
│  │  ┌────────────────────────┐    │ │               │
│  │  │ Redis Container        │    │ │               │
│  │  │ Port: 32805 ←──────────────┘ │               │
│  │  └────────────────────────┘      │               │
│  └──────────────────────────────────┘               │
└──────────────────────────────────────────────────────┘

Conexión: TCP Socket (localhost:32804)
         ↑
         └─ NO es HTTP, es protocolo de PostgreSQL
```

### ❓ ¿Cómo hace Supertest las peticiones?

```
❌ NO hace esto (HTTP real):
┌────────────┐   HTTP    ┌────────────┐
│ Test       │ ────────→ │ localhost  │
│ (Supertest)│   :3003   │ :3003      │
└────────────┘           └────────────┘

✅ Hace esto (llamada directa):
┌────────────┐           ┌────────────┐
│ Test       │  require  │ index.js   │
│ (Supertest)│ ────────→ │ (app obj)  │
│            │           │            │
│ request(app) ←─────────┘            │
│   .get('/stats') ← Llamada directa │
└────────────┘                        │
                                      │
                        app.handle(req, res)
                                ↓
                        Express Router
                                ↓
                        Controller
                                ↓
                        PostgreSQL Query
```

### ❓ ¿Por qué NO puedo correr esto dentro de Docker?

```
Si intentaras correr el test DENTRO de Docker:

┌─────────────────────────────────────────────────────┐
│  Docker Container (test-runner)                     │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  npm run test:integration                  │    │
│  │                                            │    │
│  │  new GenericContainer('postgres')          │    │
│  │    .start() ← ¿Cómo crear otro container? │    │
│  │                                            │    │
│  │  ❌ Problema: Necesita acceso al Docker    │    │
│  │     daemon para crear contenedores         │    │
│  │                                            │    │
│  │  Solución: Docker-in-Docker (DinD)         │    │
│  │  ⚠️  Complejo, lento, problemas de permisos│    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘

Por eso configuramos: USE_DOCKER=0 (ejecutar localmente)
```

## 🎯 Resumen Final

### Lo que SÍ sucede:

1. ✅ Tests corren en **tu máquina** (localmente)
2. ✅ `index.js` corre en **tu máquina** (via `require()`)
3. ✅ PostgreSQL corre en **Docker** (Testcontainer)
4. ✅ Redis corre en **Docker** (Testcontainer)
5. ✅ Supertest hace **llamadas directas** a `app` (no HTTP)
6. ✅ `app` hace **queries TCP** a PostgreSQL/Redis en Docker

### Lo que NO sucede:

1. ❌ Tests NO corren dentro de Docker
2. ❌ `index.js` NO corre dentro de Docker
3. ❌ NO necesitas `docker compose up -d`
4. ❌ NO haces peticiones HTTP a servicios en Docker
5. ❌ NO usas los servicios de docker-compose.dev.yml

### Ventajas de este approach:

- ⚡ Rápido setup (3-5 segundos)
- 🔒 Aislamiento total (puertos aleatorios)
- 🧹 Limpieza automática
- 🔄 Repetible (siempre empiezas limpio)
- 🚀 Fácil de ejecutar en CI/CD
- 💻 Fácil de debugear (Node.js local)
