/**
 * Health Check Utilities
 * Proporciona funciones para verificar el estado de salud de dependencias
 */

const axios = require('axios');

/**
 * Estados de salud posibles
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

/**
 * Verifica la conexión a PostgreSQL
 * @param {Pool} pool - Pool de conexión pg
 * @returns {Promise<Object>} Estado de salud
 */
async function checkPostgres(pool) {
  const startTime = Date.now();
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      status: HealthStatus.HEALTHY,
      latency_ms: latency,
      database: result.rows[0].db,
      server_time: result.rows[0].time,
      pool_stats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      healthy: false,
      status: HealthStatus.UNHEALTHY,
      error: error.message,
      latency_ms: Date.now() - startTime
    };
  }
}

/**
 * Verifica la conexión a Redis
 * @param {RedisClient} redisClient - Cliente Redis
 * @returns {Promise<Object>} Estado de salud
 */
async function checkRedis(redisClient) {
  const startTime = Date.now();
  try {
    if (!redisClient || !redisClient.isOpen) {
      return {
        healthy: false,
        status: HealthStatus.UNHEALTHY,
        error: 'Redis client not connected'
      };
    }

    const pong = await redisClient.ping();
    const info = await redisClient.info('server');
    const latency = Date.now() - startTime;

    // Extraer versión de Redis
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      healthy: pong === 'PONG',
      status: pong === 'PONG' ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      latency_ms: latency,
      redis_version: version
    };
  } catch (error) {
    return {
      healthy: false,
      status: HealthStatus.UNHEALTHY,
      error: error.message,
      latency_ms: Date.now() - startTime
    };
  }
}

/**
 * Verifica la conexión a un servicio HTTP
 * @param {string} url - URL del endpoint de health
 * @param {number} timeout - Timeout en ms (default: 5000)
 * @returns {Promise<Object>} Estado de salud
 */
async function checkService(url, timeout = 5000) {
  const startTime = Date.now();
  try {
    const response = await axios.get(url, { 
      timeout,
      validateStatus: (status) => status < 500 
    });
    const latency = Date.now() - startTime;

    const healthy = response.status >= 200 && response.status < 300;
    
    return {
      healthy,
      status: healthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
      latency_ms: latency,
      http_status: response.status,
      response: response.data
    };
  } catch (error) {
    return {
      healthy: false,
      status: HealthStatus.UNHEALTHY,
      error: error.message,
      latency_ms: Date.now() - startTime
    };
  }
}

/**
 * Verifica si pgvector está disponible
 * @param {Pool} pool - Pool de conexión pg
 * @returns {Promise<Object>} Estado de salud
 */
async function checkPgVector(pool) {
  try {
    const result = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    if (result.rows.length > 0) {
      return {
        healthy: true,
        status: HealthStatus.HEALTHY,
        version: result.rows[0].extversion
      };
    }
    
    return {
      healthy: false,
      status: HealthStatus.UNHEALTHY,
      error: 'pgvector extension not installed'
    };
  } catch (error) {
    return {
      healthy: false,
      status: HealthStatus.UNHEALTHY,
      error: error.message
    };
  }
}

/**
 * Verifica el espacio en disco (simplificado para contenedores)
 * @returns {Promise<Object>} Estado de salud
 */
async function checkDiskSpace() {
  try {
    // En Node.js no hay forma nativa de verificar disco
    // Retornamos OK por defecto
    return {
      healthy: true,
      status: HealthStatus.HEALTHY,
      note: 'Disk check not available in Node.js'
    };
  } catch (error) {
    return {
      healthy: true,
      status: HealthStatus.UNKNOWN,
      error: error.message
    };
  }
}

/**
 * Verifica el uso de memoria
 * @returns {Object} Estado de memoria
 */
function checkMemory() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const rss = Math.round(used.rss / 1024 / 1024);
  const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100);

  // Considerar degradado si usa más del 85% del heap
  const status = usagePercent > 90 
    ? HealthStatus.UNHEALTHY 
    : usagePercent > 85 
      ? HealthStatus.DEGRADED 
      : HealthStatus.HEALTHY;

  return {
    healthy: usagePercent < 90,
    status,
    heap_used_mb: heapUsedMB,
    heap_total_mb: heapTotalMB,
    rss_mb: rss,
    usage_percent: usagePercent
  };
}

/**
 * Realiza un health check completo con todas las dependencias
 * @param {Object} options - Opciones de configuración
 * @param {Pool} options.pool - Pool de PostgreSQL
 * @param {RedisClient} options.redis - Cliente Redis
 * @param {Object} options.services - Mapa de servicios {nombre: url}
 * @param {Object} options.extras - Checks adicionales
 * @returns {Promise<Object>} Estado completo de salud
 */
async function detailedHealthCheck(options = {}) {
  const { pool, redis, services = {}, extras = {} } = options;
  const startTime = Date.now();

  const checks = {
    system: {
      memory: checkMemory(),
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version
    },
    database: pool ? await checkPostgres(pool) : { status: HealthStatus.UNKNOWN, note: 'Not configured' },
    redis: redis ? await checkRedis(redis) : { status: HealthStatus.UNKNOWN, note: 'Not configured' },
    dependencies: {}
  };

  // Verificar servicios externos
  for (const [name, url] of Object.entries(services)) {
    checks.dependencies[name] = await checkService(url);
  }

  // Agregar checks extras
  for (const [name, checkFn] of Object.entries(extras)) {
    try {
      checks[name] = await checkFn();
    } catch (error) {
      checks[name] = { healthy: false, status: HealthStatus.UNHEALTHY, error: error.message };
    }
  }

  // Determinar estado general
  const dbHealthy = checks.database.healthy !== false;
  const redisHealthy = checks.redis.healthy !== false;
  const depsHealthy = Object.values(checks.dependencies).every(d => d.healthy !== false);
  const memoryHealthy = checks.system.memory.healthy;

  let overallStatus;
  if (dbHealthy && redisHealthy && depsHealthy && memoryHealthy) {
    overallStatus = HealthStatus.HEALTHY;
  } else if (dbHealthy) {
    // BD ok pero algo más falla -> degradado
    overallStatus = HealthStatus.DEGRADED;
  } else {
    overallStatus = HealthStatus.UNHEALTHY;
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    checks
  };
}

/**
 * Crea un middleware de health check para Express
 * @param {Function} healthCheckFn - Función que retorna el estado de salud
 * @returns {Function} Middleware de Express
 */
function createHealthMiddleware(healthCheckFn) {
  return async (req, res) => {
    try {
      const health = await healthCheckFn();
      
      const statusCode = health.status === HealthStatus.HEALTHY 
        ? 200 
        : health.status === HealthStatus.DEGRADED 
          ? 200 
          : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Crea un endpoint de liveness (para Kubernetes)
 * Solo verifica que el proceso responde
 */
function createLivenessMiddleware() {
  return (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Crea un endpoint de readiness (para Kubernetes)
 * Verifica que el servicio está listo para recibir tráfico
 */
function createReadinessMiddleware(readyCheckFn) {
  return async (req, res) => {
    try {
      const isReady = await readyCheckFn();
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = {
  HealthStatus,
  checkPostgres,
  checkRedis,
  checkService,
  checkPgVector,
  checkDiskSpace,
  checkMemory,
  detailedHealthCheck,
  createHealthMiddleware,
  createLivenessMiddleware,
  createReadinessMiddleware
};
