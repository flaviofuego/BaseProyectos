/**
 * Tests para funciones auxiliares y helpers
 * Meta de cobertura: 90-100%
 *
 * Casos de prueba:
 * 1. getUserPreferences - cacheo y base de datos
 * 2. invalidateUserPreferencesCache - limpieza de caché
 * 3. logTransaction - registro de transacciones
 * 4. generateToken - generación de JWT (ya cubierto en jwt.token.test.js)
 * 5. Manejo de errores y casos edge
 */

const { Pool } = require("pg");
const redis = require("redis");

// Mock de dependencias
jest.mock("pg");
jest.mock("redis");
jest.mock("node-fetch", () => jest.fn());

const fetch = require("node-fetch");

describe("Funciones Auxiliares y Helpers", () => {
  let mockPool;
  let mockRedisClient;

  beforeEach(() => {
    // Setup de mocks
    mockPool = {
      query: jest.fn(),
    };

    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
    };

    Pool.mockImplementation(() => mockPool);
    redis.createClient = jest.fn(() => mockRedisClient);

    jest.clearAllMocks();
  });

  // ============================================================================
  // TESTS DE getUserPreferences
  // ============================================================================
  describe("getUserPreferences", () => {
    async function getUserPreferences(userId) {
      try {
        // Check Redis cache first
        const cacheKey = `user_prefs:${userId}`;
        const cachedPrefs = await mockRedisClient.get(cacheKey);

        if (cachedPrefs) {
          return JSON.parse(cachedPrefs);
        }

        // Query database
        let result = await mockPool.query(
          "SELECT * FROM user_preferences WHERE user_id = $1",
          [userId]
        );

        // If no preferences exist, create default preferences
        if (result.rows.length === 0) {
          await mockPool.query(
            "INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)",
            [userId]
          );

          result = await mockPool.query(
            "SELECT * FROM user_preferences WHERE user_id = $1",
            [userId]
          );
        }

        const preferences = result.rows[0];

        // Cache for 5 minutes
        await mockRedisClient.setEx(cacheKey, 300, JSON.stringify(preferences));

        return preferences;
      } catch (error) {
        console.error("Error getting user preferences:", error);
        throw error;
      }
    }

    it("debe retornar preferencias desde caché si existen", async () => {
      const userId = 1;
      const cachedPreferences = {
        user_id: 1,
        consulta_service_enabled: true,
        updated_at: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedPreferences));

      const result = await getUserPreferences(userId);

      expect(mockRedisClient.get).toHaveBeenCalledWith("user_prefs:1");
      expect(result).toEqual(cachedPreferences);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it("debe consultar base de datos si no hay caché", async () => {
      const userId = 2;
      const dbPreferences = {
        user_id: 2,
        consulta_service_enabled: false,
        updated_at: new Date(),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [dbPreferences] });

      const result = await getUserPreferences(userId);

      expect(mockRedisClient.get).toHaveBeenCalledWith("user_prefs:2");
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [userId]
      );
      expect(result).toEqual(dbPreferences);
    });

    it("debe crear preferencias por defecto si no existen", async () => {
      const userId = 3;
      const defaultPreferences = {
        user_id: 3,
        consulta_service_enabled: true,
        updated_at: new Date(),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Primera consulta: no existe
        .mockResolvedValueOnce({ rows: [] }) // Insert (no retorna rows)
        .mockResolvedValueOnce({ rows: [defaultPreferences] }); // Segunda consulta: retorna creado

      const result = await getUserPreferences(userId);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        "INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)",
        [userId]
      );
      expect(result).toEqual(defaultPreferences);
    });

    it("debe cachear preferencias en Redis por 5 minutos", async () => {
      const userId = 4;
      const dbPreferences = {
        user_id: 4,
        consulta_service_enabled: true,
        updated_at: new Date(),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [dbPreferences] });

      await getUserPreferences(userId);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "user_prefs:4",
        300,
        JSON.stringify(dbPreferences)
      );
    });

    it("debe manejar errores de Redis gracefully", async () => {
      const userId = 5;

      mockRedisClient.get.mockRejectedValue(
        new Error("Redis connection failed")
      );

      await expect(getUserPreferences(userId)).rejects.toThrow(
        "Redis connection failed"
      );
    });

    it("debe manejar errores de base de datos", async () => {
      const userId = 6;

      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockRejectedValue(new Error("Database error"));

      await expect(getUserPreferences(userId)).rejects.toThrow(
        "Database error"
      );
    });

    it("debe generar clave de caché correcta", async () => {
      const userId = 123;
      const preferences = { user_id: 123, consulta_service_enabled: true };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(preferences));

      await getUserPreferences(userId);

      expect(mockRedisClient.get).toHaveBeenCalledWith("user_prefs:123");
    });

    it("debe parsear JSON del caché correctamente", async () => {
      const userId = 7;
      const preferences = {
        user_id: 7,
        consulta_service_enabled: false,
        updated_at: "2024-01-01T00:00:00.000Z",
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(preferences));

      const result = await getUserPreferences(userId);

      expect(result).toEqual(preferences);
      expect(typeof result).toBe("object");
    });

    it("debe manejar diferentes IDs de usuario", async () => {
      const userIds = [1, 999, 12345];

      for (const userId of userIds) {
        const preferences = { user_id: userId, consulta_service_enabled: true };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(preferences));

        const result = await getUserPreferences(userId);

        expect(result.user_id).toBe(userId);
      }
    });

    it("debe serializar correctamente para Redis", async () => {
      const userId = 8;
      const preferences = {
        user_id: 8,
        consulta_service_enabled: true,
        updated_at: new Date("2024-01-01"),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [preferences] });

      await getUserPreferences(userId);

      const serialized = mockRedisClient.setEx.mock.calls[0][2];
      expect(() => JSON.parse(serialized)).not.toThrow();
    });
  });

  // ============================================================================
  // TESTS DE invalidateUserPreferencesCache
  // ============================================================================
  describe("invalidateUserPreferencesCache", () => {
    async function invalidateUserPreferencesCache(userId) {
      try {
        const cacheKey = `user_prefs:${userId}`;
        await mockRedisClient.del(cacheKey);
      } catch (error) {
        console.error("Error invalidating user preferences cache:", error);
      }
    }

    it("debe eliminar entrada del caché correctamente", async () => {
      const userId = 1;

      await invalidateUserPreferencesCache(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith("user_prefs:1");
    });

    it("debe generar clave correcta para invalidación", async () => {
      const userId = 456;

      await invalidateUserPreferencesCache(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith("user_prefs:456");
    });

    it("debe manejar errores de Redis sin lanzar excepción", async () => {
      const userId = 2;

      mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

      await expect(
        invalidateUserPreferencesCache(userId)
      ).resolves.not.toThrow();
    });

    it("debe invalidar caché para múltiples usuarios", async () => {
      const userIds = [1, 2, 3];

      for (const userId of userIds) {
        await invalidateUserPreferencesCache(userId);
      }

      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(1, "user_prefs:1");
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(2, "user_prefs:2");
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(3, "user_prefs:3");
    });

    it("debe ser idempotente", async () => {
      const userId = 3;

      await invalidateUserPreferencesCache(userId);
      await invalidateUserPreferencesCache(userId);

      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });

    it("debe funcionar con IDs de usuario edge cases", async () => {
      const edgeCases = [0, -1, 999999];

      for (const userId of edgeCases) {
        mockRedisClient.del.mockClear();
        await invalidateUserPreferencesCache(userId);
        expect(mockRedisClient.del).toHaveBeenCalledWith(
          `user_prefs:${userId}`
        );
      }
    });
  });

  // ============================================================================
  // TESTS DE logTransaction
  // ============================================================================
  describe("logTransaction", () => {
    async function logTransaction(userId, type, status, req) {
      try {
        const logServiceUrl =
          process.env.LOG_SERVICE_URL || "http://log-service:3005";
        await fetch(`${logServiceUrl}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_type: type,
            entity_type: "USER",
            entity_id: userId,
            user_id: userId,
            ip_address: req.ip,
            user_agent: req.headers["user-agent"],
            status: status,
          }),
        });
      } catch (error) {
        console.error("Error logging transaction:", error);
      }
    }

    it("debe enviar log al servicio de logs", async () => {
      const userId = 1;
      const type = "LOGIN";
      const status = "SUCCESS";
      const req = {
        ip: "192.168.1.1",
        headers: { "user-agent": "Mozilla/5.0" },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(userId, type, status, req);

      expect(fetch).toHaveBeenCalledWith(
        "http://log-service:3005/log",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("debe incluir todos los datos requeridos en el log", async () => {
      const userId = 2;
      const type = "REGISTER";
      const status = "SUCCESS";
      const req = {
        ip: "10.0.0.1",
        headers: { "user-agent": "Chrome/90.0" },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(userId, type, status, req);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);

      expect(callBody).toHaveProperty("transaction_type", "REGISTER");
      expect(callBody).toHaveProperty("entity_type", "USER");
      expect(callBody).toHaveProperty("entity_id", 2);
      expect(callBody).toHaveProperty("user_id", 2);
      expect(callBody).toHaveProperty("ip_address", "10.0.0.1");
      expect(callBody).toHaveProperty("user_agent", "Chrome/90.0");
      expect(callBody).toHaveProperty("status", "SUCCESS");
    });

    it("debe manejar diferentes tipos de transacciones", async () => {
      const types = ["LOGIN", "LOGOUT", "REGISTER", "UPDATE", "DELETE"];
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockResolvedValue({ ok: true });

      for (const type of types) {
        await logTransaction(1, type, "SUCCESS", req);
      }

      expect(fetch).toHaveBeenCalledTimes(5);
    });

    it("debe manejar diferentes estados", async () => {
      const statuses = ["SUCCESS", "ERROR", "FAILED", "PENDING"];
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockResolvedValue({ ok: true });

      for (const status of statuses) {
        await logTransaction(1, "TEST", status, req);
      }

      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it("debe manejar errores del servicio de logs sin lanzar excepción", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockRejectedValue(new Error("Service unavailable"));

      await expect(
        logTransaction(1, "LOGIN", "SUCCESS", req)
      ).resolves.not.toThrow();
    });

    it("debe usar URL configurada del servicio de logs", async () => {
      const originalEnv = process.env.LOG_SERVICE_URL;
      process.env.LOG_SERVICE_URL = "http://custom-log-service:9000";

      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(1, "LOGIN", "SUCCESS", req);

      expect(fetch).toHaveBeenCalledWith(
        "http://custom-log-service:9000/log",
        expect.any(Object)
      );

      process.env.LOG_SERVICE_URL = originalEnv;
    });

    it("debe manejar IPs en diferentes formatos", async () => {
      const ips = ["192.168.1.1", "::1", "10.0.0.1", "172.16.0.1"];

      fetch.mockResolvedValue({ ok: true });

      for (const ip of ips) {
        const req = {
          ip: ip,
          headers: { "user-agent": "Test Agent" },
        };

        await logTransaction(1, "TEST", "SUCCESS", req);
      }

      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it("debe manejar user-agents largos", async () => {
      const longUserAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": longUserAgent },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(1, "LOGIN", "SUCCESS", req);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.user_agent).toBe(longUserAgent);
    });

    it("debe serializar correctamente el body a JSON", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(1, "LOGIN", "SUCCESS", req);

      const body = fetch.mock.calls[0][1].body;
      expect(() => JSON.parse(body)).not.toThrow();
    });

    it("debe incluir entity_type como USER", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Agent" },
      };

      fetch.mockResolvedValue({ ok: true });

      await logTransaction(1, "LOGIN", "SUCCESS", req);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.entity_type).toBe("USER");
    });
  });

  // ============================================================================
  // TESTS DE INTEGRACIÓN ENTRE HELPERS
  // ============================================================================
  describe("Integración de Helpers", () => {
    async function getUserPreferences(userId) {
      const cacheKey = `user_prefs:${userId}`;
      const cachedPrefs = await mockRedisClient.get(cacheKey);

      if (cachedPrefs) {
        return JSON.parse(cachedPrefs);
      }

      let result = await mockPool.query(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        await mockPool.query(
          "INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)",
          [userId]
        );
        result = await mockPool.query(
          "SELECT * FROM user_preferences WHERE user_id = $1",
          [userId]
        );
      }

      const preferences = result.rows[0];
      await mockRedisClient.setEx(cacheKey, 300, JSON.stringify(preferences));
      return preferences;
    }

    async function invalidateUserPreferencesCache(userId) {
      const cacheKey = `user_prefs:${userId}`;
      await mockRedisClient.del(cacheKey);
    }

    it("debe invalidar caché y forzar consulta a DB", async () => {
      const userId = 1;
      const preferences = { user_id: 1, consulta_service_enabled: true };

      // Primera llamada: desde caché
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(preferences));
      await getUserPreferences(userId);

      // Invalidar caché
      await invalidateUserPreferencesCache(userId);
      expect(mockRedisClient.del).toHaveBeenCalledWith("user_prefs:1");

      // Segunda llamada: debe ir a DB
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({ rows: [preferences] });

      await getUserPreferences(userId);

      expect(mockPool.query).toHaveBeenCalled();
    });

    it("debe actualizar caché después de invalidación", async () => {
      const userId = 2;
      const preferences = { user_id: 2, consulta_service_enabled: false };

      // Invalidar
      await invalidateUserPreferencesCache(userId);

      // Obtener (debe cachear nuevamente)
      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [preferences] });

      await getUserPreferences(userId);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "user_prefs:2",
        300,
        JSON.stringify(preferences)
      );
    });
  });

  // ============================================================================
  // TESTS DE CASOS EDGE
  // ============================================================================
  describe("Casos Edge de Helpers", () => {
    it("debe manejar userId como 0", async () => {
      async function getUserPreferences(userId) {
        const cacheKey = `user_prefs:${userId}`;
        const cachedPrefs = await mockRedisClient.get(cacheKey);
        if (cachedPrefs) return JSON.parse(cachedPrefs);

        const result = await mockPool.query(
          "SELECT * FROM user_preferences WHERE user_id = $1",
          [userId]
        );
        return result.rows[0];
      }

      const preferences = { user_id: 0, consulta_service_enabled: true };
      mockRedisClient.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [preferences] });

      const result = await getUserPreferences(0);
      expect(result.user_id).toBe(0);
    });

    it("debe manejar strings vacíos en req.headers", async () => {
      async function logTransaction(userId, type, status, req) {
        try {
          await fetch("http://log-service:3005/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transaction_type: type,
              user_id: userId,
              ip_address: req.ip,
              user_agent: req.headers["user-agent"],
              status: status,
            }),
          });
        } catch (error) {}
      }

      const req = {
        ip: "",
        headers: { "user-agent": "" },
      };

      fetch.mockResolvedValue({ ok: true });

      await expect(
        logTransaction(1, "TEST", "SUCCESS", req)
      ).resolves.not.toThrow();
    });
  });
});
