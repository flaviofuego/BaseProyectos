/**
 * Integration Tests - Auth Service
 *
 * Estas pruebas verifican la integración del servicio de autenticación con servicios de infraestructura:
 * - PostgreSQL (personas_db): Verificar conectividad, esquema y operaciones CRUD
 * - Redis (personas_redis): Verificar almacenamiento y expiración de sesiones
 *
 * NOTA: Los endpoints HTTP con lógica de negocio se prueban en E2E tests.
 *       Aquí probamos solo la integración con bases de datos.
 */

const { Pool } = require("pg");
const redis = require("redis");
const bcrypt = require("bcrypt");

// Configuración para usar servicios Docker existentes
const DB_HOST = process.env.DB_HOST || "personas_db";
const REDIS_HOST = process.env.REDIS_HOST || "personas_redis";

describe("Integration Tests - Auth Service: Integración con BD y Cache", () => {
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
    redisClient = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: 6379,
      },
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

    if (redisClient) {
      await redisClient.quit();
      console.log("✅ Redis client desconectado");
    }
  }, 30000);

  // ============================================================================
  // TEST 1: Integración con PostgreSQL - Esquema y CRUD
  // ============================================================================
  describe("PostgreSQL - Verificar esquema y operaciones", () => {
    test("Debe tener la tabla users con columnas correctas", async () => {
      const result = await pgPool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("id");
      expect(columns).toContain("username");
      expect(columns).toContain("email");
      expect(columns).toContain("password_hash");
      expect(columns).toContain("created_at");
      expect(columns).toContain("updated_at");
    });

    test("Debe tener la tabla user_preferences", async () => {
      const result = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences'
      `);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("user_id");
      expect(columns).toContain("consulta_service_enabled");
    });

    test("Debe tener la tabla logs para auditoría", async () => {
      const result = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'logs'
      `);

      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain("id");
      expect(columns).toContain("user_id");
      expect(columns).toContain("action");
      expect(columns).toContain("status");
    });

    test("Debe poder insertar y leer un usuario en la BD", async () => {
      const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password_hash: await bcrypt.hash("TestPass123!", 4),
      };

      // Insertar usuario
      const insertResult = await pgPool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
        [testUser.username, testUser.email, testUser.password_hash]
      );

      expect(insertResult.rows.length).toBe(1);
      const userId = insertResult.rows[0].id;
      expect(insertResult.rows[0].username).toBe(testUser.username);

      // Leer usuario
      const selectResult = await pgPool.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [userId]
      );

      expect(selectResult.rows.length).toBe(1);
      expect(selectResult.rows[0].username).toBe(testUser.username);
      expect(selectResult.rows[0].email).toBe(testUser.email);

      // Limpiar
      await pgPool.query("DELETE FROM users WHERE id = $1", [userId]);
    });

    test("Debe prevenir usuarios duplicados (constraint)", async () => {
      const testUser = {
        username: `dupuser_${Date.now()}`,
        email: `dup_${Date.now()}@example.com`,
        password_hash: await bcrypt.hash("TestPass123!", 4),
      };

      // Insertar primera vez
      await pgPool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
        [testUser.username, testUser.email, testUser.password_hash]
      );

      // Intentar duplicar - debe fallar
      await expect(
        pgPool.query(
          "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
          [testUser.username, "different@example.com", testUser.password_hash]
        )
      ).rejects.toThrow();

      // Limpiar
      await pgPool.query("DELETE FROM users WHERE username = $1", [
        testUser.username,
      ]);
    });

    test("Debe poder registrar logs de auditoría", async () => {
      // Crear usuario de prueba
      const userResult = await pgPool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [`loguser_${Date.now()}`, `log_${Date.now()}@example.com`, "hash"]
      );
      const userId = userResult.rows[0].id;

      // Insertar log
      await pgPool.query(
        "INSERT INTO logs (user_id, action, status) VALUES ($1, $2, $3)",
        [userId, "TEST_ACTION", "SUCCESS"]
      );

      // Verificar log
      const logResult = await pgPool.query(
        "SELECT action, status FROM logs WHERE user_id = $1 AND action = $2",
        [userId, "TEST_ACTION"]
      );

      expect(logResult.rows.length).toBeGreaterThan(0);
      expect(logResult.rows[0].action).toBe("TEST_ACTION");
      expect(logResult.rows[0].status).toBe("SUCCESS");

      // Limpiar
      await pgPool.query("DELETE FROM logs WHERE user_id = $1", [userId]);
      await pgPool.query("DELETE FROM users WHERE id = $1", [userId]);
    });
  });

  // ============================================================================
  // TEST 2: Integración con Redis - Sesiones y Cache
  // ============================================================================
  describe("Redis - Verificar almacenamiento de sesiones", () => {
    test("Debe poder almacenar y recuperar datos de sesión", async () => {
      const sessionKey = `test:session:${Date.now()}`;
      const sessionData = {
        userId: 123,
        username: "testuser",
        loginTime: Date.now(),
      };

      // Guardar en Redis
      await redisClient.set(sessionKey, JSON.stringify(sessionData), {
        EX: 3600, // Expira en 1 hora
      });

      // Recuperar de Redis
      const retrieved = await redisClient.get(sessionKey);
      const parsedData = JSON.parse(retrieved);

      expect(parsedData).toEqual(sessionData);

      // Limpiar
      await redisClient.del(sessionKey);
    });

    test("Debe expirar sesiones después del TTL", async () => {
      const sessionKey = `test:session:expire:${Date.now()}`;
      const sessionData = { test: "data" };

      // Guardar con TTL de 1 segundo
      await redisClient.set(sessionKey, JSON.stringify(sessionData), {
        EX: 1,
      });

      // Esperar 2 segundos
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verificar que expiró
      const retrieved = await redisClient.get(sessionKey);
      expect(retrieved).toBeNull();
    });

    test("Debe poder verificar existencia de claves", async () => {
      const key = `test:exists:${Date.now()}`;

      // Clave no existe
      let exists = await redisClient.exists(key);
      expect(exists).toBe(0);

      // Crear clave
      await redisClient.set(key, "value");

      // Clave existe
      exists = await redisClient.exists(key);
      expect(exists).toBe(1);

      // Limpiar
      await redisClient.del(key);
    });

    test("Debe poder eliminar claves", async () => {
      const key = `test:delete:${Date.now()}`;

      // Crear clave
      await redisClient.set(key, "value");

      // Verificar existe
      let value = await redisClient.get(key);
      expect(value).toBe("value");

      // Eliminar
      await redisClient.del(key);

      // Verificar eliminada
      value = await redisClient.get(key);
      expect(value).toBeNull();
    });

    test("Debe soportar múltiples sesiones concurrentes", async () => {
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const key = `test:concurrent:${Date.now()}_${i}`;
        const data = { userId: i, session: i };
        await redisClient.set(key, JSON.stringify(data));
        sessions.push(key);
      }

      // Verificar todas las sesiones
      for (let i = 0; i < 5; i++) {
        const retrieved = await redisClient.get(sessions[i]);
        const parsed = JSON.parse(retrieved);
        expect(parsed.userId).toBe(i);
      }

      // Limpiar
      for (const session of sessions) {
        await redisClient.del(session);
      }
    });
  });
});
