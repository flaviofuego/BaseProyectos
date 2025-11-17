const express = require("express");
const { Pool } = require("pg");
const Joi = require("joi");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
const { parse } = require("csv-parse/sync");
const {
  createServiceRegistryClient,
} = require("./shared/service-registry-client");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP to allow image serving
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: [
      "http://localhost:5000", // Frontend
      "http://localhost:8001", // Gateway
      "http://localhost:3000", // Por si se usa otro puerto
      "http://127.0.0.1:5000", // Alternativo para localhost
      "http://127.0.0.1:8001", // Alternativo para gateway
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-user-id",
    ],
  })
);
app.use(express.json());

// Serve uploaded images with proper headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static("/uploads")
);

// Ensure uploads directory exists
const ensureUploadsDirectory = async () => {
  try {
    await fs.mkdir("/uploads", { recursive: true });
    console.log("Uploads directory ensured");
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }
};

// Function to parse date in STRICT format dd-mm-yyyy (e.g., 25-11-2025 or 05-01-1995)
// ONLY accepts dd-mm-yyyy with 4-digit year. Rejects all other formats.
const parseDateDDMMYYYY = (dateString) => {
  if (!dateString || typeof dateString !== "string") {
    return null;
  }

  const trimmedDate = dateString.trim();

  // STRICT pattern: requires exactly dd-mm-yyyy format
  // dd: 1 or 2 digits for day (01-31 or 1-31)
  // mm: 1 or 2 digits for month (01-12 or 1-12)
  // yyyy: exactly 4 digits for year
  const pattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const match = trimmedDate.match(pattern);

  if (!match) {
    // If pattern doesn't match, reject immediately - NO FALLBACK
    return null;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validate ranges
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900 ||
    year > 2100
  ) {
    return null;
  }

  // Create date and verify it's valid (JavaScript will adjust invalid dates like Feb 30)
  // Note: JavaScript months are 0-indexed
  const date = new Date(year, month - 1, day);

  // Validate that the date components match (prevents auto-adjustment)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  // Return in YYYY-MM-DD format for PostgreSQL
  const formattedMonth = String(month).padStart(2, "0");
  const formattedDay = String(day).padStart(2, "0");
  return `${year}-${formattedMonth}-${formattedDay}`;
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// NLP Service URL configuration
const NLP_SERVICE_URL =
  process.env.NLP_SERVICE_URL || "http://nlp-service:3004";

/**
 * Sincroniza el embedding de una persona con el servicio NLP
 * @param {number} personaId - ID de la persona
 * @param {string} operation - Operación realizada (CREATE, UPDATE, DELETE)
 * @returns {Promise<void>}
 */
const syncEmbedding = async (personaId, operation = "UPDATE") => {
  try {
    if (operation === "DELETE") {
      // Para DELETE, el trigger CASCADE en la DB eliminará el embedding automáticamente
      console.log(
        `🗑️ Embedding eliminado automáticamente por CASCADE para persona ${personaId}`
      );
      return;
    }

    console.log(
      `🔄 Sincronizando embedding para persona ${personaId} (${operation})...`
    );

    const response = await axios.post(
      `${NLP_SERVICE_URL}/update-embedding`,
      { persona_id: personaId },
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.success) {
      console.log(
        `✅ Embedding sincronizado exitosamente para persona ${personaId}`
      );
    }
  } catch (error) {
    // No fallar la operación principal si falla la sincronización de embeddings
    // El cronjob automático del NLP service lo sincronizará después
    console.warn(
      `⚠️ Error sincronizando embedding para persona ${personaId}:`,
      error.message
    );
    console.log(
      "ℹ️ El embedding se sincronizará automáticamente en el próximo ciclo del NLP service"
    );
  }
};

// Multer configuration for file uploads (images)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, gif)"));
    }
  },
});

// Multer configuration for CSV uploads
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for CSV files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain";

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos CSV"));
    }
  },
});

