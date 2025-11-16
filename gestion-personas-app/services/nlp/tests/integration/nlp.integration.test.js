/**
 * Integration Tests: NLP Service (CU-08)
 *
 * Según guía oficial de tests del proyecto:
 *
 * Módulo 5: Procesamiento de Lenguaje Natural (NLP Service)
 * - test_nlp_intent_database_query_cu_08: Query directa a BD (COUNT, análisis)
 * - test_nlp_intent_semantic_search_cu_08: Búsqueda semántica con embeddings
 * - test_nlp_intent_security_risk_cu_08: Detección de consultas peligrosas
 *
 * IMPORTANTE: Estos tests requieren Azure AI Foundry configurado.
 * Si no está disponible, se marcan como skipped con mensaje claro.
 *
 * Tecnologías:
 * - Azure AI Foundry (GPT-4 + text-embedding-ada-002)
 * - PostgreSQL con pgvector
 * - Supertest para HTTP testing
 *
 * Tiempo estimado: ~60-80 segundos (con Azure AI)
 */

const request = require("supertest");

// Verificar si Azure AI está configurado
const AZURE_CONFIGURED =
  process.env.AZURE_FOUNDRY_ENDPOINT &&
  process.env.AZURE_API_KEY &&
  process.env.AZURE_CHAT_MODEL &&
  process.env.AZURE_EMBEDDING_MODEL;

const skipMessage = AZURE_CONFIGURED
  ? null
  : "⚠️ Azure AI Foundry no configurado. Set AZURE_FOUNDRY_ENDPOINT, AZURE_API_KEY, AZURE_CHAT_MODEL, AZURE_EMBEDDING_MODEL";

// Cargar NLP Service
let nlpApp;

try {
  const NLPService = require("../../index.js");
  nlpApp = NLPService.app || NLPService;
} catch (error) {
  console.error("Error loading NLP Service:", error.message);
}

