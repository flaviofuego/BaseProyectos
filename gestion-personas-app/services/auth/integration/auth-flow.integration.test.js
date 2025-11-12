/**
 * Pruebas de Integración - Auth Service
 *
 * Escenario: Registro y Login completo con BD PostgreSQL y Redis reales
 *
 * Flujo:
 * 1. Levantar contenedores de PostgreSQL y Redis con Testcontainers
 * 2. Registrar un nuevo usuario
 * 3. Verificar que el usuario se creó en la BD
 * 4. Hacer login con las credenciales
 * 5. Verificar que el token es válido
 * 6. (Opcional) Verificar sesión en Redis
 *
 * Nivel: Medio (15% del esfuerzo)
 * Tecnologías: Jest + Supertest + Testcontainers
 */

const request = require("supertest");
const { GenericContainer, Wait } = require("testcontainers");
const { Pool } = require("pg");
const redis = require("redis");
const jwt = require("jsonwebtoken");

describe("Integration Tests - Auth Service: Registro y Login", () => {
  let app;
  let pgContainer;
  let redisContainer;
  let pgPool;
  let redisClient;
  let pgPort;
  let redisPort;

  // ============================================================================
  // SETUP: Levantar contenedores antes de los tests
  // ============================================================================
  beforeAll(async () => {
    console.log("🚀 Iniciando contenedores de PostgreSQL y Redis...");

    // Levantar PostgreSQL con Testcontainers
    pgContainer = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_USER: "testuser",
        POSTGRES_PASSWORD: "testpass",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/)
      )
      .withStartupTimeout(120000)
      .start();

    pgPort = pgContainer.getMappedPort(5432);
    console.log(`✅ PostgreSQL levantado en puerto ${pgPort}`);

    // Levantar Redis con Testcontainers
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .withStartupTimeout(120000)
      .start();

    redisPort = redisContainer.getMappedPort(6379);
    console.log(`✅ Redis levantado en puerto ${redisPort}`);

    // Configurar conexión a PostgreSQL
    pgPool = new Pool({
      host: "localhost",
      port: pgPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    // Crear tabla users
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla user_preferences (necesaria para el login)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        consulta_service_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla logs (necesaria para logTransaction)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50),
        status VARCHAR(20),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tablas creadas en PostgreSQL");

    // Configurar Redis client
    redisClient = redis.createClient({
      socket: {
        host: "localhost",
        port: redisPort,
      },
    });

    await redisClient.connect();
    console.log("✅ Redis client conectado");

    // Configurar variables de entorno para el servicio
    process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
    process.env.REDIS_URL = `redis://localhost:${redisPort}`;
    process.env.JWT_SECRET = "test-secret-key-for-integration-tests";
    process.env.NODE_ENV = "test";
    process.env.SERVICE_REGISTRY_URL = "http://localhost:9999"; // Mock (no necesario para estos tests)

    // Cargar la aplicación Express
    // IMPORTANTE: Cargar después de configurar las variables de entorno
    app = require("../index");

    console.log("✅ Aplicación cargada y lista para tests");
  }, 180000); // Timeout de 3 minutos para levantar contenedores

  // ============================================================================
  // TEARDOWN: Detener contenedores después de los tests
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

    if (pgContainer) {
      await pgContainer.stop();
      console.log("✅ Contenedor PostgreSQL detenido");
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log("✅ Contenedor Redis detenido");
    }
  }, 60000); // Timeout de 1 minuto para limpiar

  // ============================================================================
  // TEST 1: Registro de Usuario
  // ============================================================================
  describe("POST /register - Registro de Usuario", () => {
    const testUser = {
      username: "testuser123",
      email: "testuser@example.com",
      password: "SecurePass123!",
    };

    test("Debe registrar un nuevo usuario exitosamente", async () => {
      const response = await request(app)
        .post("/register")
        .send(testUser)
        .expect(201);

      // Verificar respuesta
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.username).toBe(testUser.username.toLowerCase()); // Normalizado
      expect(response.body.user.email).toBe(testUser.email.toLowerCase()); // Normalizado

      // Verificar que el token es válido
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty("id");
      expect(decoded.username).toBe(testUser.username.toLowerCase());
    });

    test("Debe crear el usuario en la base de datos", async () => {
      // Buscar el usuario en la BD
      const result = await pgPool.query(
        "SELECT id, username, email, password_hash FROM users WHERE username = $1",
        [testUser.username.toLowerCase()]
      );

      expect(result.rows.length).toBe(1);

      const user = result.rows[0];
      expect(user.username).toBe(testUser.username.toLowerCase());
      expect(user.email).toBe(testUser.email.toLowerCase());
      expect(user.password_hash).toBeTruthy();
      expect(user.password_hash).not.toBe(testUser.password); // Debe estar hasheada
    });

    test("Debe registrar el evento en logs", async () => {
      // Verificar que se creó un log de registro
      const result = await pgPool.query(
        "SELECT * FROM logs WHERE action = $1 AND status = $2",
        ["REGISTER", "SUCCESS"]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test("Debe rechazar registro con username duplicado", async () => {
      const response = await request(app)
        .post("/register")
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("ya existe");
    });

    test("Debe rechazar registro con email duplicado", async () => {
      const duplicateEmail = {
        username: "differentuser",
        email: testUser.email,
        password: "SecurePass123!",
      };

      const response = await request(app)
        .post("/register")
        .send(duplicateEmail)
        .expect(409);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("ya existe");
    });

    test("Debe rechazar registro con contraseña débil", async () => {
      const weakPassword = {
        username: "newuser",
        email: "newuser@example.com",
        password: "123", // Muy débil
      };

      const response = await request(app)
        .post("/register")
        .send(weakPassword)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // TEST 2: Login de Usuario
  // ============================================================================
  describe("POST /login - Login de Usuario", () => {
    const loginCredentials = {
      username: "testuser123",
      password: "SecurePass123!",
    };

    test("Debe hacer login exitosamente con credenciales correctas", async () => {
      const response = await request(app)
        .post("/login")
        .send(loginCredentials)
        .expect(200);

      // Verificar respuesta
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.username).toBe(
        loginCredentials.username.toLowerCase()
      );

      // Verificar token JWT
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty("id");
      expect(decoded.username).toBe(loginCredentials.username.toLowerCase());
    });

    test("Debe registrar el login en logs", async () => {
      // Verificar que se creó un log de login
      const result = await pgPool.query(
        "SELECT * FROM logs WHERE action = $1 AND status = $2",
        ["LOGIN", "SUCCESS"]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test("Debe rechazar login con contraseña incorrecta", async () => {
      const wrongPassword = {
        username: "testuser123",
        password: "WrongPassword123!",
      };

      const response = await request(app)
        .post("/login")
        .send(wrongPassword)
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    test("Debe rechazar login con usuario inexistente", async () => {
      const nonExistent = {
        username: "nonexistentuser",
        password: "SecurePass123!",
      };

      const response = await request(app)
        .post("/login")
        .send(nonExistent)
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    test("Debe normalizar username en login (case-insensitive)", async () => {
      // Login con username en mayúsculas
      const uppercaseLogin = {
        username: "TESTUSER123",
        password: "SecurePass123!",
      };

      const response = await request(app)
        .post("/login")
        .send(uppercaseLogin)
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user.username).toBe("testuser123");
    });
  });

  // ============================================================================
  // TEST 3: Flujo Completo (End-to-End)
  // ============================================================================
  describe("Flujo Completo: Registro → Login → Verificación", () => {
    test("Debe completar flujo de registro y login correctamente", async () => {
      const newUser = {
        username: "completeflowuser",
        email: "flowuser@example.com",
        password: "FlowTest123!",
      };

      // Paso 1: Registro
      const registerResponse = await request(app)
        .post("/register")
        .send(newUser)
        .expect(201);

      expect(registerResponse.body).toHaveProperty("token");
      const registerToken = registerResponse.body.token;

      // Paso 2: Verificar usuario en BD
      const dbUser = await pgPool.query(
        "SELECT id, username FROM users WHERE username = $1",
        [newUser.username.toLowerCase()]
      );
      expect(dbUser.rows.length).toBe(1);
      const userId = dbUser.rows[0].id;

      // Paso 3: Login con el mismo usuario
      const loginResponse = await request(app)
        .post("/login")
        .send({
          username: newUser.username,
          password: newUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty("token");
      const loginToken = loginResponse.body.token;

      // Paso 4: Verificar que ambos tokens son válidos
      const decodedRegister = jwt.verify(registerToken, process.env.JWT_SECRET);
      const decodedLogin = jwt.verify(loginToken, process.env.JWT_SECRET);

      expect(decodedRegister.id).toBe(userId);
      expect(decodedLogin.id).toBe(userId);
      expect(decodedRegister.username).toBe(newUser.username.toLowerCase());
      expect(decodedLogin.username).toBe(newUser.username.toLowerCase());

      // Paso 5: Verificar logs (debe haber 1 REGISTER y 1 LOGIN)
      const logs = await pgPool.query(
        "SELECT action, status FROM logs WHERE user_id = $1 ORDER BY created_at",
        [userId]
      );

      expect(logs.rows.length).toBeGreaterThanOrEqual(2);
      expect(
        logs.rows.some(
          (log) => log.action === "REGISTER" && log.status === "SUCCESS"
        )
      ).toBe(true);
      expect(
        logs.rows.some(
          (log) => log.action === "LOGIN" && log.status === "SUCCESS"
        )
      ).toBe(true);
    });
  });

  // ============================================================================
  // TEST 4: Redis Session Storage (Opcional)
  // ============================================================================
  describe("Redis Session Storage", () => {
    test("Debe poder almacenar y recuperar datos de sesión en Redis", async () => {
      const sessionKey = "test:session:123";
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
    });

    test("Debe expirar sesiones después del TTL", async () => {
      const sessionKey = "test:session:expire";
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
  });
});
