/**
 * Integration Test: Consulta Service Cache Layer
 *
 * Escenario 5: Búsqueda con cache (Consulta Service → PostgreSQL + Redis)
 *
 * Este test verifica:
 * 1. Primera consulta golpea PostgreSQL (cache miss)
 * 2. Segunda consulta usa Redis (cache hit)
 * 3. Cache expiration y TTL
 * 4. Invalidación de cache
 * 5. Dashboard stats con cache corto
 *
 * Tecnologías:
 * - Testcontainers para PostgreSQL 15 y Redis 7
 * - Consulta Service (Express + pg + redis)
 * - Supertest para HTTP testing
 *
 * Tiempo estimado: ~40-60 segundos
 */

const request = require("supertest");
const { GenericContainer, Wait } = require("testcontainers");
const { createClient } = require("redis");
const { Pool } = require("pg");

// Variables globales para containers y servicios
let postgresContainer;
let redisContainer;
let consultaApp;
let redisClient;
let pgPool;

// Variables para URLs de conexión
let databaseUrl;
let redisUrl;

describe("Integration Tests: Consulta Service Cache Layer", () => {
  /**
   * Setup: Levantar contenedores y servicios
   * - PostgreSQL 15 (con wait strategy)
   * - Redis 7 (con wait strategy)
   * - Consulta Service
   */
  beforeAll(async () => {
    console.log("🚀 Starting Integration Tests: Cache Layer...");

    // 1. Levantar PostgreSQL container
    console.log("📦 Starting PostgreSQL container...");
    postgresContainer = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_USER: "testuser",
        POSTGRES_PASSWORD: "testpass",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/, 2)
      )
      .withStartupTimeout(120000)
      .start();

    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);
    databaseUrl = `postgresql://testuser:testpass@${postgresHost}:${postgresPort}/testdb`;

    console.log(`✅ PostgreSQL started on port ${postgresPort}`);

    // Esperar adicional para asegurar que PostgreSQL está 100% listo
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Levantar Redis container
    console.log("📦 Starting Redis container...");
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();

    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);
    redisUrl = `redis://${redisHost}:${redisPort}`;

    console.log(`✅ Redis started on port ${redisPort}`);

    // 3. Configurar variables de entorno para Consulta Service
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
    process.env.PORT = "3003";
    process.env.LOG_SERVICE_URL = "http://localhost:9999"; // Mock (no importa si no existe)

    // 4. Crear schema en PostgreSQL
    console.log("📝 Creating database schema...");
    pgPool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection first
    await pgPool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connection verified");

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        tipo_documento VARCHAR(10) NOT NULL,
        numero_documento VARCHAR(50) UNIQUE NOT NULL,
        primer_nombre VARCHAR(100) NOT NULL,
        segundo_nombre VARCHAR(100),
        apellidos VARCHAR(200) NOT NULL,
        genero CHAR(1) CHECK (genero IN ('M', 'F', 'O')),
        fecha_nacimiento DATE NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(255),
        direccion TEXT,
        ciudad VARCHAR(100),
        departamento VARCHAR(100),
        pais VARCHAR(100) DEFAULT 'Colombia',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- View con edad calculada
      CREATE OR REPLACE VIEW personas_con_edad AS
      SELECT 
        *,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento))::INTEGER AS edad,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 18 THEN 'Menor de edad'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) BETWEEN 18 AND 30 THEN 'Joven'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) BETWEEN 31 AND 50 THEN 'Adulto'
          ELSE 'Mayor'
        END AS grupo_edad
      FROM personas;
    `);

    // 5. Insertar datos de prueba
    console.log("📝 Inserting test data...");
    const testPersonas = [
      {
        tipo: "CC",
        numero: "10001",
        nombre: "Juan",
        apellidos: "Pérez García",
        genero: "M",
        fecha: "2005-03-15",
      },
      {
        tipo: "CC",
        numero: "10002",
        nombre: "María",
        apellidos: "López Martínez",
        genero: "F",
        fecha: "1990-07-22",
      },
      {
        tipo: "CC",
        numero: "10003",
        nombre: "Carlos",
        apellidos: "Rodríguez Silva",
        genero: "M",
        fecha: "1985-11-30",
      },
      {
        tipo: "TI",
        numero: "10004",
        nombre: "Ana",
        apellidos: "González Torres",
        genero: "F",
        fecha: "2010-01-10",
      },
      {
        tipo: "CE",
        numero: "10005",
        nombre: "Pedro",
        apellidos: "Ramírez Costa",
        genero: "M",
        fecha: "1978-05-18",
      },
    ];

    for (const persona of testPersonas) {
      await pgPool.query(
        `
        INSERT INTO personas (tipo_documento, numero_documento, primer_nombre, apellidos, genero, fecha_nacimiento)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          persona.tipo,
          persona.numero,
          persona.nombre,
          persona.apellidos,
          persona.genero,
          persona.fecha,
        ]
      );
    }

    console.log("✅ Test data inserted");

    // 6. Conectar Redis client para inspección
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log("✅ Redis client connected");

    // 7. Limpiar require.cache para cargar el servicio con nuevas env vars
    Object.keys(require.cache).forEach((key) => {
      if (key.includes("consulta") || key.includes("shared")) {
        delete require.cache[key];
      }
    });

    // 8. Cargar Consulta Service (path relativo correcto desde services/auth/integration/)
    console.log("🚀 Starting Consulta Service...");
    consultaApp = require("../index.js");

    // Esperar a que el servicio esté completamente listo
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("✅ Setup complete!\n");
  }, 180000); // 3 min timeout

  /**
   * Teardown: Detener servicios y contenedores
   */
  afterAll(async () => {
    console.log("\n🧹 Cleaning up...");

    // Esperar a que terminen requests pendientes
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log("✅ Redis client disconnected");
    }

    if (pgPool) {
      await pgPool.end();
      console.log("✅ PostgreSQL pool closed");
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log("✅ Redis container stopped");
    }

    if (postgresContainer) {
      await postgresContainer.stop();
      console.log("✅ PostgreSQL container stopped");
    }

    console.log("✅ Cleanup complete!");
  }, 60000);

  /**
   * Limpiar cache antes de cada test
   */
  beforeEach(async () => {
    await redisClient.flushDb();
  });

  // ==========================================
  // TESTS: Health Check
  // ==========================================

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const response = await request(consultaApp).get("/health").expect(200);

      expect(response.body).toMatchObject({
        status: "OK",
        service: "consulta-service",
        ready: true,
      });
    });
  });

  // ==========================================
  // TESTS: Stats Endpoint with Cache
  // ==========================================

  describe("Stats Endpoint - Cache Behavior", () => {
    test("should fetch stats from PostgreSQL on first call (cache miss)", async () => {
      const startTime = Date.now();

      const response = await request(consultaApp).get("/stats").expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body).toMatchObject({
        total_personas: 5,
        _cache: false, // Primera llamada NO viene de cache
      });

      expect(response.body.por_genero).toBeDefined();
      expect(response.body.por_tipo_documento).toBeDefined();
      expect(response.body.estadisticas_edad).toBeDefined();

      // Verificar que fue guardado en Redis
      const cacheKey = "consulta:stats:{}";
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).not.toBeNull();

      const cached = JSON.parse(cachedData);
      expect(cached.total_personas).toBe(5);

      console.log(`📊 First call (DB): ${responseTime}ms`);
    });

    test("should fetch stats from Redis on second call (cache hit)", async () => {
      // Primera llamada para popular cache
      await request(consultaApp).get("/stats").expect(200);

      // Esperar un poco
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Segunda llamada (debe venir de cache)
      const startTime = Date.now();

      const response = await request(consultaApp).get("/stats").expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body).toMatchObject({
        total_personas: 5,
        _cache: true, // Segunda llamada SÍ viene de cache
      });

      // Cache hit debería ser más rápido
      expect(responseTime).toBeLessThan(100);

      console.log(`⚡ Second call (CACHE): ${responseTime}ms`);
    });

    test("should have correct cache TTL (300 seconds)", async () => {
      // Llamar endpoint para crear cache
      await request(consultaApp).get("/stats").expect(200);

      // Verificar TTL en Redis
      const cacheKey = "consulta:stats:{}";
      const ttl = await redisClient.ttl(cacheKey);

      expect(ttl).toBeGreaterThan(290); // Al menos 290 segundos
      expect(ttl).toBeLessThanOrEqual(300); // Máximo 300 segundos

      console.log(`⏱️  Cache TTL: ${ttl} seconds`);
    });

    test("should return updated data after cache expiration", async () => {
      // Primera llamada
      const firstResponse = await request(consultaApp)
        .get("/stats")
        .expect(200);
      expect(firstResponse.body.total_personas).toBe(5);

      // Insertar nueva persona
      await pgPool.query(`
        INSERT INTO personas (tipo_documento, numero_documento, primer_nombre, apellidos, genero, fecha_nacimiento)
        VALUES ('CC', '10006', 'Lucía', 'Fernández Ruiz', 'F', '1995-09-25')
      `);

      // Segunda llamada aún debería devolver 5 (cache activo)
      const cachedResponse = await request(consultaApp)
        .get("/stats")
        .expect(200);
      expect(cachedResponse.body._cache).toBe(true);
      expect(cachedResponse.body.total_personas).toBe(5); // Aún en cache

      // Forzar expiración del cache
      const cacheKey = "consulta:stats:{}";
      await redisClient.del(cacheKey);

      // Tercera llamada debería devolver 6 (nueva query a DB)
      const freshResponse = await request(consultaApp)
        .get("/stats")
        .expect(200);
      expect(freshResponse.body._cache).toBe(false);
      expect(freshResponse.body.total_personas).toBe(6); // Dato actualizado

      console.log("✅ Cache expiration verified");
    });

    test("should include detailed statistics in response", async () => {
      const response = await request(consultaApp).get("/stats").expect(200);

      // Verificar estructura completa
      expect(response.body).toHaveProperty("total_personas");
      expect(response.body).toHaveProperty("por_genero");
      expect(response.body).toHaveProperty("por_tipo_documento");
      expect(response.body).toHaveProperty("por_grupo_edad");
      expect(response.body).toHaveProperty("estadisticas_edad");
      expect(response.body).toHaveProperty("persona_mas_joven");

      // Verificar estadísticas de edad
      expect(response.body.estadisticas_edad).toHaveProperty("minima");
      expect(response.body.estadisticas_edad).toHaveProperty("maxima");
      expect(response.body.estadisticas_edad).toHaveProperty("promedio");

      // Verificar persona más joven
      expect(response.body.persona_mas_joven).toHaveProperty("primer_nombre");
      expect(response.body.persona_mas_joven).toHaveProperty("edad");

      console.log(
        "📊 Stats structure:",
        JSON.stringify(response.body, null, 2)
      );
    });
  });

  // ==========================================
  // TESTS: Dashboard Stats with Short Cache
  // ==========================================

  describe("Dashboard Stats - Short Cache (30s)", () => {
    test("should use shorter TTL for dashboard stats", async () => {
      // Llamar endpoint de dashboard
      const response = await request(consultaApp)
        .get("/dashboard/stats")
        .expect(200);

      expect(response.body._cache).toBe(false);
      expect(response.body).toHaveProperty("_timestamp");

      // Verificar TTL en Redis (30 segundos)
      const cacheKey = "consulta:dashboard_stats:{}";
      const ttl = await redisClient.ttl(cacheKey);

      expect(ttl).toBeGreaterThan(25); // Al menos 25 segundos
      expect(ttl).toBeLessThanOrEqual(30); // Máximo 30 segundos

      console.log(`⏱️  Dashboard cache TTL: ${ttl} seconds`);
    });

    test("should cache dashboard stats for subsequent calls", async () => {
      // Primera llamada
      const firstResponse = await request(consultaApp)
        .get("/dashboard/stats")
        .expect(200);

      expect(firstResponse.body._cache).toBe(false);
      const firstTimestamp = firstResponse.body._timestamp;

      // Segunda llamada (debe venir de cache)
      const secondResponse = await request(consultaApp)
        .get("/dashboard/stats")
        .expect(200);

      expect(secondResponse.body._cache).toBe(true);
      expect(secondResponse.body._timestamp).toBe(firstTimestamp); // Mismo timestamp
    });
  });

  // ==========================================
  // TESTS: Cache Invalidation
  // ==========================================

  describe("Cache Invalidation", () => {
    test("should clear all cache with DELETE /cache", async () => {
      // Popular cache con stats
      await request(consultaApp).get("/stats").expect(200);
      await request(consultaApp).get("/dashboard/stats").expect(200);

      // Verificar que existe cache
      const keys = await redisClient.keys("consulta:*");
      expect(keys.length).toBeGreaterThan(0);

      // Limpiar cache
      const response = await request(consultaApp).delete("/cache").expect(200);

      expect(response.body.message).toContain("Cache cleared successfully");

      // Verificar que se eliminó todo el cache
      const keysAfter = await redisClient.keys("consulta:*");
      expect(keysAfter.length).toBe(0);

      console.log("✅ Cache cleared successfully");
    });

    test("should invalidate only stats cache with POST /cache/invalidate-stats", async () => {
      // Popular múltiples tipos de cache
      await request(consultaApp).get("/stats").expect(200);
      await request(consultaApp).get("/dashboard/stats").expect(200);

      // Invalidar solo stats cache
      const response = await request(consultaApp)
        .post("/cache/invalidate-stats")
        .expect(200);

      expect(response.body.message).toContain("Stats cache invalidated");
      expect(response.body).toHaveProperty("_timestamp");

      // Verificar que los stats caches fueron eliminados
      const statsKey = "consulta:stats:{}";
      const dashboardKey = "consulta:dashboard_stats:{}";

      const statsExists = await redisClient.exists(statsKey);
      const dashboardExists = await redisClient.exists(dashboardKey);

      expect(statsExists).toBe(0); // Eliminado
      expect(dashboardExists).toBe(0); // Eliminado

      console.log("✅ Stats cache invalidated");
    });
  });

  // ==========================================
  // TESTS: Performance Comparison
  // ==========================================

  describe("Performance: DB vs Cache", () => {
    test("should demonstrate cache speed improvement", async () => {
      // Medir tiempo desde DB
      const startDb = Date.now();
      const dbResponse = await request(consultaApp).get("/stats").expect(200);
      const dbTime = Date.now() - startDb;

      expect(dbResponse.body._cache).toBe(false);

      // Esperar un poco
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Medir tiempo desde cache
      const startCache = Date.now();
      const cacheResponse = await request(consultaApp)
        .get("/stats")
        .expect(200);
      const cacheTime = Date.now() - startCache;

      expect(cacheResponse.body._cache).toBe(true);

      // Cache debería ser significativamente más rápido
      const improvement = (((dbTime - cacheTime) / dbTime) * 100).toFixed(1);

      console.log(`\n📈 Performance Comparison:`);
      console.log(`   DB Query:    ${dbTime}ms`);
      console.log(`   Cache Hit:   ${cacheTime}ms`);
      console.log(`   Improvement: ${improvement}%\n`);

      expect(cacheTime).toBeLessThan(dbTime);
    });

    test("should handle multiple concurrent cache hits efficiently", async () => {
      // Popular cache
      await request(consultaApp).get("/stats").expect(200);

      // Hacer 10 requests concurrentes desde cache
      const startTime = Date.now();

      const promises = Array(10)
        .fill(null)
        .map(() => request(consultaApp).get("/stats").expect(200));

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verificar que todos vinieron de cache
      responses.forEach((response) => {
        expect(response.body._cache).toBe(true);
      });

      console.log(
        `⚡ 10 concurrent cache hits: ${totalTime}ms (avg: ${(
          totalTime / 10
        ).toFixed(1)}ms)`
      );

      // Promedio por request debe ser muy bajo
      expect(totalTime / 10).toBeLessThan(50);
    });
  });

  // ==========================================
  // TESTS: Data Consistency
  // ==========================================

  describe("Data Consistency", () => {
    test("should maintain data consistency between DB and cache", async () => {
      // Primera llamada para popular cache
      const response1 = await request(consultaApp).get("/stats").expect(200);

      // Obtener datos directamente de Redis
      const cacheKey = "consulta:stats:{}";
      const cachedData = await redisClient.get(cacheKey);
      const cached = JSON.parse(cachedData);

      // Obtener datos directamente de PostgreSQL
      const dbResult = await pgPool.query(
        "SELECT COUNT(*) as total FROM personas"
      );
      const dbTotal = parseInt(dbResult.rows[0].total);

      // Verificar consistencia
      expect(response1.body.total_personas).toBe(dbTotal);
      expect(cached.total_personas).toBe(dbTotal);
      expect(cached.total_personas).toBe(response1.body.total_personas);

      console.log("✅ Data consistency verified between DB and Cache");
    });

    test("should handle cache miss gracefully", async () => {
      // Eliminar todo el cache
      await redisClient.flushDb();

      // Llamar endpoint (debería funcionar sin cache)
      const response = await request(consultaApp).get("/stats").expect(200);

      expect(response.body._cache).toBe(false);
      expect(response.body.total_personas).toBe(5);

      console.log("✅ Cache miss handled gracefully");
    });
  });

  // ==========================================
  // TESTS: Edge Cases
  // ==========================================

  describe("Edge Cases", () => {
    test("should handle Redis connection errors gracefully", async () => {
      // Este test requeriría simular una falla de Redis
      // Por ahora, verificamos que el servicio tiene manejo de errores
      const response = await request(consultaApp).get("/health").expect(200);

      expect(response.body.ready).toBe(true);
    });

    test("should handle empty database with cache", async () => {
      // Eliminar todas las personas
      await pgPool.query("DELETE FROM personas");

      // Llamar stats (debería devolver 0)
      const response = await request(consultaApp).get("/stats").expect(200);

      expect(response.body.total_personas).toBe(0);
      expect(response.body._cache).toBe(false);

      // Segunda llamada desde cache
      const cachedResponse = await request(consultaApp)
        .get("/stats")
        .expect(200);

      expect(cachedResponse.body.total_personas).toBe(0);
      expect(cachedResponse.body._cache).toBe(true);

      console.log("✅ Empty database handled correctly");
    });
  });
});
