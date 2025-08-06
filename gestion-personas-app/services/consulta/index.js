const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Database connection with connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection for caching
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

// Helper function to generate cache key
function getCacheKey(type, params) {
  return `consulta:${type}:${JSON.stringify(params)}`;
}

// Helper function to log transactions
async function logTransaction(type, entityId, numeroDocumento, status, req, responseData = null, error = null) {
  try {
    const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
    await axios.post(`${logServiceUrl}/log`, {
      transaction_type: type,
      entity_type: 'PERSONA',
      entity_id: entityId,
      numero_documento: numeroDocumento,
      user_id: req.headers['x-user-id'],
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_data: req.query || req.body,
      response_data: responseData,
      status: status,
      error_message: error
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

// Routes

// Health check with readiness probe
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Check Redis connection
    await redisClient.ping();
    
    res.json({ 
      status: 'OK', 
      service: 'consulta-service',
      ready: true,
      instance: process.env.HOSTNAME || 'unknown'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      service: 'consulta-service',
      ready: false,
      error: error.message
    });
  }
});

// Get persona by documento with caching
app.get('/persona/:numero_documento', async (req, res) => {
  const startTime = Date.now();
  try {
    const { numero_documento } = req.params;
    const cacheKey = getCacheKey('persona', { numero_documento });

    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const persona = JSON.parse(cachedData);
      
      // Log cached response
      await logTransaction('QUERY_CACHED', persona.id, numero_documento, 'SUCCESS', req, persona);
      
      return res.json({
        ...persona,
        _cache: true,
        _responseTime: Date.now() - startTime
      });
    }

    // Query database
    const result = await pool.query(
      'SELECT * FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (result.rows.length === 0) {
      await logTransaction('QUERY', null, numero_documento, 'NOT_FOUND', req);
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const persona = result.rows[0];

    // Cache the result
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(persona));

    // Log successful query
    await logTransaction('QUERY', persona.id, numero_documento, 'SUCCESS', req, persona);

    res.json({
      ...persona,
      _cache: false,
      _responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error getting persona:', error);
    await logTransaction('QUERY', null, req.params.numero_documento, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Search personas with filters and caching
app.get('/search', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      tipo_documento,
      genero,
      edad_min,
      edad_max,
      page = 1,
      limit = 10
    } = req.query;

    const cacheKey = getCacheKey('search', req.query);

    // Check cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const result = JSON.parse(cachedData);
      
      await logTransaction('SEARCH_CACHED', null, null, 'SUCCESS', req, { count: result.personas.length });
      
      return res.json({
        ...result,
        _cache: true,
        _responseTime: Date.now() - startTime
      });
    }

    // Build query
    let query = 'SELECT * FROM personas_con_edad WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (tipo_documento) {
      query += ` AND tipo_documento = $${paramCount}`;
      params.push(tipo_documento);
      paramCount++;
    }

    if (genero) {
      query += ` AND genero = $${paramCount}`;
      params.push(genero);
      paramCount++;
    }

    if (edad_min) {
      query += ` AND edad >= $${paramCount}`;
      params.push(parseInt(edad_min));
      paramCount++;
    }

    if (edad_max) {
      query += ` AND edad <= $${paramCount}`;
      params.push(parseInt(edad_max));
      paramCount++;
    }

    // Count total results
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);

    // Execute query
    const result = await pool.query(query, params);

    const response = {
      personas: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };

    // Cache the result
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));

    // Log search
    await logTransaction('SEARCH', null, null, 'SUCCESS', req, { count: result.rows.length, filters: req.query });

    res.json({
      ...response,
      _cache: false,
      _responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error searching personas:', error);
    await logTransaction('SEARCH', null, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get statistics with caching
app.get('/stats', async (req, res) => {
  const startTime = Date.now();
  try {
    const cacheKey = getCacheKey('stats', {});

    // Check cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const stats = JSON.parse(cachedData);
      
      await logTransaction('STATS_CACHED', null, null, 'SUCCESS', req, stats);
      
      return res.json({
        ...stats,
        _cache: true,
        _responseTime: Date.now() - startTime
      });
    }

    // Gather statistics
    const queries = [
      pool.query('SELECT COUNT(*) as total FROM personas'),
      pool.query('SELECT genero, COUNT(*) as count FROM personas GROUP BY genero'),
      pool.query('SELECT tipo_documento, COUNT(*) as count FROM personas GROUP BY tipo_documento'),
      pool.query('SELECT grupo_edad, COUNT(*) as count FROM personas_con_edad GROUP BY grupo_edad'),
      pool.query('SELECT MIN(edad) as min_edad, MAX(edad) as max_edad, AVG(edad) as avg_edad FROM personas_con_edad'),
      pool.query(`
        SELECT primer_nombre, segundo_nombre, apellidos, fecha_nacimiento, edad
        FROM personas_con_edad
        ORDER BY edad ASC
        LIMIT 1
      `)
    ];

    const [
      totalResult,
      generoResult,
      tipoDocResult,
      grupoEdadResult,
      edadStatsResult,
      youngestResult
    ] = await Promise.all(queries);

    const stats = {
      total_personas: parseInt(totalResult.rows[0].total),
      por_genero: generoResult.rows.reduce((acc, row) => {
        acc[row.genero] = parseInt(row.count);
        return acc;
      }, {}),
      por_tipo_documento: tipoDocResult.rows.reduce((acc, row) => {
        acc[row.tipo_documento] = parseInt(row.count);
        return acc;
      }, {}),
      por_grupo_edad: grupoEdadResult.rows.reduce((acc, row) => {
        acc[row.grupo_edad] = parseInt(row.count);
        return acc;
      }, {}),
      estadisticas_edad: {
        minima: parseInt(edadStatsResult.rows[0].min_edad),
        maxima: parseInt(edadStatsResult.rows[0].max_edad),
        promedio: parseFloat(edadStatsResult.rows[0].avg_edad).toFixed(2)
      },
      persona_mas_joven: youngestResult.rows[0] || null
    };

    // Cache the result
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(stats));

    // Log stats query
    await logTransaction('STATS', null, null, 'SUCCESS', req, stats);

    res.json({
      ...stats,
      _cache: false,
      _responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    await logTransaction('STATS', null, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Clear cache endpoint (for admin use)
app.delete('/cache', async (req, res) => {
  try {
    await redisClient.flushDb();
    
    await logTransaction('CACHE_CLEAR', null, null, 'SUCCESS', req);
    
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Error clearing cache' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Consulta service running on port ${PORT}`);
  console.log(`Instance: ${process.env.HOSTNAME || 'unknown'}`);
});