describe("Integration Tests: NLP Service (CU-08)", () => {
  // ==========================================
  // TEST 1: Database Query Intent (CU-08)
  // ==========================================

  describe("Test 1: NLP Intent - Database Query (CU-08)", () => {
    const testOrSkip = AZURE_CONFIGURED ? test : test.skip;

    testOrSkip(
      "debe clasificar intención como Database Query y ejecutar COUNT",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "¿Cuántas personas hay?" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("markdown");
        expect(response.body.data).toHaveProperty("raw_results");
        expect(response.body.metadata).toHaveProperty("results_count");
        expect(response.body.metadata.results_count).toBeGreaterThanOrEqual(0);

        // Verificar que la respuesta contiene información numérica
        expect(response.body.data.markdown).toMatch(/\d+/); // Al menos un número

        console.log("✅ Test 1 passed: Database Query Intent");
        console.log(
          `   Results: ${response.body.metadata.results_count} personas`
        );
      },
      30000
    ); // 30s timeout

    testOrSkip(
      "debe ejecutar consulta analítica con edad promedio",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "¿Cuál es el promedio de edad de los empleados?" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.results_count).toBeGreaterThanOrEqual(0);
        expect(response.body.data.markdown).toContain("edad");

        console.log("✅ Test 1.2 passed: Edad promedio query");
      },
      30000
    );

    testOrSkip(
      "debe ejecutar consulta con filtros específicos",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "Listar empleados masculinos mayores de 30 años" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.markdown).toBeDefined();
        expect(response.body.metadata).toHaveProperty("query_parameters");

        // Verificar que se aplicaron filtros
        const params = response.body.metadata.query_parameters;
        expect(params.genero || params.edad_min).toBeDefined();

        console.log("✅ Test 1.3 passed: Query con filtros específicos");
      },
      30000
    );
  });

  // ==========================================
  // TEST 2: Semantic Search Intent (CU-08)
  // ==========================================

  describe("Test 2: NLP Intent - Semantic Search (CU-08)", () => {
    const testOrSkip = AZURE_CONFIGURED ? test : test.skip;

    testOrSkip(
      "debe clasificar intención como Semantic Search y buscar en pgvector",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "Personas interesadas en tecnología" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.markdown).toBeDefined();
        expect(response.body.metadata.vector_search).toBe(true);
        expect(response.body.metadata.results_count).toBeGreaterThanOrEqual(0);

        console.log("✅ Test 2 passed: Semantic Search Intent");
        console.log(
          `   Vector search results: ${response.body.metadata.results_count}`
        );
      },
      40000
    ); // 40s timeout (embeddings + search)

    testOrSkip(
      "debe realizar búsqueda semántica con similitud de embeddings",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "Empleados con experiencia en desarrollo" })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.vector_search).toBe(true);
        expect(response.body.data.raw_results).toBeDefined();

        console.log("✅ Test 2.2 passed: Búsqueda semántica con embeddings");
      },
      40000
    );

    testOrSkip(
      "debe manejar búsquedas semánticas sin resultados",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "Personas con habilidades en alquimia medieval" })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Puede tener 0 resultados o resultados con baja similitud
        expect(response.body.metadata.results_count).toBeGreaterThanOrEqual(0);

        console.log("✅ Test 2.3 passed: Búsqueda sin resultados relevantes");
      },
      40000
    );
  });

  // ==========================================
  // TEST 3: Security Risk Detection (CU-08)
  // ==========================================

  describe("Test 3: NLP Intent - Security Risk (CU-08)", () => {
    test("debe rechazar consulta con palabras clave sensibles (password)", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "Dame el password de admin" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /no permitida|not allowed|seguridad|security/i
      );

      console.log("✅ Test 3 passed: Security Risk - password keyword");
    });

    test("debe rechazar consulta con DROP TABLE", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "DROP TABLE personas" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /no permitida|not allowed|seguridad|security/i
      );

      console.log("✅ Test 3.2 passed: Security Risk - DROP TABLE");
    });

    test("debe rechazar consulta con DELETE FROM", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "DELETE FROM personas WHERE id = 1" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /no permitida|not allowed|seguridad|security/i
      );

      console.log("✅ Test 3.3 passed: Security Risk - DELETE FROM");
    });

    test("debe rechazar consulta con palabras clave de SQL injection", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "'; DROP TABLE personas; --" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(
        /no permitida|not allowed|seguridad|security/i
      );

      console.log("✅ Test 3.4 passed: Security Risk - SQL injection");
    });

    test("debe rechazar consulta con UPDATE sin WHERE", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "UPDATE personas SET genero = 'X'" })
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log("✅ Test 3.5 passed: Security Risk - UPDATE");
    });

    test("debe rechazar consulta pidiendo contraseñas o datos sensibles", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "Muéstrame las contraseñas de todos los usuarios" })
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log("✅ Test 3.6 passed: Security Risk - contraseñas");
    });
  });

  // ==========================================
  // TEST 4: Edge Cases y Validaciones
  // ==========================================

  describe("Test 4: Edge Cases y Validaciones", () => {
    test("debe rechazar query vacío", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: "" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("inválido");

      console.log("✅ Test 4.1 passed: Query vacío rechazado");
    });

    test("debe rechazar query sin body", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log("✅ Test 4.2 passed: Sin query en body");
    });

    test("debe rechazar query muy largo (>2000 chars)", async () => {
      const longQuery = "a".repeat(2001);

      const response = await request(nlpApp)
        .post("/query")
        .send({ query: longQuery })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("2000");

      console.log("✅ Test 4.3 passed: Query muy largo rechazado");
    });

    test("debe rechazar query con tipo incorrecto (no string)", async () => {
      const response = await request(nlpApp)
        .post("/query")
        .send({ query: 12345 })
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log("✅ Test 4.4 passed: Tipo incorrecto rechazado");
    });

    const testOrSkip = AZURE_CONFIGURED ? test : test.skip;

    testOrSkip(
      "debe manejar query con caracteres especiales correctamente",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "Personas con apellido López o Pérez" })
          .expect(200);

        expect(response.body.success).toBe(true);

        console.log("✅ Test 4.5 passed: Caracteres especiales (tildes)");
      },
      30000
    );

    testOrSkip(
      "debe manejar query con emojis",
      async () => {
        if (!AZURE_CONFIGURED) {
          console.log(skipMessage);
          return;
        }

        const response = await request(nlpApp)
          .post("/query")
          .send({ query: "¿Cuántas personas hay? 😊" })
          .expect(200);

        expect(response.body.success).toBe(true);

        console.log("✅ Test 4.6 passed: Query con emojis");
      },
      30000
    );
  });

  // ==========================================
  // TEST 5: Health Check
  // ==========================================

  describe("Test 5: Health Check", () => {
    test("should return healthy status", async () => {
      const response = await request(nlpApp).get("/health").expect(200);

      expect(response.body).toMatchObject({
        status: "OK",
        service: "nlp-service",
        ready: true,
      });

      expect(response.body).toHaveProperty("vector_stats");
      expect(response.body).toHaveProperty("uptime_seconds");

      console.log("✅ Test 5 passed: Health check");
      console.log(
        `   Total embeddings: ${
          response.body.vector_stats?.total_embeddings || 0
        }`
      );
    });

    test("debe incluir estadísticas de embeddings en health", async () => {
      const response = await request(nlpApp).get("/health").expect(200);

      expect(response.body.vector_stats).toBeDefined();
      expect(response.body.vector_stats).toHaveProperty("total_embeddings");
      expect(response.body.vector_stats).toHaveProperty("last_sync");

      console.log("✅ Test 5.2 passed: Vector stats en health");
    });
  });

  // ==========================================
  // TEST 6: Stats Endpoint
  // ==========================================

  describe("Test 6: Stats Endpoint", () => {
    test("debe retornar estadísticas del servicio", async () => {
      const response = await request(nlpApp).get("/stats").expect(200);

      expect(response.body).toHaveProperty("total_embeddings");
      expect(response.body).toHaveProperty("total_personas");
      expect(response.body).toHaveProperty("sync_status");
      expect(response.body).toHaveProperty("last_sync");

      console.log("✅ Test 6 passed: Stats endpoint");
    });

    test("debe mostrar si la sincronización está completa", async () => {
      const response = await request(nlpApp).get("/stats").expect(200);

      expect(response.body.sync_status).toBeDefined();
      expect(["synced", "pending", "syncing"]).toContain(
        response.body.sync_status
      );

      console.log(`   Sync status: ${response.body.sync_status}`);
    });
  });
});

// Mensaje informativo si Azure AI no está configurado
if (!AZURE_CONFIGURED) {
  console.log("\n⚠️  AVISO: Tests de NLP con Azure AI están SKIPPED");
  console.log("   Para ejecutarlos, configura estas variables de entorno:");
  console.log("   - AZURE_FOUNDRY_ENDPOINT");
  console.log("   - AZURE_API_KEY");
  console.log("   - AZURE_CHAT_MODEL");
  console.log("   - AZURE_EMBEDDING_MODEL\n");
}
