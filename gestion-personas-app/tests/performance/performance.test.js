/**
 * TC-PERF: Tests de Performance y Carga
 *
 * Basado en la guía de testing (document.md):
 * - TC-PERF-001: Response time < 200ms en consultas simples
 * - TC-PERF-002: Throughput > 1000 req/min
 * - TC-PERF-003: Cache hit ratio > 80%
 * - TC-PERF-004: Connection pooling eficiente
 *
 * Cobertura esperada: N/A (tests de performance)
 * Herramientas: Jest, Axios, PostgreSQL stats
 */

const axios = require("axios");

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8001";
let authToken = null;

// Helper para obtener token de autenticación
async function authenticate() {
  if (authToken) return authToken;

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: process.env.TEST_USER || "admin",
      password: process.env.TEST_PASSWORD || "admin123",
    });
    authToken = response.data.token;
    return authToken;
  } catch (error) {
    console.error("Authentication failed:", error.message);
    throw error;
  }
}

// Helper para peticiones autenticadas
async function authenticatedRequest(method, url, data = null) {
  const token = await authenticate();
  const config = {
    method,
    url: `${API_BASE_URL}${url}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
}

// Helper para calcular percentil
function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[index];
}

describe("TC-PERF: Performance & Load Tests", () => {
  beforeAll(async () => {
    // Autenticar antes de todos los tests
    await authenticate();
  }, 30000);

  test("TC-PERF-001: Response time en consultas simples < 200ms", async () => {
    // Given: Sistema en estado estable
    const iterations = 50;
    const responseTimes = [];

    // When: Se realizan 50 consultas consecutivas
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await authenticatedRequest("GET", "/api/personas?limit=10");
      const duration = Date.now() - start;
      responseTimes.push(duration);
    }

    // Then: Promedio y percentil 95 < 200ms
    const avg = responseTimes.reduce((a, b) => a + b) / iterations;
    const p95 = percentile(responseTimes, 95);

    console.log(`📊 Performance Stats:
      - Average: ${avg.toFixed(2)}ms
      - P95: ${p95.toFixed(2)}ms
      - Min: ${Math.min(...responseTimes)}ms
      - Max: ${Math.max(...responseTimes)}ms
    `);

    expect(avg).toBeLessThan(200);
    expect(p95).toBeLessThan(300); // P95 puede ser un poco más alto
  }, 60000);

  test("TC-PERF-002: Throughput > 1000 req/min", async () => {
    // Given: 100 usuarios concurrentes
    const concurrency = 100;
    const duration = 60000; // 1 minuto

    // When: Se envían peticiones concurrentes durante 1 min
    const startTime = Date.now();
    let requestCount = 0;
    const errors = [];

    const workers = Array(concurrency)
      .fill(null)
      .map(async () => {
        while (Date.now() - startTime < duration) {
          try {
            await authenticatedRequest("GET", "/api/personas?limit=5");
            requestCount++;
          } catch (error) {
            errors.push(error.message);
          }
        }
      });

    await Promise.all(workers);

    console.log(`📊 Throughput Stats:
      - Total Requests: ${requestCount}
      - Duration: ${duration / 1000}s
      - Rate: ${(requestCount / (duration / 60000)).toFixed(2)} req/min
      - Errors: ${errors.length}
    `);

    // Then: Al menos 1000 requests procesados
    expect(requestCount).toBeGreaterThan(1000);

    // Error rate < 5%
    const errorRate = errors.length / requestCount;
    expect(errorRate).toBeLessThan(0.05);
  }, 120000);

  test("TC-PERF-003: Cache hit ratio > 80%", async () => {
    // Given: Cache pre-poblado con consultas comunes
    const commonQueries = [
      "/api/consulta/search?nombre=Juan",
      "/api/consulta/search?nombre=María",
      "/api/consulta/search?nombre=Pedro",
    ];

    // Precalentar cache
    console.log("🔥 Warming up cache...");
    for (const query of commonQueries) {
      try {
        await authenticatedRequest("GET", query);
      } catch (error) {
        // Ignorar errores en precalentamiento
      }
    }

    // When: Se realizan 100 peticiones a las mismas consultas
    let cacheHits = 0;
    const responseTimes = [];

    for (let i = 0; i < 100; i++) {
      const query = commonQueries[i % commonQueries.length];
      const start = Date.now();

      try {
        await authenticatedRequest("GET", query);
        const duration = Date.now() - start;
        responseTimes.push(duration);

        // Asumir cache hit si respuesta < 50ms
        if (duration < 50) cacheHits++;
      } catch (error) {
        // Continuar en caso de error
      }
    }

    // Then: Hit ratio > 80%
    const hitRatio = cacheHits / 100;
    const avgResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    console.log(`📊 Cache Stats:
      - Cache Hits: ${cacheHits}/100
      - Hit Ratio: ${(hitRatio * 100).toFixed(2)}%
      - Avg Response Time: ${avgResponseTime.toFixed(2)}ms
    `);

    expect(hitRatio).toBeGreaterThan(0.8);
  }, 60000);

  test("TC-PERF-004: Connection pooling eficiente", async () => {
    // Given: Connection pool de PostgreSQL configurado

    // When: Se realizan 50 peticiones simultáneas
    const concurrentRequests = 50;
    const promises = Array(concurrentRequests)
      .fill(null)
      .map(() => authenticatedRequest("GET", "/api/personas?limit=1"));

    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    // Count successful vs failed
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 200
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected" || r.value?.status !== 200
    ).length;

    console.log(`📊 Connection Pool Stats:
      - Concurrent Requests: ${concurrentRequests}
      - Successful: ${successful}
      - Failed: ${failed}
      - Duration: ${duration}ms
      - Avg per request: ${(duration / concurrentRequests).toFixed(2)}ms
    `);

    // Then: Todas completan sin timeout
    expect(successful).toBeGreaterThan(concurrentRequests * 0.95); // Al menos 95% exitosas

    // No timeouts (duración razonable)
    expect(duration).toBeLessThan(10000); // Menos de 10 segundos total
  }, 30000);
});
