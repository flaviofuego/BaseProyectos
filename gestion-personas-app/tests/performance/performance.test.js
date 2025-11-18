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

// Modo estricto (CI) vs desarrollo
const STRICT = process.env.PERF_STRICT === "1" || process.env.CI === "true";

function numEnv(key, devDefault, strictDefault) {
  const val = process.env[key];
  if (val !== undefined) return Number(val);
  return STRICT ? strictDefault : devDefault;
}

function floatEnv(key, devDefault, strictDefault) {
  const val = process.env[key];
  if (val !== undefined) return Number(val);
  return STRICT ? strictDefault : devDefault;
}

const PERF = {
  CONCURRENCY: numEnv("PERF_CONCURRENCY", 25, 100),
  DURATION_MS: numEnv("PERF_DURATION_MS", 30000, 60000),
  MIN_REQ_PER_MIN: numEnv("PERF_MIN_REQ_PER_MIN", 300, 1000),
  CACHE_HIT_MS: numEnv("PERF_CACHE_HIT_MS", 120, 50),
  CACHE_HIT_RATIO: floatEnv("PERF_CACHE_HIT_RATIO", 0.5, 0.8),
  POOL_CONCURRENT: numEnv("PERF_POOL_CONCURRENT", 25, 50),
  POOL_SUCCESS_RATIO: floatEnv("PERF_POOL_SUCCESS_RATIO", 0.9, 0.95),
  AVG_MS: numEnv("PERF_AVG_MS", 250, 200),
  P95_MS: numEnv("PERF_P95_MS", 350, 300),
};
let authToken = null;
let authPromise = null; // evita múltiples logins concurrentes

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper para obtener token de autenticación (singleton + retry)
async function authenticate() {
  if (authToken) return authToken;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    const username = process.env.TEST_USER || "perftest";
    const password = process.env.TEST_PASSWORD || "Perf123$A";
    const maxAttempts = 10;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          username,
          password,
        });
        authToken = response.data.token;
        console.log("✅ Authentication successful");
        return authToken;
      } catch (error) {
        const status = error.response?.status;
        const body = error.response?.data;
        // Si es rate limit (429) o error temporal, aplicar backoff exponencial
        if (status === 429 || status === 503 || status === 502) {
          const delay = Math.min(5000, 250 * Math.pow(2, attempt));
          console.warn(
            `⚠️ Auth attempt ${
              attempt + 1
            } failed (${status}). Retrying in ${delay}ms...`,
            body || error.message
          );
          await sleep(delay);
          attempt++;
          continue;
        }
        console.error("Authentication failed:", body || error.message);
        throw new Error(`Cannot authenticate: ${body?.error || error.message}`);
      }
    }
    throw new Error("Cannot authenticate after multiple attempts");
  })();

  try {
    return await authPromise;
  } finally {
    authPromise = null;
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
    const username = process.env.TEST_USER || "perftest";
    const email = process.env.TEST_EMAIL || "perftest@test.com";
    const password = process.env.TEST_PASSWORD || "Perf123$A";

    // Crear usuario si no existe (una vez)
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
      });
      console.log("✅ Test user created");
    } catch (regError) {
      if (regError.response?.status === 409) {
        console.log("ℹ️ Test user already exists");
      } else {
        console.warn(
          "⚠️ User registration warning:",
          regError.response?.data || regError.message
        );
      }
    }

    // Autenticar antes de todos los tests (con retry)
    await authenticate();
  }, 90000);

  test("TC-PERF-001: Response time en consultas simples < threshold", async () => {
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

    // Then: Promedio y percentil 95 por debajo de umbrales
    const avg = responseTimes.reduce((a, b) => a + b) / iterations;
    const p95 = percentile(responseTimes, 95);

    console.log(`📊 Performance Stats:
      - Average: ${avg.toFixed(2)}ms
      - P95: ${p95.toFixed(2)}ms
      - Min: ${Math.min(...responseTimes)}ms
      - Max: ${Math.max(...responseTimes)}ms
    `);

    expect(avg).toBeLessThan(PERF.AVG_MS);
    expect(p95).toBeLessThan(PERF.P95_MS); // P95 puede ser un poco más alto
  }, 60000);

  test("TC-PERF-002: Throughput > mínimo requerido", async () => {
    // Given: usuarios concurrentes parametrizados
    const concurrency = PERF.CONCURRENCY;
    const duration = PERF.DURATION_MS;

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

    // Then: Al menos el mínimo parametrizado
    expect(requestCount).toBeGreaterThan(PERF.MIN_REQ_PER_MIN);

    // Error rate < 5%
    const errorRate = errors.length / requestCount;
    expect(errorRate).toBeLessThan(0.05);
  }, 120000);

  test("TC-PERF-003: Cache hit ratio supera umbral", async () => {
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
        const resp = await authenticatedRequest("GET", query);
        const duration = Date.now() - start;
        responseTimes.push(duration);

        // Preferir header X-Cache cuando esté disponible; fallback a heurística por latencia
        const xCache = resp.headers?.["x-cache"] || resp.headers?.["X-Cache"];
        if (xCache && String(xCache).toUpperCase() === "HIT") {
          cacheHits++;
        } else if (duration < PERF.CACHE_HIT_MS) {
          cacheHits++;
        }
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

    expect(hitRatio).toBeGreaterThan(PERF.CACHE_HIT_RATIO);
  }, 60000);

  test("TC-PERF-004: Connection pooling eficiente", async () => {
    // Given: Connection pool de PostgreSQL configurado

    // When: Se realizan N peticiones simultáneas
    const concurrentRequests = PERF.POOL_CONCURRENT;
    const errors = [];
    const promises = Array(concurrentRequests)
      .fill(null)
      .map(async () => {
        try {
          return await authenticatedRequest("GET", "/api/personas?limit=1");
        } catch (e) {
          errors.push({
            msg: e.response?.data || e.message,
            status: e.response?.status,
          });
          throw e;
        }
      });

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
    if (errors.length) {
      const byStatus = errors.reduce((acc, e) => {
        const k = e.status || "no-status";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      console.log("📉 Errors by status:", byStatus);
    }

    // Then: Todas completan sin timeout
    expect(successful).toBeGreaterThan(
      concurrentRequests * PERF.POOL_SUCCESS_RATIO
    ); // Ratio exitosas

    // No timeouts (duración razonable)
    expect(duration).toBeLessThan(10000); // Menos de 10 segundos total
  }, 30000);
});
