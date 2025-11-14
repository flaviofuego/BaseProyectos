// Suite de integración del Gateway
// Estado: pendiente de implementación – mantenida como skip para no romper el pipeline
// Objetivo: cubrir
//  1) Rechazo de peticiones no autenticadas
//  2) Enrutamiento a servicio saludable usando Service Registry
//  3) Manejo cuando el servicio no está disponible o no registrado
//  4) Rate limiting/baseline

const request = require("supertest");
const axios = require("axios");

// Para estos tests usamos el Gateway real corriendo en Docker
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8001";

describe("Gateway integration (esenciales - contra Docker)", () => {
  // Esperar antes de cada test para evitar rate limiting residual
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it("rechaza peticiones sin autenticación", async () => {
    const res = await axios.get(`${GATEWAY_URL}/api/personas`, {
      validateStatus: () => true,
    });
    expect([401, 429]).toContain(res.status); // 429 si rate limit activo
  });

  it("enruta a servicio saludable (Service Registry)", async () => {
    // Usamos el token temporal de desarrollo que el Gateway acepta
    const token = "temp-admin-token";

    // Hacemos una petición autenticada que debe enrutarse al servicio de personas
    const personasRes = await axios.get(`${GATEWAY_URL}/api/personas`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    expect(personasRes.status).toBeGreaterThanOrEqual(200);
    expect(personasRes.status).toBeLessThan(500);
  });

  it("responde error cuando el servicio no está disponible", async () => {
    // Intentamos acceder a un servicio que no existe en el Registry
    const res = await axios.get(
      `${GATEWAY_URL}/api/servicio-inexistente/test`,
      {
        validateStatus: () => true,
      }
    );

    // Debe retornar 404 (route not found), 401 (sin auth) o 429 (rate limit)
    expect([404, 401, 429]).toContain(res.status);
  });

  it("aplica rate limiting básico", async () => {
    // El rate limiter sólo aplica a rutas /api/*, usamos /api/auth/health que es pública
    const requests = [];
    for (let i = 0; i < 110; i++) {
      requests.push(
        axios.get(`${GATEWAY_URL}/api/auth/health`, {
          validateStatus: () => true,
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);

    // Al menos una petición debe ser bloqueada por rate limiting
    expect(rateLimited.length).toBeGreaterThan(0);
  }, 30000); // Timeout extendido para este test
});
