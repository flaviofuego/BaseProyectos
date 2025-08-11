const express = require('express');
const { Pool } = require('pg');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// Validation schema for personas
const personaSchema = Joi.object({
  numero_documento: Joi.string()
    .pattern(/^[0-9]+$/)
    .max(10)
    .required()
    .messages({
      'string.pattern.base': 'El número de documento debe contener solo números',
      'string.max': 'El número de documento no puede tener más de 10 caracteres'
    }),
  
  tipo_documento: Joi.string()
    .valid('Tarjeta de identidad', 'Cédula')
    .required()
    .messages({
      'any.only': 'El tipo de documento debe ser "Tarjeta de identidad" o "Cédula"'
    }),
  
  primer_nombre: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(30)
    .required()
    .messages({
      'string.pattern.base': 'El primer nombre no puede contener números',
      'string.max': 'El primer nombre no puede tener más de 30 caracteres'
    }),
  
  segundo_nombre: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(30)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El segundo nombre no puede contener números',
      'string.max': 'El segundo nombre no puede tener más de 30 caracteres'
    }),
  
  apellidos: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(60)
    .required()
    .messages({
      'string.pattern.base': 'Los apellidos no pueden contener números',
      'string.max': 'Los apellidos no pueden tener más de 60 caracteres'
    }),
  
  fecha_nacimiento: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'La fecha de nacimiento no puede ser futura'
    }),
  
  genero: Joi.string()
    .valid('Masculino', 'Femenino', 'No binario', 'Prefiero no reportar')
    .required()
    .messages({
      'any.only': 'El género debe ser uno de los valores permitidos'
    }),
  
  correo_electronico: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Debe ser un correo electrónico válido'
    }),
  
  celular: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'El celular debe tener exactamente 10 dígitos numéricos'
    })
});

// Helper function to log transactions
async function logTransaction(type, entityId, numeroDocumento, userId, status, req, responseData = null, error = null) {
  try {
    const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
    await axios.post(`${logServiceUrl}/log`, {
      transaction_type: type,
      entity_type: 'PERSONA',
      entity_id: entityId,
      numero_documento: numeroDocumento,
      user_id: userId || req.headers['x-user-id'],
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_data: req.body,
      response_data: responseData,
      status: status,
      error_message: error
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'personas-service' });
});

