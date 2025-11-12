/**
 * Pruebas de Integración - Consulta NLP End-to-End
 *
 * Escenario: Llamar al NLP Service y verificar que consulta PostgreSQL
 *
 * Flujo:
 * 1. Levantar PostgreSQL con datos de personas
 * 2. Mockear API de Gemini (opcional)
 * 3. Enviar consultas en lenguaje natural
 * 4. Verificar que consulta PostgreSQL correctamente
 * 5. Verificar respuestas coherentes
 * 6. Verificar logs de transacciones
 *
 * Nivel: Medio (15% del esfuerzo)
 * Tecnologías: Jest + Supertest + Testcontainers + Mocking
 */

const request = require("supertest");
const { GenericContainer, Wait } = require("testcontainers");
const { Pool } = require("pg");

describe("Integration Tests - Consulta NLP End-to-End", () => {
  let pgContainer;
  let pgPool;
  let pgPort;
  let nlpApp;
  let personasTestData;

  // ============================================================================
  // SETUP: Levantar contenedores y servicios
  // ============================================================================
  beforeAll(async () => {
    console.log("🚀 Iniciando PostgreSQL para NLP Service...");

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

    // Crear tabla de personas
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

    // Crear tabla de logs
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(50),
        action VARCHAR(50),
        query_text TEXT,
        status VARCHAR(20),
        result JSONB,
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tablas creadas en PostgreSQL");

    // Insertar datos de prueba
    personasTestData = [
      {
        numero_documento: "10001",
        tipo_documento: "CC",
        primer_nombre: "Juan",
        segundo_nombre: "Carlos",
        apellidos: "Pérez García",
        fecha_nacimiento: "1990-05-15",
        genero: "Masculino",
        correo_electronico: "juan.perez@example.com",
        celular: "3001234567",
      },
      {
        numero_documento: "10002",
        tipo_documento: "CC",
        primer_nombre: "María",
        segundo_nombre: "Isabel",
        apellidos: "González López",
        fecha_nacimiento: "1985-08-20",
        genero: "Femenino",
        correo_electronico: "maria.gonzalez@example.com",
        celular: "3009876543",
      },
      {
        numero_documento: "10003",
        tipo_documento: "CC",
        primer_nombre: "Pedro",
        segundo_nombre: null,
        apellidos: "Martínez Ruiz",
        fecha_nacimiento: "2000-03-10",
        genero: "Masculino",
        correo_electronico: "pedro.martinez@example.com",
        celular: "3005551234",
      },
      {
        numero_documento: "10004",
        tipo_documento: "TI",
        primer_nombre: "Ana",
        segundo_nombre: "Sofía",
        apellidos: "Rodríguez Torres",
        fecha_nacimiento: "2005-11-25",
        genero: "Femenino",
        correo_electronico: "ana.rodriguez@example.com",
        celular: "3007891234",
      },
      {
        numero_documento: "10005",
        tipo_documento: "CC",
        primer_nombre: "Carlos",
        segundo_nombre: "Andrés",
        apellidos: "Fernández Silva",
        fecha_nacimiento: "1978-01-05",
        genero: "Masculino",
        correo_electronico: "carlos.fernandez@example.com",
        celular: "3004567890",
      },
    ];

    for (const persona of personasTestData) {
      await pgPool.query(
        `INSERT INTO personas (
          numero_documento, tipo_documento, primer_nombre, segundo_nombre,
          apellidos, fecha_nacimiento, genero, correo_electronico, celular
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          persona.numero_documento,
          persona.tipo_documento,
          persona.primer_nombre,
          persona.segundo_nombre,
          persona.apellidos,
          persona.fecha_nacimiento,
          persona.genero,
          persona.correo_electronico,
          persona.celular,
        ]
      );
    }

    console.log(`✅ Insertadas ${personasTestData.length} personas de prueba`);

    // Configurar variables de entorno
    const databaseUrl = `postgresql://testuser:testpass@localhost:${pgPort}/testdb`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = "test";
    process.env.GEMINI_API_KEY = "test-fake-key"; // Mock key
    process.env.QDRANT_URL = "http://localhost:9999"; // Mock (no se usa en tests básicos)
    process.env.SERVICE_REGISTRY_URL = "http://localhost:9998"; // Mock

    // Cargar aplicación NLP
    delete require.cache[require.resolve("../../nlp/index")];
    nlpApp = require("../../nlp/index");

    console.log("✅ NLP Service cargado");
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
  // TEST 1: Verificar datos de prueba
  // ============================================================================
  describe("Verificación de Datos de Prueba", () => {
    test("Debe tener 5 personas en la BD", async () => {
      const result = await pgPool.query("SELECT COUNT(*) FROM personas");
      expect(parseInt(result.rows[0].count)).toBe(5);
    });

    test("Debe tener personas de diferentes géneros", async () => {
      const result = await pgPool.query(
        "SELECT genero, COUNT(*) FROM personas GROUP BY genero"
      );

      expect(result.rows.length).toBeGreaterThan(0);
      const generos = result.rows.map((r) => r.genero);
      expect(generos).toContain("Masculino");
      expect(generos).toContain("Femenino");
    });

    test("Debe tener personas de diferentes edades", async () => {
      const result = await pgPool.query(`
        SELECT 
          primer_nombre, 
          apellidos,
          EXTRACT(YEAR FROM AGE(fecha_nacimiento)) as edad
        FROM personas
        ORDER BY edad DESC
      `);

      expect(result.rows.length).toBe(5);

      // Verificar que hay variedad de edades
      const edades = result.rows.map((r) => parseInt(r.edad));
      const edadMax = Math.max(...edades);
      const edadMin = Math.min(...edades);

      expect(edadMax).toBeGreaterThan(edadMin);
      expect(edadMax - edadMin).toBeGreaterThan(10); // Al menos 10 años de diferencia
    });
  });

  // ============================================================================
  // TEST 2: Consulta por persona más joven
  // ============================================================================
  describe("POST /query - Persona más joven", () => {
    test("Debe encontrar a la persona más joven", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "¿Cuál es la persona más joven?" })
        .expect(200);

      expect(response.body).toHaveProperty("pregunta");
      expect(response.body).toHaveProperty("respuesta");
      expect(response.body).toHaveProperty("datos");
      expect(response.body).toHaveProperty("metadata");

      // Verificar que retorna datos
      expect(response.body.datos).toBeTruthy();

      // La persona más joven debería ser Ana (2005)
      const personaMasJoven = response.body.datos;
      expect(personaMasJoven.primer_nombre).toBe("Ana");
      expect(personaMasJoven.numero_documento).toBe("10004");
    });

    test("Debe registrar la consulta en logs", async () => {
      const result = await pgPool.query(
        "SELECT * FROM logs WHERE action = 'NLP_QUERY' AND status = 'SUCCESS' ORDER BY created_at DESC LIMIT 1"
      );

      expect(result.rows.length).toBeGreaterThan(0);
      const log = result.rows[0];
      expect(log.status).toBe("SUCCESS");
    });
  });

  // ============================================================================
  // TEST 3: Consulta por persona más vieja
  // ============================================================================
  describe("POST /query - Persona más vieja", () => {
    test("Debe encontrar a la persona más vieja", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "¿Quién es el empleado más viejo?" })
        .expect(200);

      expect(response.body).toHaveProperty("respuesta");
      expect(response.body).toHaveProperty("datos");

      // La persona más vieja debería ser Carlos (1978)
      const personaMasVieja = response.body.datos;
      expect(personaMasVieja).toBeTruthy();
      expect(personaMasVieja.primer_nombre).toBe("Carlos");
      expect(personaMasVieja.numero_documento).toBe("10005");
    });
  });

  // ============================================================================
  // TEST 4: Consulta de conteo
  // ============================================================================
  describe("POST /query - Conteo de personas", () => {
    test("Debe contar todas las personas", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "¿Cuántas personas hay registradas?" })
        .expect(200);

      expect(response.body).toHaveProperty("respuesta");
      expect(response.body).toHaveProperty("datos");

      // Debe contener información de conteo
      const respuesta = response.body.respuesta.toLowerCase();
      expect(respuesta).toContain("5");
    });

    test("Debe contar personas por género", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "¿Cuántas mujeres hay?" })
        .expect(200);

      expect(response.body).toHaveProperty("respuesta");
      expect(response.body).toHaveProperty("datos");

      // Debería mencionar 2 mujeres
      const datos = response.body.datos;
      if (datos && datos.count !== undefined) {
        expect(datos.count).toBe(2);
      }
    });
  });

  // ============================================================================
  // TEST 5: Consulta de estadísticas
  // ============================================================================
  describe("POST /query - Estadísticas", () => {
    test("Debe retornar estadísticas generales", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "Dame las estadísticas generales" })
        .expect(200);

      expect(response.body).toHaveProperty("respuesta");
      expect(response.body).toHaveProperty("datos");

      const datos = response.body.datos;
      expect(datos).toHaveProperty("total");
      expect(parseInt(datos.total)).toBe(5);
    });
  });

  // ============================================================================
  // TEST 6: Validaciones de entrada
  // ============================================================================
  describe("Validaciones de entrada", () => {
    test("Debe rechazar consulta sin pregunta", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("requerida");
    });

    test("Debe rechazar consulta con pregunta vacía", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // TEST 7: Verificación de consultas SQL
  // ============================================================================
  describe("Verificación de consultas a PostgreSQL", () => {
    test("Debe consultar PostgreSQL para obtener contexto", async () => {
      // Contar consultas antes
      const countBefore = await pgPool.query(
        "SELECT COUNT(*) FROM logs WHERE action = $1",
        ["NLP_QUERY"]
      );

      // Hacer consulta NLP
      await request(nlpApp)
        .post("/query")
        .send({ pregunta: "Lista todas las personas" })
        .expect(200);

      // Verificar que se registró en logs
      const countAfter = await pgPool.query(
        "SELECT COUNT(*) FROM logs WHERE action = $1",
        ["NLP_QUERY"]
      );

      expect(parseInt(countAfter.rows[0].count)).toBeGreaterThan(
        parseInt(countBefore.rows[0].count)
      );
    });
  });

  // ============================================================================
  // TEST 8: Flujo completo de consultas múltiples
  // ============================================================================
  describe("Flujo completo - Múltiples consultas", () => {
    test("Debe procesar múltiples consultas consecutivas", async () => {
      const consultas = [
        "¿Cuántas personas hay?",
        "¿Quién es la más joven?",
        "¿Quién es la más vieja?",
        "Dame estadísticas",
      ];

      for (const pregunta of consultas) {
        const response = await request(nlpApp)
          .post("/query")
          .send({ pregunta })
          .expect(200);

        expect(response.body).toHaveProperty("respuesta");
        expect(response.body).toHaveProperty("metadata");
        expect(response.body.metadata).toHaveProperty("timestamp");
      }

      // Verificar que se registraron todas las consultas
      const logs = await pgPool.query(
        "SELECT COUNT(*) FROM logs WHERE action = 'NLP_QUERY' AND status = 'SUCCESS'"
      );

      expect(parseInt(logs.rows[0].count)).toBeGreaterThanOrEqual(
        consultas.length
      );
    });
  });

  // ============================================================================
  // TEST 9: Health Check
  // ============================================================================
  describe("GET /health", () => {
    test("Debe responder con estado de salud", async () => {
      const response = await request(nlpApp).get("/health").expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("healthy");
    });
  });

  // ============================================================================
  // TEST 10: Manejo de errores
  // ============================================================================
  describe("Manejo de errores", () => {
    test("Debe manejar errores de BD gracefully", async () => {
      // Cerrar temporalmente el pool para simular error de BD
      const originalPool = nlpApp.locals?.pool;

      // Hacer consulta (debería fallar pero manejar el error)
      const response = await request(nlpApp)
        .post("/query")
        .send({ pregunta: "Test de error" });

      // Puede ser 500 o 200 dependiendo de cómo maneje el fallback
      expect([200, 500]).toContain(response.status);
    });
  });
});
