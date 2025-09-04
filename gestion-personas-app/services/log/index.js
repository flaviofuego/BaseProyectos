const express = require('express');
const { Pool } = require('pg');
const Joi = require('joi');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation schemas
const logSchema = Joi.object({
  transaction_type: Joi.string().required(),
  entity_type: Joi.string().required(),
  entity_id: Joi.number().allow(null),
  numero_documento: Joi.string().max(10).allow(null),
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
  ip_address: Joi.string().allow(null),
  user_agent: Joi.string().allow(null),
  request_data: Joi.object().allow(null),
  response_data: Joi.object().allow(null),
  status: Joi.string().valid('SUCCESS', 'ERROR', 'NOT_FOUND').required(),
  error_message: Joi.string().allow(null)
});

const searchSchema = Joi.object({
  transaction_type: Joi.string(),
  entity_type: Joi.string(),
  numero_documento: Joi.string(),
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()),
  status: Joi.string().valid('SUCCESS', 'ERROR', 'NOT_FOUND'),
  fecha_inicio: Joi.date().iso(),
  fecha_fin: Joi.date().iso(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', service: 'log-service' });
  } catch (error) {
    res.status(503).json({ status: 'ERROR', error: error.message });
  }
});

// Create log entry
app.post('/log', async (req, res) => {
  try {
    const { error } = logSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      transaction_type,
      entity_type,
      entity_id,
      numero_documento,
      user_id,
      ip_address,
      user_agent,
      request_data,
      response_data,
      status,
      error_message
    } = req.body;

    const result = await pool.query(
      `INSERT INTO transaction_logs (
        transaction_type, entity_type, entity_id, numero_documento,
        user_id, ip_address, user_agent, request_data, response_data,
        status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at`,
      [
        transaction_type,
        entity_type,
        entity_id,
        numero_documento,
        user_id ? parseInt(user_id) : null,
        ip_address,
        user_agent,
        request_data ? JSON.stringify(request_data) : null,
        response_data ? JSON.stringify(response_data) : null,
        status,
        error_message
      ]
    );

    res.status(201).json({
      message: 'Log entry created',
      log_id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Error creating log entry' });
  }
});

// Search logs with advanced filters
app.get('/search', async (req, res) => {
  try {
    const { error } = searchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      transaction_type,
      entity_type,
      numero_documento,
      user_id,
      status,
      fecha_inicio,
      fecha_fin,
      page = 1,
      limit = 20
    } = req.query;

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    // Build dynamic query
    let query = 'SELECT * FROM transaction_logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (transaction_type) {
      query += ` AND transaction_type = $${paramCount}`;
      params.push(transaction_type);
      paramCount++;
    }

    if (entity_type) {
      query += ` AND entity_type = $${paramCount}`;
      params.push(entity_type);
      paramCount++;
    }

    if (numero_documento) {
      query += ` AND numero_documento = $${paramCount}`;
      params.push(numero_documento);
      paramCount++;
    }

    if (user_id) {
      const userId = parseInt(user_id);
      if (!isNaN(userId)) {
        query += ` AND user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (fecha_inicio) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(fecha_inicio);
      paramCount++;
    }

    if (fecha_fin) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(fecha_fin);
      paramCount++;
    }

    // Count total results
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (pageNum - 1) * limitNum;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum, offset);

    // Execute query
    const result = await pool.query(query, params);

    res.json({
      logs: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      filters: {
        transaction_type,
        entity_type,
        numero_documento,
        user_id,
        status,
        fecha_inicio,
        fecha_fin
      }
    });
  } catch (error) {
    console.error('Error searching logs:', error);
    res.status(500).json({ error: 'Error searching logs' });
  }
});

// Get log statistics
app.get('/stats', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let dateFilter = '';
    const params = [];
    
    if (fecha_inicio && fecha_fin) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(fecha_inicio, fecha_fin);
    } else if (fecha_inicio) {
      dateFilter = 'WHERE created_at >= $1';
      params.push(fecha_inicio);
    } else if (fecha_fin) {
      dateFilter = 'WHERE created_at <= $1';
      params.push(fecha_fin);
    }

    const queries = [
      // Total transactions
      pool.query(`SELECT COUNT(*) as total FROM transaction_logs ${dateFilter}`, params),
      
      // By transaction type
      pool.query(`
        SELECT transaction_type, COUNT(*) as count 
        FROM transaction_logs ${dateFilter}
        GROUP BY transaction_type
        ORDER BY count DESC
      `, params),
      
      // By status
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM transaction_logs ${dateFilter}
        GROUP BY status
      `, params),
      
      // By entity type
      pool.query(`
        SELECT entity_type, COUNT(*) as count 
        FROM transaction_logs ${dateFilter}
        GROUP BY entity_type
        ORDER BY count DESC
      `, params),
      
      // Most active users
      pool.query(`
        SELECT user_id, COUNT(*) as count 
        FROM transaction_logs ${dateFilter}
        ${dateFilter ? 'AND' : 'WHERE'} user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `, params),
      
      // Error rate
      pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as errors,
          COUNT(*) as total
        FROM transaction_logs ${dateFilter}
      `, params)
    ];

    const [
      totalResult,
      byTypeResult,
      byStatusResult,
      byEntityResult,
      activeUsersResult,
      errorRateResult
    ] = await Promise.all(queries);

    const errorData = errorRateResult.rows[0];
    const errorRate = errorData.total > 0 
      ? (errorData.errors / errorData.total * 100).toFixed(2) 
      : 0;

    res.json({
      total_transactions: parseInt(totalResult.rows[0].total),
      by_transaction_type: byTypeResult.rows.reduce((acc, row) => {
        acc[row.transaction_type] = parseInt(row.count);
        return acc;
      }, {}),
      by_status: byStatusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      by_entity_type: byEntityResult.rows.reduce((acc, row) => {
        acc[row.entity_type] = parseInt(row.count);
        return acc;
      }, {}),
      most_active_users: activeUsersResult.rows.map(row => ({
        user_id: row.user_id,
        transaction_count: parseInt(row.count)
      })),
      error_rate: parseFloat(errorRate),
      period: {
        fecha_inicio: fecha_inicio || 'all_time',
        fecha_fin: fecha_fin || 'all_time'
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Error getting statistics' });
  }
});

// Get specific log by ID
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM transaction_logs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting log:', error);
    res.status(500).json({ error: 'Error getting log entry' });
  }
});

// Cleanup old logs (admin endpoint)
app.delete('/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const result = await pool.query(
      `DELETE FROM transaction_logs 
       WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
       RETURNING id`
    );

    res.json({
      message: 'Old logs cleaned up',
      deleted_count: result.rows.length,
      older_than_days: parseInt(days)
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Error cleaning up logs' });
  }
});

app.listen(PORT, () => {
  console.log(`Log service running on port ${PORT}`);
});