// Validation schema for personas
const personaSchema = Joi.object({
  numero_documento: Joi.string()
    .pattern(/^[0-9]+$/)
    .max(10)
    .required()
    .messages({
      "string.pattern.base":
        "El número de documento debe contener solo números",
      "string.max":
        "El número de documento no puede tener más de 10 caracteres",
    }),

  tipo_documento: Joi.string()
    .valid("Tarjeta de identidad", "Cédula")
    .required()
    .messages({
      "any.only":
        'El tipo de documento debe ser "Tarjeta de identidad" o "Cédula"',
    }),

  primer_nombre: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(30)
    .required()
    .messages({
      "string.pattern.base": "El primer nombre no puede contener números",
      "string.max": "El primer nombre no puede tener más de 30 caracteres",
    }),

  segundo_nombre: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(30)
    .allow("", null)
    .messages({
      "string.pattern.base": "El segundo nombre no puede contener números",
      "string.max": "El segundo nombre no puede tener más de 30 caracteres",
    }),

  apellidos: Joi.string()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .max(60)
    .required()
    .messages({
      "string.pattern.base": "Los apellidos no pueden contener números",
      "string.max": "Los apellidos no pueden tener más de 60 caracteres",
    }),

  fecha_nacimiento: Joi.date().max("now").required().messages({
    "date.max": "La fecha de nacimiento no puede ser futura",
  }),

  genero: Joi.string()
    .valid("Masculino", "Femenino", "No binario", "Prefiero no reportar")
    .required()
    .messages({
      "any.only": "El género debe ser uno de los valores permitidos",
    }),

  correo_electronico: Joi.string().email().required().messages({
    "string.email": "Debe ser un correo electrónico válido",
  }),

  celular: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base":
        "El celular debe tener exactamente 10 dígitos numéricos",
    }),
});

// Helper function to log transactions
async function logTransaction(
  type,
  entityId,
  numeroDocumento,
  userId,
  status,
  req,
  responseData = null,
  error = null
) {
  try {
    const logServiceUrl =
      process.env.LOG_SERVICE_URL || "http://log-service:3005";
    await axios.post(`${logServiceUrl}/log`, {
      transaction_type: type,
      entity_type: "PERSONA",
      entity_id: entityId,
      numero_documento: numeroDocumento,
      user_id: userId || req.headers["x-user-id"],
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      request_data: req.body,
      response_data: responseData,
      status: status,
      error_message: error,
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "personas-service" });
});

