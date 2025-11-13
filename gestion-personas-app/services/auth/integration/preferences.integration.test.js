/**
 * Integration: Update user preferences (CU-010)
 * - Spin up PostgreSQL and Redis via Testcontainers
 * - Mock docker-controller to avoid real Docker actions
 * - Sign JWT and call PUT /preferences/consulta-service to toggle enabled
 * - Assert DB updated accordingly
 */

const request = require("supertest");
const { GenericContainer, Wait } = require("testcontainers");
const { Pool } = require("pg");
const redis = require("redis");
const jwt = require("jsonwebtoken");

// We'll mock the docker-controller used by index.js
let dockerModulePath;
beforeAll(() => {
  dockerModulePath = require.resolve("../docker-controller");
  jest.mock(dockerModulePath, () => ({
    startConsultaService: jest.fn().mockResolvedValue({ success: true, message: "mock-started", already_running: false }),
    stopConsultaService: jest.fn().mockResolvedValue({ success: true, message: "mock-stopped", already_stopped: false }),
    getContainerInfo: jest.fn().mockResolvedValue({ name: "consulta-service", state: "running" }),
  }));
});

describe("Auth Service - Update Preferences (consulta_service_enabled)", () => {
  let app;
  let pgContainer;
  let redisContainer;
  let pgPool;
  let redisClient;
  let pgPort;
  let redisPort;

  const TEST_JWT_SECRET = "test-secret-key-for-preferences";

  beforeAll(async () => {
    jest.setTimeout(180000);

    // Start Postgres
    pgContainer = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_USER: "testuser",
        POSTGRES_PASSWORD: "testpass",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
      .start();
    pgPort = pgContainer.getMappedPort(5432);

    // Start Redis
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    redisPort = redisContainer.getMappedPort(6379);

    // DB pool
    pgPool = new Pool({
      host: "localhost",
      port: pgPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    // Create minimal schema
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

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        consulta_service_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert user
    const userRes = await pgPool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username",
      ["prefuser", "prefuser@example.com", "hash"]
    );
    const user = userRes.rows[0];

    // preferences default row
    await pgPool.query(
      "INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)",
      [user.id]
    );

    // Redis client
    redisClient = redis.createClient({ socket: { host: "localhost", port: redisPort } });
    await redisClient.connect();

    // Env
    process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
    process.env.REDIS_URL = `redis://localhost:${redisPort}`;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = "test";

    // Load app
    app = require("../index");
  });

  afterAll(async () => {
    if (pgPool) await pgPool.end();
    if (redisClient) await redisClient.quit();
    if (pgContainer) await pgContainer.stop();
    if (redisContainer) await redisContainer.stop();
  });

  function authHeaderFor(user) {
    const token = jwt.sign({ id: user.id, username: user.username }, TEST_JWT_SECRET, { expiresIn: "1h" });
    return { Authorization: `Bearer ${token}` };
  }

  test("debe deshabilitar y habilitar el servicio de consulta (UPDATE user_preferences)", async () => {
    // Fetch user id
    const u = await pgPool.query("SELECT id, username FROM users WHERE username=$1", ["prefuser"]);
    const user = u.rows[0];

    // Disable (enabled=false)
    const disable = await request(app)
      .put("/preferences/consulta-service")
      .set(authHeaderFor(user))
      .send({ enabled: false })
      .expect(200);

    expect(disable.body).toHaveProperty("success", true);
    expect(disable.body).toHaveProperty("preferences.consulta_service_enabled", false);

    const dbAfterDisable = await pgPool.query(
      "SELECT consulta_service_enabled FROM user_preferences WHERE user_id=$1",
      [user.id]
    );
    expect(dbAfterDisable.rows[0].consulta_service_enabled).toBe(false);

    // Enable (enabled=true)
    const enable = await request(app)
      .put("/preferences/consulta-service")
      .set(authHeaderFor(user))
      .send({ enabled: true })
      .expect(200);

    expect(enable.body).toHaveProperty("success", true);
    expect(enable.body).toHaveProperty("preferences.consulta_service_enabled", true);

    const dbAfterEnable = await pgPool.query(
      "SELECT consulta_service_enabled FROM user_preferences WHERE user_id=$1",
      [user.id]
    );
    expect(dbAfterEnable.rows[0].consulta_service_enabled).toBe(true);
  });
});
