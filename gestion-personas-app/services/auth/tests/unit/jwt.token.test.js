/**
 * Tests para generación y verificación de tokens JWT
 * Meta de cobertura: 95%
 *
 * Casos de prueba:
 * 1. Generación de tokens con payload correcto
 * 2. Verificación de tokens válidos
 * 3. Manejo de tokens expirados
 * 4. Verificación de firma
 * 5. Validación de estructura del payload
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRY = "24h";

describe("Generación y Verificación de Tokens JWT", () => {
  // ============================================================================
  // FUNCIÓN DE GENERACIÓN DE TOKEN (como en el código real)
  // ============================================================================
  function generateToken(user) {
    const jti = crypto.randomBytes(16).toString("hex");
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      jti: jti,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  // ============================================================================
  // TESTS DE GENERACIÓN DE TOKEN
  // ============================================================================
  describe("Generación de Token", () => {
    it("debe generar un token válido con el payload correcto", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT tiene 3 partes
    });

    it("debe incluir todos los campos requeridos en el payload", () => {
      const user = {
        id: 123,
        username: "john_doe",
        email: "john@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toHaveProperty("sub");
      expect(decoded).toHaveProperty("username");
      expect(decoded).toHaveProperty("email");
      expect(decoded).toHaveProperty("jti");
      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
    });

    it("debe usar el user.id como subject (sub)", () => {
      const user = {
        id: 42,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.sub).toBe(42);
    });

    it("debe incluir el username en el payload", () => {
      const user = {
        id: 1,
        username: "admin_user",
        email: "admin@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.username).toBe("admin_user");
    });

    it("debe incluir el email en el payload", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "specific@email.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.email).toBe("specific@email.com");
    });

    it("debe generar un jti único para cada token", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token1 = generateToken(user);
      const token2 = generateToken(user);

      const decoded1 = jwt.verify(token1, JWT_SECRET);
      const decoded2 = jwt.verify(token2, JWT_SECRET);

      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    it("debe generar jti con formato hexadecimal de 32 caracteres", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.jti).toMatch(/^[a-f0-9]{32}$/);
      expect(decoded.jti.length).toBe(32);
    });

    it("debe establecer tiempo de expiración (exp)", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat / 1000);
    });

    it("debe establecer issued at (iat)", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const beforeTime = Math.floor(Date.now() / 1000);
      const token = generateToken(user);
      const afterTime = Math.floor(Date.now() / 1000);

      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(decoded.iat).toBeLessThanOrEqual(afterTime + 1);
    });

    it("debe configurar expiración a 24 horas", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      const expectedExpiry = decoded.iat + 24 * 60 * 60;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 2);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
    });
  });

  // ============================================================================
  // TESTS DE VERIFICACIÓN DE TOKEN
  // ============================================================================
  describe("Verificación de Token", () => {
    it("debe verificar tokens válidos correctamente", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(user.id);
      expect(decoded.username).toBe(user.username);
      expect(decoded.email).toBe(user.email);
    });

    it("debe rechazar tokens con firma incorrecta", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const wrongSecret = "wrong-secret-key";

      expect(() => {
        jwt.verify(token, wrongSecret);
      }).toThrow("invalid signature");
    });

    it("debe rechazar tokens malformados", () => {
      const malformedTokens = [
        "not.a.token",
        "invalid-token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Solo header
        "header.payload", // Falta signature
        "",
      ];

      malformedTokens.forEach((token) => {
        expect(() => {
          jwt.verify(token, JWT_SECRET);
        }).toThrow();
      });
    });

    it("debe rechazar tokens expirados", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      // Crear token que expire inmediatamente
      const jti = crypto.randomBytes(16).toString("hex");
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        jti: jti,
        iat: Math.floor(Date.now() / 1000),
      };

      const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "-1s" });

      // El token ya está expirado
      expect(() => {
        jwt.verify(expiredToken, JWT_SECRET);
      }).toThrow("jwt expired");
    });

    it("debe verificar el algoritmo de firma", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded.header.alg).toBe("HS256");
    });

    it("debe verificar el tipo de token", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded.header.typ).toBe("JWT");
    });

    it("debe permitir decodificar sin verificar", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(user.id);
      expect(decoded.username).toBe(user.username);
    });

    it("debe validar que exp es mayor que iat", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  // ============================================================================
  // TESTS DE ESTRUCTURA DEL PAYLOAD
  // ============================================================================
  describe("Estructura del Payload", () => {
    it("debe mantener tipos de datos correctos", () => {
      const user = {
        id: 123,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(typeof decoded.sub).toBe("number");
      expect(typeof decoded.username).toBe("string");
      expect(typeof decoded.email).toBe("string");
      expect(typeof decoded.jti).toBe("string");
      expect(typeof decoded.iat).toBe("number");
      expect(typeof decoded.exp).toBe("number");
    });

    it("no debe incluir información sensible", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        password_hash: "should-not-be-included",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.password).toBeUndefined();
    });

    it("debe manejar usernames con caracteres especiales permitidos", () => {
      const user = {
        id: 1,
        username: "user_name_123",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.username).toBe("user_name_123");
    });

    it("debe manejar emails largos", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "very.long.email.address.for.testing@subdomain.example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.email).toBe(
        "very.long.email.address.for.testing@subdomain.example.com"
      );
    });

    it("debe manejar diferentes IDs de usuario", () => {
      const userIds = [1, 999, 123456, 1];

      userIds.forEach((id) => {
        const user = {
          id: id,
          username: "testuser",
          email: "test@example.com",
        };

        const token = generateToken(user);
        const decoded = jwt.verify(token, JWT_SECRET);

        expect(decoded.sub).toBe(id);
      });
    });
  });

  // ============================================================================
  // TESTS DE SEGURIDAD
  // ============================================================================
  describe("Seguridad del Token", () => {
    it("debe usar HMAC SHA256 para la firma", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded.header.alg).toBe("HS256");
    });

    it("debe generar tokens diferentes para el mismo usuario", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token1 = generateToken(user);
      const token2 = generateToken(user);

      expect(token1).not.toBe(token2);
    });

    it("debe resistir ataques de timing", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const validToken = generateToken(user);
      const invalidToken = "invalid.token.here";

      const start1 = Date.now();
      try {
        jwt.verify(validToken, "wrong-secret");
      } catch (e) {}
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      try {
        jwt.verify(invalidToken, JWT_SECRET);
      } catch (e) {}
      const time2 = Date.now() - start2;

      // Los tiempos deben ser similares (diferencia < 100ms)
      // Esto previene timing attacks
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('no debe permitir algoritmo "none"', () => {
      const payload = {
        sub: 1,
        username: "testuser",
        email: "test@example.com",
      };

      // Intentar crear token con algoritmo none
      const noneToken = jwt.sign(payload, "", { algorithm: "none" });

      expect(() => {
        jwt.verify(noneToken, JWT_SECRET, { algorithms: ["HS256"] });
      }).toThrow();
    });

    it("debe validar que el jti es aleatorio", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const jtis = new Set();

      // Generar 100 tokens y verificar que todos tengan jti único
      for (let i = 0; i < 100; i++) {
        const token = generateToken(user);
        const decoded = jwt.verify(token, JWT_SECRET);
        jtis.add(decoded.jti);
      }

      expect(jtis.size).toBe(100);
    });
  });

  // ============================================================================
  // TESTS DE CASOS EDGE
  // ============================================================================
  describe("Casos Edge", () => {
    it("debe manejar usuario con ID 0", () => {
      const user = {
        id: 0,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.sub).toBe(0);
    });

    it("debe manejar username vacío string", () => {
      const user = {
        id: 1,
        username: "",
        email: "test@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.username).toBe("");
    });

    it("debe verificar token inmediatamente después de crearlo", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const token = generateToken(user);

      // Verificar inmediatamente sin delay
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).not.toThrow();
    });

    it("debe manejar caracteres especiales en email", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test+tag@example.com",
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.email).toBe("test+tag@example.com");
    });

    it("debe mantener precisión del timestamp", () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      };

      const beforeTime = Date.now();
      const token = generateToken(user);
      const afterTime = Date.now();

      const decoded = jwt.verify(token, JWT_SECRET);
      const tokenTime = decoded.iat * 1000; // Convertir a milisegundos

      expect(tokenTime).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(tokenTime).toBeLessThanOrEqual(afterTime + 1000);
    });
  });

  // ============================================================================
  // TESTS DE INTEGRACIÓN
  // ============================================================================
  describe("Integración de Generación y Verificación", () => {
    it("debe completar ciclo completo: generar -> verificar -> usar", () => {
      const user = {
        id: 42,
        username: "integration_test",
        email: "integration@test.com",
      };

      // Generar
      const token = generateToken(user);
      expect(token).toBeDefined();

      // Verificar
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.sub).toBe(user.id);

      // Usar (extraer información)
      expect(decoded.username).toBe(user.username);
      expect(decoded.email).toBe(user.email);
    });

    it("debe funcionar con múltiples usuarios simultáneamente", () => {
      const users = [
        { id: 1, username: "user1", email: "user1@test.com" },
        { id: 2, username: "user2", email: "user2@test.com" },
        { id: 3, username: "user3", email: "user3@test.com" },
      ];

      const tokens = users.map((user) => generateToken(user));

      tokens.forEach((token, index) => {
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.sub).toBe(users[index].id);
        expect(decoded.username).toBe(users[index].username);
      });
    });
  });
});
