/**
 * Pruebas de Integración - Service Registry Discovery
 *
 * Escenario: Service Registry con registro y descubrimiento de servicios
 *
 * Flujo:
 * 1. Levantar Service Registry
 * 2. Registrar servicios (Personas Service, Auth Service)
 * 3. Verificar registro exitoso
 * 4. Descubrir servicios por nombre
 * 5. Verificar heartbeats
 * 6. Verificar health checks
 * 7. Simular caída de servicio
 * 8. Verificar detección de servicios caídos
 *
 * Nivel: Medio (15% del esfuerzo)
 * Tecnologías: Jest + Supertest + Axios
 */

const request = require("supertest");
const axios = require("axios");

describe("Integration Tests - Service Registry Discovery", () => {
  let registryApp;
  let registeredServices;

  // ============================================================================
  // SETUP: Levantar Service Registry
  // ============================================================================
  beforeAll(async () => {
    console.log("🚀 Iniciando Service Registry...");

    // Configurar variables de entorno
    process.env.NODE_ENV = "test";
    process.env.SERVICE_REGISTRY_PORT = "3010";

    // Cargar aplicación Service Registry
    delete require.cache[require.resolve("../../registry/index")];
    registryApp = require("../../registry/index");

    registeredServices = [];

    console.log("✅ Service Registry cargado");
  }, 60000);

  // ============================================================================
  // TEARDOWN: Limpiar recursos
  // ============================================================================
  afterAll(async () => {
    console.log("🧹 Limpiando recursos...");

    // Deregistrar servicios
    for (const serviceId of registeredServices) {
      try {
        await request(registryApp)
          .delete(`/deregister/${serviceId}`)
          .expect(200);
      } catch (error) {
        console.log(`Error deregistrando ${serviceId}:`, error.message);
      }
    }

    console.log("✅ Servicios deregistrados");
  }, 30000);

  // ============================================================================
  // TEST 1: Health Check del Registry
  // ============================================================================
  describe("GET /health - Service Registry Health", () => {
    test("Debe responder con estado de salud", async () => {
      const response = await request(registryApp).get("/health").expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("healthy");
    });
  });

  // ============================================================================
  // TEST 2: Registrar Servicio
  // ============================================================================
  describe("POST /register - Registrar Servicio", () => {
    test("Debe registrar Personas Service exitosamente", async () => {
      const serviceData = {
        serviceId: "personas-service-test-1",
        name: "personas-service",
        host: "localhost",
        port: 3002,
        protocol: "http",
        metadata: {
          version: "1.0.0",
          tags: ["personas", "crud"],
          description: "Servicio de gestión de personas",
        },
      };

      const response = await request(registryApp)
        .post("/register")
        .send(serviceData)
        .expect(201);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("registered successfully");
      expect(response.body).toHaveProperty("service");
      expect(response.body.service.serviceId).toBe(serviceData.serviceId);
      expect(response.body.service.name).toBe(serviceData.name);
      expect(response.body.service.url).toBe(`http://localhost:3002`);
      expect(response.body.service.status).toBe("UP");

      registeredServices.push(serviceData.serviceId);
    });

    test("Debe registrar Auth Service exitosamente", async () => {
      const serviceData = {
        serviceId: "auth-service-test-1",
        name: "auth-service",
        host: "localhost",
        port: 3001,
        protocol: "http",
        metadata: {
          version: "1.0.0",
          tags: ["auth", "security"],
          description: "Servicio de autenticación",
        },
      };

      const response = await request(registryApp)
        .post("/register")
        .send(serviceData)
        .expect(201);

      expect(response.body.service.serviceId).toBe(serviceData.serviceId);
      expect(response.body.service.name).toBe(serviceData.name);

      registeredServices.push(serviceData.serviceId);
    });

    test("Debe registrar NLP Service exitosamente", async () => {
      const serviceData = {
        serviceId: "nlp-service-test-1",
        name: "nlp-service",
        host: "localhost",
        port: 3004,
        protocol: "http",
        metadata: {
          version: "1.0.0",
          tags: ["nlp", "ai"],
        },
      };

      const response = await request(registryApp)
        .post("/register")
        .send(serviceData)
        .expect(201);

      expect(response.body.service.name).toBe("nlp-service");

      registeredServices.push(serviceData.serviceId);
    });

    test("Debe rechazar registro sin campos requeridos", async () => {
      const invalidData = {
        name: "incomplete-service",
        // Faltan: serviceId, host, port
      };

      const response = await request(registryApp)
        .post("/register")
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    test("Debe permitir re-registrar el mismo servicio (actualización)", async () => {
      const serviceData = {
        serviceId: "personas-service-test-1",
        name: "personas-service",
        host: "localhost",
        port: 3002,
        protocol: "http",
        metadata: {
          version: "1.0.1", // Nueva versión
          tags: ["personas", "crud", "updated"],
        },
      };

      const response = await request(registryApp)
        .post("/register")
        .send(serviceData)
        .expect(201);

      expect(response.body.service.serviceId).toBe(serviceData.serviceId);
    });
  });

  // ============================================================================
  // TEST 3: Listar Servicios
  // ============================================================================
  describe("GET /services - Listar Servicios", () => {
    test("Debe listar todos los servicios registrados", async () => {
      const response = await request(registryApp).get("/services").expect(200);

      expect(response.body).toHaveProperty("services");
      expect(Array.isArray(response.body.services)).toBe(true);
      expect(response.body.services.length).toBeGreaterThanOrEqual(3);

      // Verificar que están nuestros servicios
      const serviceNames = response.body.services.map((s) => s.name);
      expect(serviceNames).toContain("personas-service");
      expect(serviceNames).toContain("auth-service");
      expect(serviceNames).toContain("nlp-service");
    });

    test("Debe incluir información detallada de cada servicio", async () => {
      const response = await request(registryApp).get("/services").expect(200);

      const personasService = response.body.services.find(
        (s) => s.serviceId === "personas-service-test-1"
      );

      expect(personasService).toBeTruthy();
      expect(personasService).toHaveProperty("serviceId");
      expect(personasService).toHaveProperty("name");
      expect(personasService).toHaveProperty("url");
      expect(personasService).toHaveProperty("status");
      expect(personasService).toHaveProperty("registeredAt");
      expect(personasService).toHaveProperty("lastHeartbeat");
    });
  });

  // ============================================================================
  // TEST 4: Descubrir Servicios por Nombre
  // ============================================================================
  describe("GET /discover/:serviceName - Descubrir Servicio", () => {
    test("Debe descubrir Personas Service por nombre", async () => {
      const response = await request(registryApp)
        .get("/discover/personas-service")
        .expect(200);

      expect(response.body).toHaveProperty("service");
      expect(response.body.service).toBe("personas-service");
      expect(response.body).toHaveProperty("instances");
      expect(Array.isArray(response.body.instances)).toBe(true);
      expect(response.body.instances.length).toBeGreaterThan(0);

      // Verificar primera instancia
      const instance = response.body.instances[0];
      expect(instance).toHaveProperty("serviceId");
      expect(instance).toHaveProperty("url");
      expect(instance.url).toContain("http://localhost:3002");
    });

    test("Debe descubrir Auth Service por nombre", async () => {
      const response = await request(registryApp)
        .get("/discover/auth-service")
        .expect(200);

      expect(response.body.service).toBe("auth-service");
      expect(response.body.instances.length).toBeGreaterThan(0);
      expect(response.body.instances[0].url).toContain("http://localhost:3001");
    });

    test("Debe retornar 404 para servicio no registrado", async () => {
      const response = await request(registryApp)
        .get("/discover/nonexistent-service")
        .expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("not found");
    });

    test("Debe retornar instancia seleccionada (load balancing)", async () => {
      const response = await request(registryApp)
        .get("/discover/personas-service")
        .expect(200);

      expect(response.body).toHaveProperty("instance");
      expect(response.body.instance).toHaveProperty("url");
      expect(response.body.instance).toHaveProperty("serviceId");
    });
  });

  // ============================================================================
  // TEST 5: Heartbeat
  // ============================================================================
  describe("POST /heartbeat/:serviceId - Heartbeat", () => {
    test("Debe actualizar heartbeat de servicio existente", async () => {
      const response = await request(registryApp)
        .post("/heartbeat/personas-service-test-1")
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("updated");
    });

    test("Debe retornar 404 para servicio no registrado", async () => {
      const response = await request(registryApp)
        .post("/heartbeat/nonexistent-service-id")
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });

    test("Debe mantener servicio UP después de heartbeat", async () => {
      await request(registryApp)
        .post("/heartbeat/personas-service-test-1")
        .expect(200);

      const response = await request(registryApp).get("/services").expect(200);

      const personasService = response.body.services.find(
        (s) => s.serviceId === "personas-service-test-1"
      );

      expect(personasService.status).toBe("UP");
    });
  });

  // ============================================================================
  // TEST 6: Deregistrar Servicio
  // ============================================================================
  describe("DELETE /deregister/:serviceId - Deregistrar Servicio", () => {
    test("Debe deregistrar servicio exitosamente", async () => {
      // Registrar servicio temporal
      const tempService = {
        serviceId: "temp-service-test",
        name: "temp-service",
        host: "localhost",
        port: 9999,
      };

      await request(registryApp)
        .post("/register")
        .send(tempService)
        .expect(201);

      // Deregistrar
      const response = await request(registryApp)
        .delete("/deregister/temp-service-test")
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("deregistered");

      // Verificar que ya no está
      const listResponse = await request(registryApp)
        .get("/services")
        .expect(200);

      const found = listResponse.body.services.find(
        (s) => s.serviceId === "temp-service-test"
      );
      expect(found).toBeFalsy();
    });

    test("Debe retornar 404 al deregistrar servicio inexistente", async () => {
      const response = await request(registryApp)
        .delete("/deregister/nonexistent-service")
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ============================================================================
  // TEST 7: Health Status
  // ============================================================================
  describe("GET /status - Estado del Registry", () => {
    test("Debe retornar estadísticas del registry", async () => {
      const response = await request(registryApp).get("/status").expect(200);

      expect(response.body).toHaveProperty("totalServices");
      expect(response.body).toHaveProperty("healthyServices");
      expect(response.body).toHaveProperty("unhealthyServices");

      expect(response.body.totalServices).toBeGreaterThanOrEqual(3);
      expect(response.body.healthyServices).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // TEST 8: Múltiples Instancias del Mismo Servicio
  // ============================================================================
  describe("Múltiples Instancias", () => {
    test("Debe registrar múltiples instancias del mismo servicio", async () => {
      const instance1 = {
        serviceId: "personas-service-instance-2",
        name: "personas-service",
        host: "localhost",
        port: 3102,
      };

      const instance2 = {
        serviceId: "personas-service-instance-3",
        name: "personas-service",
        host: "localhost",
        port: 3103,
      };

      await request(registryApp).post("/register").send(instance1).expect(201);

      await request(registryApp).post("/register").send(instance2).expect(201);

      registeredServices.push(instance1.serviceId, instance2.serviceId);

      // Descubrir y verificar que hay múltiples instancias
      const response = await request(registryApp)
        .get("/discover/personas-service")
        .expect(200);

      expect(response.body.instances.length).toBeGreaterThanOrEqual(3);
    });

    test("Debe distribuir carga entre instancias (load balancing)", async () => {
      const selectedInstances = new Set();

      // Hacer varias peticiones de discovery
      for (let i = 0; i < 10; i++) {
        const response = await request(registryApp)
          .get("/discover/personas-service")
          .expect(200);

        selectedInstances.add(response.body.instance.serviceId);
      }

      // Debería haber seleccionado al menos 2 instancias diferentes
      // (con 3+ instancias disponibles)
      expect(selectedInstances.size).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // TEST 9: Filtrado por Tags
  // ============================================================================
  describe("Filtrado por Metadata", () => {
    test("Debe listar servicios con metadata", async () => {
      const response = await request(registryApp).get("/services").expect(200);

      const authService = response.body.services.find(
        (s) => s.name === "auth-service"
      );

      expect(authService).toBeTruthy();
      expect(authService).toHaveProperty("version");
      expect(authService).toHaveProperty("tags");
    });
  });

  // ============================================================================
  // TEST 10: Flujo Completo de Ciclo de Vida
  // ============================================================================
  describe("Flujo Completo - Ciclo de Vida del Servicio", () => {
    test("Debe completar ciclo: Register → Heartbeat → Discover → Deregister", async () => {
      // 1. Registrar
      const serviceData = {
        serviceId: "lifecycle-test-service",
        name: "lifecycle-service",
        host: "localhost",
        port: 8888,
        metadata: {
          version: "2.0.0",
          tags: ["test", "lifecycle"],
        },
      };

      const registerResponse = await request(registryApp)
        .post("/register")
        .send(serviceData)
        .expect(201);

      expect(registerResponse.body.service.status).toBe("UP");

      // 2. Heartbeat
      await request(registryApp)
        .post(`/heartbeat/${serviceData.serviceId}`)
        .expect(200);

      // 3. Discover
      const discoverResponse = await request(registryApp)
        .get(`/discover/${serviceData.name}`)
        .expect(200);

      expect(discoverResponse.body.instances.length).toBeGreaterThan(0);
      const found = discoverResponse.body.instances.find(
        (i) => i.serviceId === serviceData.serviceId
      );
      expect(found).toBeTruthy();

      // 4. Deregister
      await request(registryApp)
        .delete(`/deregister/${serviceData.serviceId}`)
        .expect(200);

      // 5. Verificar que ya no existe
      const finalResponse = await request(registryApp)
        .get(`/discover/${serviceData.name}`)
        .expect(404);

      expect(finalResponse.body.error).toContain("not found");
    });
  });
});
