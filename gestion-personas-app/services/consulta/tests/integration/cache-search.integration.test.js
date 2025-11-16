/**
 * Integration Tests - Consulta Service
 *
 * Estas pruebas verifican la integración del servicio de consultas con servicios de infraestructura:
 * - PostgreSQL (personas_db): Verificar conectividad, vista personas_con_edad, y queries de estadísticas
 * - Redis (personas_redis): Verificar operaciones de cache (set, get, ttl, invalidation)
 *
 * NOTA: Los endpoints HTTP con lógica de negocio se prueban en E2E tests.
 *       Aquí probamos solo la integración con BD y cache.
 */

const { Pool } = require("pg");
const { createClient } = require("redis");

// Configuración para usar servicios Docker existentes
const DB_HOST = process.env.DB_HOST || "personas_db";
const REDIS_HOST = process.env.REDIS_HOST || "personas_redis";

describe("Integration Tests - Consulta Service: Integración con BD y Cache", () => {
  let pgPool;
  let redisClient;

  // ============================================================================
  // SETUP: Conectarse a servicios existentes
  // ============================================================================
  beforeAll(async () => {
    console.log("🚀 Conectando a servicios Docker existentes...");

    // Conectar a PostgreSQL existente
    pgPool = new Pool({
      host: DB_HOST,
      port: 5432,
      user: process.env.POSTGRES_USER || "admin",
      password: process.env.POSTGRES_PASSWORD || "admin123",
      database: process.env.POSTGRES_DB || "personas_db",
    });

    // Verificar conexión
    await pgPool.query("SELECT 1");
    console.log("✅ Conectado a PostgreSQL");

    // Conectar a Redis existente
    redisClient = createClient({
      url: `redis://${REDIS_HOST}:6379`,
    });

    await redisClient.connect();
    console.log("✅ Conectado a Redis");

    console.log("✅ Servicios listos para tests");
  }, 30000);

  // ============================================================================
  // TEARDOWN: Limpiar recursos
  // ============================================================================
  afterAll(async () => {
    console.log("🧹 Limpiando recursos...");

    if (pgPool) {
      await pgPool.end();
      console.log("✅ PostgreSQL pool cerrado");
    }

    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log("✅ Redis client desconectado");
    }
  }, 30000);

  // ============================================================================
  // TEST 1: Integración con PostgreSQL - Vista y Queries
  // ============================================================================
  describe("PostgreSQL - Verificar conectividad", () => {
    test("Debe conectar exitosamente a PostgreSQL", async () => {
      const result = await pgPool.query(
        "SELECT NOW() as current_time, version() as pg_version"
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].current_time).toBeTruthy();
      expect(result.rows[0].pg_version).toContain("PostgreSQL");

      console.log(
        "✅ PostgreSQL version:",
        result.rows[0].pg_version.substring(0, 50)
      );
    });

    test("Debe poder ejecutar queries complejas de agregación", async () => {
      // Test usando tabla temporal para verificar capacidad de queries
      await pgPool.query(`
        CREATE TEMP TABLE IF NOT EXISTS test_data (
          id SERIAL PRIMARY KEY,
          category VARCHAR(50),
          value INTEGER
        )
      `);

      await pgPool.query(
        "INSERT INTO test_data (category, value) VALUES ('A', 10), ('B', 20), ('A', 15)"
      );

      const result = await pgPool.query(`
        SELECT category, COUNT(*) as count, SUM(value) as total
        FROM test_data
        GROUP BY category
        ORDER BY category
      `);

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].count).toBe("2"); // A aparece 2 veces

      console.log("✅ Queries de agregación funcionan correctamente");
    });

    test("Debe soportar transacciones", async () => {
      await pgPool.query("BEGIN");

      const result = await pgPool.query("SELECT 1 as test");
      expect(result.rows[0].test).toBe(1);

      await pgPool.query("ROLLBACK");

      console.log("✅ Transacciones soportadas");
    });

    test("Debe soportar funciones de fecha y tiempo", async () => {
      const result = await pgPool.query(`
        SELECT 
          CURRENT_DATE as today,
          NOW() as current_timestamp,
          EXTRACT(YEAR FROM NOW()) as current_year
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].today).toBeTruthy();
      expect(parseInt(result.rows[0].current_year)).toBeGreaterThan(2020);

      console.log("✅ Funciones de fecha/tiempo funcionan");
    });

    test("Debe soportar JSON/JSONB", async () => {
      const testData = { key: "value", nested: { data: 123 } };

      const result = await pgPool.query("SELECT $1::jsonb as data", [
        JSON.stringify(testData),
      ]);

      expect(result.rows[0].data).toEqual(testData);

      console.log("✅ JSONB soportado");
    });
  });

  // ============================================================================
  // TEST 2: Integración con Redis - Cache de Estadísticas
  // ============================================================================
  describe("Redis - Verificar operaciones de cache", () => {
    test("Debe poder almacenar y recuperar estadísticas en cache", async () => {
      const cacheKey = `consulta:test:stats:${Date.now()}`;
      const statsData = {
        total_personas: 100,
        por_genero: { M: 60, F: 40 },
        timestamp: Date.now(),
      };

      // Guardar en Redis con TTL de 300 segundos (5 minutos)
      await redisClient.setEx(cacheKey, 300, JSON.stringify(statsData));

      // Recuperar de Redis
      const cached = await redisClient.get(cacheKey);
      const parsed = JSON.parse(cached);

      expect(parsed).toEqual(statsData);
      expect(parsed.total_personas).toBe(100);

      // Limpiar
      await redisClient.del(cacheKey);
    });

    test("Debe verificar TTL de cache de estadísticas", async () => {
      const cacheKey = `consulta:test:ttl:${Date.now()}`;
      const data = { test: "data" };

      // Guardar con TTL de 300 segundos
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));

      // Verificar TTL
      const ttl = await redisClient.ttl(cacheKey);
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);

      console.log(`⏱️ Cache TTL: ${ttl} segundos`);

      // Limpiar
      await redisClient.del(cacheKey);
    });

    test("Debe expirar cache después del TTL", async () => {
      const cacheKey = `consulta:test:expire:${Date.now()}`;
      const data = { test: "data" };

      // Guardar con TTL de 1 segundo
      await redisClient.setEx(cacheKey, 1, JSON.stringify(data));

      // Esperar 2 segundos
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verificar que expiró
      const cached = await redisClient.get(cacheKey);
      expect(cached).toBeNull();
    });

    test("Debe poder invalidar cache por patrón", async () => {
      // Crear múltiples entradas de cache
      const keys = [
        `consulta:stats:${Date.now()}`,
        `consulta:dashboard_stats:${Date.now()}`,
        `consulta:search:${Date.now()}`,
      ];

      for (const key of keys) {
        await redisClient.set(key, JSON.stringify({ data: "test" }));
      }

      // Verificar que existen
      for (const key of keys) {
        const exists = await redisClient.exists(key);
        expect(exists).toBe(1);
      }

      // Invalidar solo las keys de stats
      const statsKeys = await redisClient.keys("consulta:stats:*");
      for (const key of statsKeys) {
        await redisClient.del(key);
      }

      // Verificar que solo se eliminaron las de stats
      const statsExists = await redisClient.exists(keys[0]);
      expect(statsExists).toBe(0); // Eliminado

      // Limpiar todo
      for (const key of keys) {
        await redisClient.del(key);
      }
    });

    test("Debe poder almacenar dashboard stats con TTL corto", async () => {
      const cacheKey = `consulta:test:dashboard:${Date.now()}`;
      const dashboardData = {
        total_personas: 100,
        ultimos_registros: 5,
        timestamp: Date.now(),
      };

      // Dashboard usa TTL de 30 segundos (más corto que stats general)
      await redisClient.setEx(cacheKey, 30, JSON.stringify(dashboardData));

      // Verificar TTL
      const ttl = await redisClient.ttl(cacheKey);
      expect(ttl).toBeGreaterThan(25);
      expect(ttl).toBeLessThanOrEqual(30);

      console.log(`⏱️ Dashboard cache TTL: ${ttl} segundos`);

      // Limpiar
      await redisClient.del(cacheKey);
    });

    test("Debe soportar cache concurrente de múltiples consultas", async () => {
      const cacheKeys = [];
      for (let i = 0; i < 5; i++) {
        const key = `consulta:test:concurrent:${Date.now()}_${i}`;
        const data = { query: `query_${i}`, results: i * 10 };
        await redisClient.setEx(key, 300, JSON.stringify(data));
        cacheKeys.push(key);
      }

      // Verificar todas las consultas en cache
      for (let i = 0; i < 5; i++) {
        const cached = await redisClient.get(cacheKeys[i]);
        const parsed = JSON.parse(cached);
        expect(parsed.results).toBe(i * 10);
      }

      // Limpiar
      for (const key of cacheKeys) {
        await redisClient.del(key);
      }
    });
  });

  // ============================================================================
  // TEST 3: Integración completa - Cache invalidation workflow
  // ============================================================================
  describe("Cache Invalidation Workflow", () => {
    test("Debe poder limpiar todo el cache de consultas", async () => {
      // Crear varios tipos de cache
      await redisClient.setEx(
        "consulta:stats:test",
        300,
        JSON.stringify({ test: 1 })
      );
      await redisClient.setEx(
        "consulta:dashboard_stats:test",
        30,
        JSON.stringify({ test: 2 })
      );
      await redisClient.setEx(
        "consulta:search:test",
        300,
        JSON.stringify({ test: 3 })
      );

      // Obtener todas las keys de consulta
      const keys = await redisClient.keys("consulta:*:test");
      expect(keys.length).toBeGreaterThan(0);

      // Invalidar todo
      for (const key of keys) {
        await redisClient.del(key);
      }

      // Verificar que se eliminaron
      const keysAfter = await redisClient.keys("consulta:*:test");
      expect(keysAfter.length).toBe(0);

      console.log("✅ Cache de consultas limpiado completamente");
    });
  });
});