// Create persona
app.post('/', upload.single('foto'), async (req, res) => {
  try {
    // Validate input
    const { error } = personaSchema.validate(req.body);
    if (error) {
      await logTransaction('CREATE', null, req.body.numero_documento, null, 'ERROR', req, null, error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      numero_documento,
      tipo_documento,
      primer_nombre,
      segundo_nombre,
      apellidos,
      fecha_nacimiento,
      genero,
      correo_electronico,
      celular
    } = req.body;

    // Process photo if uploaded
    let foto_url = null;
    if (req.file) {
      try {
        // Resize and optimize image
        const optimizedImage = await sharp(req.file.buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        // Save to a storage service or local directory
        // For now, we'll save it locally
        const filename = `${numero_documento}_${Date.now()}.jpg`;
        const filepath = path.join('/uploads', filename);
        await fs.writeFile(filepath, optimizedImage);
        foto_url = `/uploads/${filename}`;
      } catch (photoError) {
        console.error('Error processing photo:', photoError);
        // Continue without photo
      }
    }

    // Check if persona already exists
    const existing = await pool.query(
      'SELECT id FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (existing.rows.length > 0) {
      await logTransaction('CREATE', null, numero_documento, null, 'ERROR', req, null, 'Persona ya existe');
      return res.status(409).json({ error: 'Ya existe una persona con ese número de documento' });
    }

    // Insert persona
    const result = await pool.query(
      `INSERT INTO personas (
        numero_documento, tipo_documento, primer_nombre, segundo_nombre,
        apellidos, fecha_nacimiento, genero, correo_electronico, celular,
        foto_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        numero_documento, tipo_documento, primer_nombre, segundo_nombre || null,
        apellidos, fecha_nacimiento, genero, correo_electronico, celular,
        foto_url, req.headers['x-user-id']
      ]
    );

    const persona = result.rows[0];
    
    // Log successful creation
    await logTransaction('CREATE', persona.id, numero_documento, null, 'SUCCESS', req, persona);

    res.status(201).json({
      message: 'Persona creada exitosamente',
      persona
    });
  } catch (error) {
    console.error('Error creating persona:', error);
    await logTransaction('CREATE', null, req.body?.numero_documento, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get persona by documento
app.get('/:numero_documento', async (req, res) => {
  try {
    const { numero_documento } = req.params;

    const result = await pool.query(
      'SELECT * FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (result.rows.length === 0) {
      await logTransaction('QUERY', null, numero_documento, null, 'NOT_FOUND', req);
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const persona = result.rows[0];
    
    // Log successful query
    await logTransaction('QUERY', persona.id, numero_documento, null, 'SUCCESS', req, persona);

    res.json(persona);
  } catch (error) {
    console.error('Error getting persona:', error);
    await logTransaction('QUERY', null, req.params.numero_documento, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update persona
app.put('/:numero_documento', upload.single('foto'), async (req, res) => {
  try {
    const { numero_documento } = req.params;

    // Check if persona exists
    const existing = await pool.query(
      'SELECT * FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (existing.rows.length === 0) {
      await logTransaction('UPDATE', null, numero_documento, null, 'NOT_FOUND', req);
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    // Validate input (excluding numero_documento as it shouldn't change)
    const updateSchema = personaSchema.fork(['numero_documento'], (schema) => schema.optional());
    const { error } = updateSchema.validate(req.body);
    if (error) {
      await logTransaction('UPDATE', existing.rows[0].id, numero_documento, null, 'ERROR', req, null, error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updateableFields = [
      'tipo_documento', 'primer_nombre', 'segundo_nombre', 'apellidos',
      'fecha_nacimiento', 'genero', 'correo_electronico', 'celular'
    ];

    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
        paramCount++;
      }
    });

    // Process photo if uploaded
    if (req.file) {
      try {
        const optimizedImage = await sharp(req.file.buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const filename = `${numero_documento}_${Date.now()}.jpg`;
        const filepath = path.join('/uploads', filename);
        await fs.writeFile(filepath, optimizedImage);
        
        fields.push(`foto_url = $${paramCount}`);
        values.push(`/uploads/${filename}`);
        paramCount++;
      } catch (photoError) {
        console.error('Error processing photo:', photoError);
      }
    }

    // Add updated_by
    fields.push(`updated_by = $${paramCount}`);
    values.push(req.headers['x-user-id']);
    paramCount++;

    // Add where clause
    values.push(numero_documento);

    const updateQuery = `
      UPDATE personas 
      SET ${fields.join(', ')}
      WHERE numero_documento = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const persona = result.rows[0];

    // Log successful update
    await logTransaction('UPDATE', persona.id, numero_documento, null, 'SUCCESS', req, persona);

    res.json({
      message: 'Persona actualizada exitosamente',
      persona
    });
  } catch (error) {
    console.error('Error updating persona:', error);
    await logTransaction('UPDATE', null, req.params.numero_documento, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete persona
app.delete('/:numero_documento', async (req, res) => {
  try {
    const { numero_documento } = req.params;

    // Check if persona exists
    const existing = await pool.query(
      'SELECT id FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (existing.rows.length === 0) {
      await logTransaction('DELETE', null, numero_documento, null, 'NOT_FOUND', req);
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const personaId = existing.rows[0].id;

    // Delete persona
    await pool.query(
      'DELETE FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    // Log successful deletion
    await logTransaction('DELETE', personaId, numero_documento, null, 'SUCCESS', req);

    res.json({ message: 'Persona eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting persona:', error);
    await logTransaction('DELETE', null, req.params.numero_documento, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// List all personas (with pagination)
app.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM personas');
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM personas ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Log query
    await logTransaction('QUERY_ALL', null, null, null, 'SUCCESS', req, { count: result.rows.length });

    res.json({
      personas: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error listing personas:', error);
    await logTransaction('QUERY_ALL', null, null, null, 'ERROR', req, null, error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 2MB' });
    }
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Personas service running on port ${PORT}`);
});