// Create persona
app.post("/", upload.single("foto"), async (req, res) => {
  try {
    // Validate input
    const { error } = personaSchema.validate(req.body);
    if (error) {
      await logTransaction(
        "CREATE",
        null,
        req.body.numero_documento,
        null,
        "ERROR",
        req,
        null,
        error.details[0].message
      );
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
      celular,
    } = req.body;

    // Process photo if uploaded
    let foto_url = null;
    if (req.file) {
      try {
        // Resize and optimize image
        const optimizedImage = await sharp(req.file.buffer)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        // Save to a storage service or local directory
        // For now, we'll save it locally
        const filename = `${numero_documento}_${Date.now()}.jpg`;
        const filepath = path.join("/uploads", filename);
        await fs.writeFile(filepath, optimizedImage);
        foto_url = `/uploads/${filename}`;
      } catch (photoError) {
        console.error("Error processing photo:", photoError);
        // Continue without photo
      }
    }

    // Check if persona already exists
    const existing = await pool.query(
      "SELECT id FROM personas WHERE numero_documento = $1",
      [numero_documento]
    );

    if (existing.rows.length > 0) {
      await logTransaction(
        "CREATE",
        null,
        numero_documento,
        null,
        "ERROR",
        req,
        null,
        "Persona ya existe"
      );
      return res
        .status(409)
        .json({ error: "Ya existe una persona con ese número de documento" });
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
        numero_documento,
        tipo_documento,
        primer_nombre,
        segundo_nombre || null,
        apellidos,
        fecha_nacimiento,
        genero,
        correo_electronico,
        celular,
        foto_url,
        req.headers["x-user-id"],
      ]
    );

    const persona = result.rows[0];

    // Log successful creation
    await logTransaction(
      "CREATE",
      persona.id,
      numero_documento,
      null,
      "SUCCESS",
      req,
      persona
    );

    // Sincronizar embedding con NLP service (no bloqueante)
    syncEmbedding(persona.id, "CREATE").catch((err) =>
      console.error("Error en sincronización async:", err.message)
    );

    res.status(201).json({
      message: "Persona creada exitosamente",
      persona,
    });
  } catch (error) {
    console.error("Error creating persona:", error);
    await logTransaction(
      "CREATE",
      null,
      req.body?.numero_documento,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Bulk upload personas from CSV
app.post("/bulk-upload", uploadCSV.single("csv_file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó archivo CSV" });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString("utf-8");
    let records;

    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle BOM for UTF-8
      });
    } catch (parseError) {
      return res.status(400).json({
        error: "Error al parsear el archivo CSV",
        details: parseError.message,
      });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: "El archivo CSV está vacío" });
    }

    const results = {
      total: records.length,
      created: 0,
      failed: [],
      duplicates: [],
      validation_errors: [],
      created_ids: [], // Para sincronizar embeddings
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because: +1 for header, +1 for 1-based index

      try {
        // Parse and convert fecha_nacimiento from dd-mm-yyyy to yyyy-mm-dd
        if (record.fecha_nacimiento) {
          const parsedDate = parseDateDDMMYYYY(record.fecha_nacimiento);
          if (!parsedDate) {
            results.validation_errors.push({
              row: rowNumber,
              data: record,
              error:
                "Fecha de nacimiento inválida. Debe estar en formato dd-mm-yyyy (ej: 25-11-2025)",
            });
            continue;
          }
          record.fecha_nacimiento = parsedDate;
        }

        // Validate record structure
        const { error } = personaSchema.validate(record);

        if (error) {
          results.validation_errors.push({
            row: rowNumber,
            data: record,
            error: error.details[0].message,
          });
          continue;
        }

        // Check if persona already exists
        const checkResult = await pool.query(
          "SELECT numero_documento FROM personas WHERE numero_documento = $1",
          [record.numero_documento]
        );

        if (checkResult.rows.length > 0) {
          results.duplicates.push({
            row: rowNumber,
            numero_documento: record.numero_documento,
            data: record,
          });
          continue;
        }

        // Insert persona (without photo)
        const userId = req.headers["x-user-id"];
        const insertResult = await pool.query(
          `INSERT INTO personas (
            numero_documento, tipo_documento, primer_nombre, segundo_nombre,
            apellidos, fecha_nacimiento, genero, correo_electronico, celular,
            created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            record.numero_documento,
            record.tipo_documento,
            record.primer_nombre,
            record.segundo_nombre || null,
            record.apellidos,
            record.fecha_nacimiento,
            record.genero,
            record.correo_electronico,
            record.celular,
            userId,
            userId,
          ]
        );

        results.created++;
        results.created_ids.push(insertResult.rows[0].id); // Guardar ID para sincronizar embedding

        // Log successful creation
        await logTransaction(
          "CREATE_BULK",
          insertResult.rows[0].id,
          record.numero_documento,
          null,
          "SUCCESS",
          req
        );

        // Log successful creation
        await logTransaction(
          "CREATE_BULK",
          insertResult.rows[0].id,
          record.numero_documento,
          null,
          "SUCCESS",
          req
        );
      } catch (dbError) {
        results.failed.push({
          row: rowNumber,
          data: record,
          error: dbError.message,
        });
      }
    }

    // Log bulk upload transaction
    await logTransaction(
      "BULK_UPLOAD",
      null,
      null,
      null,
      "SUCCESS",
      req,
      results
    );

    // Sincronizar embeddings para personas creadas exitosamente (en background)
    if (results.created > 0 && results.created_ids.length > 0) {
      console.log(
        `🔄 Iniciando sincronización de ${results.created} embeddings en background...`
      );
      // Sincronizar en background sin bloquear la respuesta
      Promise.all(
        results.created_ids.map((personaId) =>
          syncEmbedding(personaId, "CREATE").catch((err) =>
            console.error(
              `Error sincronizando persona ${personaId}:`,
              err.message
            )
          )
        )
      )
        .then(() => {
          console.log(
            `✅ Sincronización de embeddings completada para bulk upload`
          );
        })
        .catch((err) => {
          console.error("Error en sincronización masiva:", err.message);
        });
    }

    res.status(200).json({
      message: "Carga masiva completada",
      results,
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    await logTransaction(
      "BULK_UPLOAD",
      null,
      null,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get persona by documento
app.get("/:numero_documento", async (req, res) => {
  try {
    const { numero_documento } = req.params;

    const result = await pool.query(
      "SELECT * FROM personas WHERE numero_documento = $1",
      [numero_documento]
    );

    if (result.rows.length === 0) {
      await logTransaction(
        "QUERY",
        null,
        numero_documento,
        null,
        "NOT_FOUND",
        req
      );
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    const persona = result.rows[0];

    // Log successful query
    await logTransaction(
      "QUERY",
      persona.id,
      numero_documento,
      null,
      "SUCCESS",
      req,
      persona
    );

    // Add headers to prevent caching
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json(persona);
  } catch (error) {
    console.error("Error getting persona:", error);
    await logTransaction(
      "QUERY",
      null,
      req.params.numero_documento,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update persona
app.put("/:numero_documento", upload.single("foto"), async (req, res) => {
  try {
    const { numero_documento } = req.params;

    // Check if persona exists
    const existing = await pool.query(
      "SELECT * FROM personas WHERE numero_documento = $1",
      [numero_documento]
    );

    if (existing.rows.length === 0) {
      await logTransaction(
        "UPDATE",
        null,
        numero_documento,
        null,
        "NOT_FOUND",
        req
      );
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    // Validate input (excluding numero_documento as it shouldn't change)
    const updateSchema = personaSchema.fork(["numero_documento"], (schema) =>
      schema.optional()
    );
    const { error } = updateSchema.validate(req.body);
    if (error) {
      await logTransaction(
        "UPDATE",
        existing.rows[0].id,
        numero_documento,
        null,
        "ERROR",
        req,
        null,
        error.details[0].message
      );
      return res.status(400).json({ error: error.details[0].message });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updateableFields = [
      "tipo_documento",
      "primer_nombre",
      "segundo_nombre",
      "apellidos",
      "fecha_nacimiento",
      "genero",
      "correo_electronico",
      "celular",
    ];

    updateableFields.forEach((field) => {
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
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        const filename = `${numero_documento}_${Date.now()}.jpg`;
        const filepath = path.join("/uploads", filename);
        await fs.writeFile(filepath, optimizedImage);

        fields.push(`foto_url = $${paramCount}`);
        values.push(`/uploads/${filename}`);
        paramCount++;
      } catch (photoError) {
        console.error("Error processing photo:", photoError);
      }
    }

    // Add updated_by
    fields.push(`updated_by = $${paramCount}`);
    values.push(req.headers["x-user-id"]);
    paramCount++;

    // Add where clause
    values.push(numero_documento);

    const updateQuery = `
      UPDATE personas 
      SET ${fields.join(", ")}
      WHERE numero_documento = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const persona = result.rows[0];

    // Log successful update
    await logTransaction(
      "UPDATE",
      persona.id,
      numero_documento,
      null,
      "SUCCESS",
      req,
      persona
    );

    // Sincronizar embedding con NLP service (no bloqueante)
    syncEmbedding(persona.id, "UPDATE").catch((err) =>
      console.error("Error en sincronización async:", err.message)
    );

    // Add headers to prevent caching
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json({
      message: "Persona actualizada exitosamente",
      persona,
    });
  } catch (error) {
    console.error("Error updating persona:", error);
    await logTransaction(
      "UPDATE",
      null,
      req.params.numero_documento,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete persona
app.delete("/:numero_documento", async (req, res) => {
  try {
    const { numero_documento } = req.params;

    // Check if persona exists
    const existing = await pool.query(
      "SELECT id FROM personas WHERE numero_documento = $1",
      [numero_documento]
    );

    if (existing.rows.length === 0) {
      await logTransaction(
        "DELETE",
        null,
        numero_documento,
        null,
        "NOT_FOUND",
        req
      );
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    const personaId = existing.rows[0].id;

    // Delete persona
    await pool.query("DELETE FROM personas WHERE numero_documento = $1", [
      numero_documento,
    ]);

    // Log successful deletion
    await logTransaction(
      "DELETE",
      personaId,
      numero_documento,
      null,
      "SUCCESS",
      req
    );

    res.json({ message: "Persona eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting persona:", error);
    await logTransaction(
      "DELETE",
      null,
      req.params.numero_documento,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// List all personas (with pagination)
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query("SELECT COUNT(*) FROM personas");
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      "SELECT * FROM personas ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    // Log query
    await logTransaction("QUERY_ALL", null, null, null, "SUCCESS", req, {
      count: result.rows.length,
    });

    // Add headers to prevent caching
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json({
      personas: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error listing personas:", error);
    await logTransaction(
      "QUERY_ALL",
      null,
      null,
      null,
      "ERROR",
      req,
      null,
      error.message
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "El archivo es demasiado grande. Máximo 2MB" });
    }
  }
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, async () => {
  console.log(`Personas service running on port ${PORT}`);
  await ensureUploadsDirectory();

  // Auto-registrar en el Service Registry
  const serviceConfig = {
    serviceId: "personas-service",
    name: "personas-service",
    host: "personas-service",
    port: parseInt(PORT),
    protocol: "http",
    metadata: {
      version: "1.0.0",
      description: "Personas management service for CRUD operations",
      maintainer: "personas-team",
      healthEndpoint: "/health",
      tags: ["personas", "crud", "images", "documents"],
      capabilities: [
        "create-persona",
        "read-persona",
        "update-persona",
        "delete-persona",
        "image-upload",
        "document-management",
      ],
    },
  };

  createServiceRegistryClient(serviceConfig);
});
