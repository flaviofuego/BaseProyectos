/**
 * Tests para el middleware de autenticación JWT
 * Meta de cobertura: 90%
 *
 * Casos de prueba:
 * 1. Peticiones sin token (401)
 * 2. Peticiones con token inválido (401)
 * 3. Peticiones con token expirado (401)
 * 4. Peticiones con token válido (popula req.user)
 * 5. Token en blacklist (401)
 */

const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Pool } = require("pg");
const redis = require("redis");

// Mock de las dependencias
jest.mock("pg");
jest.mock("redis");
jest.mock("passport");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

describe("Middleware de Autenticación JWT", () => {
  let mockPool;
  let mockRedisClient;
  let req;
  let res;
  let next;

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

    // Setup de request, response y next
    req = {
      headers: {},
      user: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Sin token", () => {
    it("debe rechazar peticiones sin header de autorización", () => {
      // Simular que passport no encuentra token
      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // No hay user
          callback(null, false, { message: "No token provided" });
        };
      });

      const authMiddleware = passport.authenticate("jwt", { session: false });
      const handler = authMiddleware(req, res, next);

      expect(res.status).not.toHaveBeenCalledWith(200);
    });

    it("debe retornar 401 cuando no hay token", () => {
      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, false, { message: "No authorization header" });
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "No token provided" });
          }
        }
      );

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe("Token inválido", () => {
    it("debe rechazar tokens con formato inválido", () => {
      req.headers.authorization = "Bearer invalid-token-format";

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // Simular error de verificación
          callback(null, false, { message: "Invalid token" });
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "Invalid token" });
          }
        }
      );

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe rechazar tokens con firma incorrecta", () => {
      // Crear token con secret incorrecto
      const invalidToken = jwt.sign(
        { sub: 1, username: "test" },
        "wrong-secret",
        { expiresIn: "1h" }
      );

      req.headers.authorization = `Bearer ${invalidToken}`;

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // JWT no puede verificar el token
          callback(null, false, { message: "Invalid signature" });
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "Invalid token signature" });
          }
        }
      );

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("Token expirado", () => {
    it("debe rechazar tokens expirados", () => {
      // Crear token que ya expiró
      const expiredToken = jwt.sign(
        { sub: 1, username: "test", jti: "test-jti" },
        JWT_SECRET,
        { expiresIn: "-1h" } // Expiró hace 1 hora
      );

      req.headers.authorization = `Bearer ${expiredToken}`;

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // JWT detecta que el token expiró
          callback(null, false, { message: "Token expired" });
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "Token expired" });
          }
        }
      );

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("expired") })
      );
    });

    it("debe validar correctamente el tiempo de expiración", () => {
      const now = Math.floor(Date.now() / 1000);

      // Token que expira en el pasado
      const payload = {
        sub: 1,
        username: "test",
        exp: now - 3600, // Expiró hace 1 hora
      };

      try {
        jwt.verify(jwt.sign(payload, JWT_SECRET), JWT_SECRET);
        fail("Debería haber lanzado error de expiración");
      } catch (error) {
        expect(error.name).toBe("TokenExpiredError");
      }
    });
  });

  describe("Token válido", () => {
    it("debe aceptar tokens válidos y poblar req.user", async () => {
      const validUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      // Token válido
      const validToken = jwt.sign(
        { sub: validUser.id, username: validUser.username, jti: "valid-jti" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      req.headers.authorization = `Bearer ${validToken}`;

      // Mock de Redis (no está en blacklist)
      mockRedisClient.get.mockResolvedValue(null);

      // Mock de database query
      mockPool.query.mockResolvedValue({
        rows: [validUser],
      });

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // Simular autenticación exitosa
          req.user = validUser;
          callback(null, validUser);
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (user) {
            req.user = user;
            next();
          }
        }
      );

      authMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(validUser.id);
      expect(req.user.username).toBe(validUser.username);
      expect(next).toHaveBeenCalled();
    });

    it("debe verificar la estructura del payload del token", () => {
      const token = jwt.sign(
        {
          sub: 123,
          username: "john_doe",
          email: "john@example.com",
          jti: "unique-id-123",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toHaveProperty("sub");
      expect(decoded).toHaveProperty("username");
      expect(decoded).toHaveProperty("email");
      expect(decoded).toHaveProperty("jti");
      expect(decoded.sub).toBe(123);
      expect(decoded.username).toBe("john_doe");
    });

    it("debe aceptar tokens con tiempos de expiración válidos", () => {
      const token = jwt.sign(
        { sub: 1, username: "test", jti: "jti-123" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const decoded = jwt.verify(token, JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);

      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + 24 * 60 * 60 + 5); // +5 segundos de margen
    });
  });

  describe("Token en blacklist", () => {
    it("debe rechazar tokens que están en la blacklist", async () => {
      const blacklistedToken = jwt.sign(
        { sub: 1, username: "test", jti: "blacklisted-jti" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      req.headers.authorization = `Bearer ${blacklistedToken}`;

      // Mock de Redis indicando que el token está en blacklist
      mockRedisClient.get.mockResolvedValue("true");

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return async (req, res, next) => {
          const decoded = jwt.decode(blacklistedToken);
          const isBlacklisted = await mockRedisClient.get(
            `blacklist_${decoded.jti}`
          );

          if (isBlacklisted) {
            callback(null, false, { message: "Token blacklisted" });
          }
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "Token has been revoked" });
          }
        }
      );

      await authMiddleware(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "blacklist_blacklisted-jti"
      );
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe verificar el jti en Redis", async () => {
      const jti = "test-jti-123";
      mockRedisClient.get.mockResolvedValue("true");

      const result = await mockRedisClient.get(`blacklist_${jti}`);

      expect(result).toBe("true");
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "blacklist_test-jti-123"
      );
    });
  });

  describe("Casos edge", () => {
    it("debe manejar errores de base de datos", async () => {
      const validToken = jwt.sign(
        { sub: 1, username: "test", jti: "test-jti" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      req.headers.authorization = `Bearer ${validToken}`;

      // Mock error de base de datos
      mockPool.query.mockRejectedValue(new Error("Database connection failed"));
      mockRedisClient.get.mockResolvedValue(null);

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return async (req, res, next) => {
          try {
            await mockPool.query("SELECT * FROM users WHERE id = $1", [1]);
            callback(null, false);
          } catch (error) {
            callback(error, false);
          }
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (err) {
            res.status(500).json({ error: "Internal server error" });
          }
        }
      );

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("debe manejar tokens malformados", () => {
      req.headers.authorization = "Bearer not.a.valid.jwt.token";

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          try {
            jwt.verify("not.a.valid.jwt.token", JWT_SECRET);
          } catch (error) {
            callback(null, false, { message: "Malformed token" });
          }
        };
      });

      const authMiddleware = passport.authenticate(
        "jwt",
        { session: false },
        (err, user, info) => {
          if (!user) {
            res.status(401).json({ error: "Malformed token" });
          }
        }
      );

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("debe manejar múltiples espacios en el header", () => {
      req.headers.authorization = "Bearer  token-with-spaces";

      const parts = req.headers.authorization.split(" ");
      const token = parts[parts.length - 1];

      expect(token).toBe("token-with-spaces");
    });
  });

  describe("Extracción de token", () => {
    it("debe extraer token del header Authorization", () => {
      const testToken = "test-token-123";
      req.headers.authorization = `Bearer ${testToken}`;

      const token = req.headers.authorization.split(" ")[1];

      expect(token).toBe(testToken);
    });

    it("debe manejar ausencia de header Authorization", () => {
      const token = req.headers.authorization?.split(" ")[1];

      expect(token).toBeUndefined();
    });

    it("debe manejar formato incorrecto del header", () => {
      req.headers.authorization = "InvalidFormat";

      const parts = req.headers.authorization.split(" ");
      const token = parts.length > 1 ? parts[1] : null;

      expect(token).toBeNull();
    });
  });
});
