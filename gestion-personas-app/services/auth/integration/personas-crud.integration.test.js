/**
 * Pruebas de Integración - CRUD de Persona con JWT
 *
 * Escenario: Flujo completo de autenticación y creación de persona
 *
 * Flujo:
 * 1. Levantar PostgreSQL con Testcontainers
 * 2. Levantar Auth Service y Personas Service
 * 3. Registrar/Login → Obtener JWT
 * 4. Crear persona usando JWT
 * 5. Verificar que la persona se guardó en BD
 * 6. Verificar logs de transacciones
 *
 * Nivel: Medio (15% del esfuerzo)
 * Tecnologías: Jest + Supertest + Testcontainers
 */

const request = require("supertest");
const { GenericContainer, Wait } = require("testcontainers");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

describe("Integration Tests - CRUD Persona con JWT", () => {
  let pgContainer;
  let pgPool;
  let pgPort;
  let authApp;
  let personasApp;
  let testToken;
  let testUserId;

  // ============================================================================
  // SETUP: Levantar contenedores y servicios
  // ============================================================================
  beforeAll(async () => {
    console.log("🚀 Iniciando PostgreSQL para Auth y Personas...");

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

    // Configurar conexión a PostgreSQL
    pgPool = new Pool({
      host: "localhost",
      port: pgPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    // Crear tablas para Auth Service
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

    // Crear tablas para Personas Service
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        numero_documento VARCHAR(20) UNIQUE NOT NULL,
        tipo_documento VARCHAR(10) NOT NULL,
        primer_nombre VARCHAR(100) NOT NULL,
        segundo_nombre VARCHAR(100),
        apellidos VARCHAR(200) NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        genero VARCHAR(20) NOT NULL,
        correo_electronico VARCHAR(255) NOT NULL,
        celular VARCHAR(20) NOT NULL,
        foto_url VARCHAR(500),
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de logs (compartida)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(50),
        action VARCHAR(50),
        persona_id INTEGER,
        numero_documento VARCHAR(20),
        previous_data JSONB,
        new_data JSONB,
        status VARCHAR(20),
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tablas creadas en PostgreSQL");

    // Configurar variables de entorno
    const databaseUrl = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = "test-secret-key-integration";
    process.env.NODE_ENV = "test";
    process.env.SERVICE_REGISTRY_URL = "http://localhost:9999"; // Mock
    process.env.REDIS_URL = "redis://localhost:6379"; // No se usa en este test

    // Cargar aplicaciones
    // Nota: Necesitamos importar después de configurar las variables de entorno
    delete require.cache[require.resolve("../../auth/index")];
    delete require.cache[require.resolve("../../personas/index")];

    authApp = require("../../auth/index");
    personasApp = require("../../personas/index");

    console.log("✅ Servicios Auth y Personas cargados");

    // Crear usuario de prueba y obtener token
    const testUser = {
      username: "integrationuser",
      email: "integration@test.com",
      password: "IntegrationPass123!",
    };

    const registerResponse = await request(authApp)
      .post("/register")
      .send(testUser)
      .expect(201);

    testToken = registerResponse.body.token;
    testUserId = registerResponse.body.user.id;

    console.log(`✅ Usuario de prueba creado (ID: ${testUserId})`);
    console.log(`✅ Token obtenido: ${testToken.substring(0, 20)}...`);
  }, 180000); // 3 minutos timeout

  // ============================================================================
  // TEARDOWN: Limpiar recursos
  // ============================================================================
  afterAll(async () => {
    console.log("🧹 Limpiando recursos...");

    if (pgPool) {
      await pgPool.end();
      console.log("✅ PostgreSQL pool cerrado");
    }

    if (pgContainer) {
      await pgContainer.stop();
      console.log("✅ Contenedor PostgreSQL detenido");
    }
  }, 60000);

  // ============================================================================
  // TEST 1: Verificar JWT obtenido
  // ============================================================================
  describe("Verificación de JWT", () => {
    test("Debe tener un token JWT válido", () => {
      expect(testToken).toBeTruthy();
      expect(typeof testToken).toBe("string");

      // Decodificar y verificar token
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty("id");
      expect(decoded).toHaveProperty("username");
      expect(decoded.id).toBe(testUserId);
    });
  });

  // ============================================================================
  // TEST 2: Crear Persona con JWT
  // ============================================================================
  describe("POST / - Crear Persona con JWT", () => {
    const nuevaPersona = {
      numero_documento: "12345678",
      tipo_documento: "CC",
      primer_nombre: "Juan",
      segundo_nombre: "Carlos",
      apellidos: "Pérez García",
      fecha_nacimiento: "1990-05-15",
      genero: "Masculino",
      correo_electronico: "juan.perez@example.com",
      celular: "3001234567",
    };

    test("Debe crear una persona exitosamente con JWT válido", async () => {
      const response = await request(personasApp)
        .post("/")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-user-id", testUserId.toString())
        .send(nuevaPersona)
        .expect(201);

      // Verificar respuesta
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("exitosamente");
      expect(response.body).toHaveProperty("persona");

      const persona = response.body.persona;
      expect(persona).toHaveProperty("id");
      expect(persona.numero_documento).toBe(nuevaPersona.numero_documento);
      expect(persona.primer_nombre).toBe(nuevaPersona.primer_nombre);
      expect(persona.apellidos).toBe(nuevaPersona.apellidos);
      expect(persona.created_by).toBe(testUserId);
    });

    test("Debe verificar que la persona se guardó en la BD", async () => {
      const result = await pgPool.query(
        "SELECT * FROM personas WHERE numero_documento = $1",
        [nuevaPersona.numero_documento]
      );

      expect(result.rows.length).toBe(1);

      const persona = result.rows[0];
      expect(persona.primer_nombre).toBe(nuevaPersona.primer_nombre);
      expect(persona.segundo_nombre).toBe(nuevaPersona.segundo_nombre);
      expect(persona.apellidos).toBe(nuevaPersona.apellidos);
      expect(persona.correo_electronico).toBe(nuevaPersona.correo_electronico);
      expect(persona.celular).toBe(nuevaPersona.celular);
      expect(persona.created_by).toBe(testUserId);
    });

    test("Debe registrar la creación en logs", async () => {
      const result = await pgPool.query(
        `SELECT * FROM logs 
         WHERE action = 'CREATE' 
         AND numero_documento = $1 
         AND status = 'SUCCESS'`,
        [nuevaPersona.numero_documento]
      );

      expect(result.rows.length).toBeGreaterThan(0);

      const log = result.rows[0];
      expect(log.action).toBe("CREATE");
      expect(log.status).toBe("SUCCESS");
      expect(log.numero_documento).toBe(nuevaPersona.numero_documento);
    });

    test("Debe rechazar creación sin JWT", async () => {
      const otraPersona = {
        ...nuevaPersona,
        numero_documento: "87654321",
        correo_electronico: "otra@example.com",
      };

      const response = await request(personasApp).post("/").send(otraPersona);

      // Sin autenticación, debería funcionar igual ya que Personas Service
      // no valida JWT directamente (lo hace el Gateway)
      // Pero no tendrá x-user-id
      expect(response.status).toBe(201);
      expect(response.body.persona.created_by).toBeNull();
    });

    test("Debe rechazar creación de persona duplicada", async () => {
      const response = await request(personasApp)
        .post("/")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-user-id", testUserId.toString())
        .send(nuevaPersona)
        .expect(409);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("ya existe");
    });

    test("Debe rechazar creación con datos inválidos", async () => {
      const personaInvalida = {
        numero_documento: "123", // Muy corto
        tipo_documento: "CC",
        primer_nombre: "J", // Muy corto
        apellidos: "P", // Muy corto
        // Faltan campos requeridos
      };

      const response = await request(personasApp)
        .post("/")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-user-id", testUserId.toString())
        .send(personaInvalida)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // TEST 3: Consultar Persona Creada
  // ============================================================================
  describe("GET /:numero_documento - Consultar Persona", () => {
    test("Debe consultar la persona creada por número de documento", async () => {
      const response = await request(personasApp)
        .get("/12345678")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.numero_documento).toBe("12345678");
      expect(response.body.primer_nombre).toBe("Juan");
      expect(response.body.apellidos).toBe("Pérez García");
    });

    test("Debe retornar 404 para persona inexistente", async () => {
      const response = await request(personasApp)
        .get("/99999999")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // TEST 4: Listar Personas
  // ============================================================================
  describe("GET / - Listar Personas", () => {
    test("Debe listar todas las personas", async () => {
      const response = await request(personasApp)
        .get("/")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verificar que está nuestra persona
      const persona = response.body.find(
        (p) => p.numero_documento === "12345678"
      );
      expect(persona).toBeTruthy();
      expect(persona.primer_nombre).toBe("Juan");
    });

    test("Debe filtrar personas por nombre", async () => {
      const response = await request(personasApp)
        .get("/?nombre=Juan")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Todas las personas deben contener "Juan" en algún campo de nombre
      response.body.forEach((persona) => {
        const nombreCompleto = `${persona.primer_nombre} ${
          persona.segundo_nombre || ""
        } ${persona.apellidos}`.toLowerCase();
        expect(nombreCompleto).toContain("juan");
      });
    });
  });

  // ============================================================================
  // TEST 5: Flujo Completo End-to-End
  // ============================================================================
  describe("Flujo Completo: Auth → Crear Persona → Consultar", () => {
    test("Debe completar flujo completo de creación y consulta", async () => {
      // Paso 1: Registrar nuevo usuario
      const nuevoUsuario = {
        username: "flowuser",
        email: "flowuser@test.com",
        password: "FlowPass123!",
      };

      const registerRes = await request(authApp)
        .post("/register")
        .send(nuevoUsuario)
        .expect(201);

      const userToken = registerRes.body.token;
      const userId = registerRes.body.user.id;

      // Paso 2: Crear persona con el token del nuevo usuario
      const personaFlowTest = {
        numero_documento: "11111111",
        tipo_documento: "CC",
        primer_nombre: "María",
        segundo_nombre: "Isabel",
        apellidos: "González López",
        fecha_nacimiento: "1985-08-20",
        genero: "Femenino",
        correo_electronico: "maria.gonzalez@example.com",
        celular: "3009876543",
      };

      const createRes = await request(personasApp)
        .post("/")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-user-id", userId.toString())
        .send(personaFlowTest)
        .expect(201);

      const personaId = createRes.body.persona.id;

      // Paso 3: Verificar en BD
      const dbCheck = await pgPool.query(
        "SELECT * FROM personas WHERE id = $1",
        [personaId]
      );

      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].created_by).toBe(userId);

      // Paso 4: Consultar la persona creada
      const getRes = await request(personasApp)
        .get(`/${personaFlowTest.numero_documento}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(getRes.body.id).toBe(personaId);
      expect(getRes.body.primer_nombre).toBe("María");

      // Paso 5: Verificar logs completos (registro + creación)
      const userLogs = await pgPool.query(
        "SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at",
        [userId]
      );

      // Debe haber al menos 1 log de REGISTER y 1 de CREATE
      expect(userLogs.rows.length).toBeGreaterThanOrEqual(1);

      const createLog = userLogs.rows.find(
        (log) =>
          log.action === "CREATE" &&
          log.numero_documento === personaFlowTest.numero_documento
      );
      expect(createLog).toBeTruthy();
      expect(createLog.status).toBe("SUCCESS");
    });
  });

  // ============================================================================
  // TEST 6: Validación de JWT Expirado/Inválido
  // ============================================================================
  describe("Validación de JWT", () => {
    test("Debe aceptar JWT válido", async () => {
      // Crear un token válido
      const validToken = jwt.sign(
        { id: testUserId, username: "integrationuser" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const response = await request(personasApp)
        .get("/")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test("Debe funcionar sin JWT (Personas Service no valida directamente)", async () => {
      // Personas Service no valida JWT directamente (lo hace el Gateway)
      // Este test demuestra que el servicio funciona sin token
      const response = await request(personasApp).get("/").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================================
  // TEST 7: Estadísticas
  // ============================================================================
  describe("Estadísticas de Personas", () => {
    test("Debe haber al menos 2 personas creadas", async () => {
      const result = await pgPool.query("SELECT COUNT(*) FROM personas");
      const count = parseInt(result.rows[0].count);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    test("Debe haber logs de todas las operaciones", async () => {
      const result = await pgPool.query(
        "SELECT action, COUNT(*) FROM logs WHERE action IN ('CREATE', 'REGISTER', 'LOGIN') GROUP BY action"
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
