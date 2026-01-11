// Auth service for user authentication and authorization
const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const Auth0Strategy = require("passport-auth0");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const redis = require("redis");
const session = require("express-session");
const Joi = require("joi");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const {
  createServiceRegistryClient,
} = require("./shared/service-registry-client");
const dockerController = require("./docker-controller");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Helper para habilitar/deshabilitar rate limiting en entornos no productivos
const isRateLimitEnabled = () => {
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.DISABLE_RATE_LIMIT === "1") return false;
  // En test deshabilitado explícitamente
  if (process.env.NODE_ENV === "test") return false;
  return true; // por defecto habilitado en dev a menos que se desactive
};

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate Limiter para Login
 * Previene ataques de fuerza bruta limitando intentos de login
 * - Production: 5 intentos por 15 minutos por IP
 * - Development/Test: 1000 intentos (para tests de performance)
 * - Resetea después del período de ventana
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "production" ? 5 : 1000, // Límite alto en dev/test
  message: {
    error:
      "Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Cuenta todos los requests (exitosos y fallidos)
  skipFailedRequests: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on login endpoint`);
    res.status(429).json({
      error: "Demasiados intentos de inicio de sesión",
      message:
        "Has excedido el número máximo de intentos. Por favor, espera 15 minutos antes de intentar nuevamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Rate Limiter para Registro
 * Previene creación masiva de cuentas falsas
 * - Production: 3 intentos por hora por IP
 * - Development/Test: 1000 intentos (para tests de performance)
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === "production" ? 3 : 1000, // Límite alto en dev/test
  message: {
    error:
      "Demasiados intentos de registro. Por favor, intenta de nuevo en 1 hora.",
    retryAfter: "1 hora",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No cuenta registros exitosos (solo los fallidos)
  skipFailedRequests: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on register endpoint`);
    res.status(429).json({
      error: "Demasiados intentos de registro",
      message:
        "Has excedido el número máximo de intentos de registro. Por favor, espera 1 hora antes de intentar nuevamente.",
      retryAfter: "1 hora",
    });
  },
});

/**
 * Rate Limiter General para Auth API
 * Protección contra abuso general de la API de autenticación
 * - Production: 100 requests por 15 minutos por IP
 * - Development/Test: 10000 requests por 15 minutos (para tests de performance)
 */
const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "production" ? 100 : 10000, // Límite alto en dev/test
  message: {
    error: "Demasiadas peticiones. Por favor, intenta de nuevo más tarde.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on auth API`);
    res.status(429).json({
      error: "Demasiadas peticiones",
      message:
        "Has excedido el límite de peticiones. Por favor, espera antes de intentar nuevamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Rate Limiter para cambio de contraseña
 * Previene intentos repetidos de cambio de contraseña
 * - 3 intentos por hora por usuario
 */
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Límite de 3 intentos
  message: {
    error:
      "Demasiados intentos de cambio de contraseña. Por favor, intenta de nuevo en 1 hora.",
    retryAfter: "1 hora",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Limitar por user_id en lugar de IP
    return req.headers["x-user-id"] || req.ip;
  },
  handler: (req, res) => {
    console.log(`Rate limit exceeded for user on password change endpoint`);
    res.status(429).json({
      error: "Demasiados intentos de cambio de contraseña",
      message:
        "Has excedido el número máximo de intentos. Por favor, espera 1 hora antes de intentar nuevamente.",
      retryAfter: "1 hora",
    });
  },
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Aplicar rate limiter general a todas las rutas si está habilitado
if (isRateLimitEnabled()) {
  app.use(authApiLimiter);
}

// Middleware
app.use(helmet());
// Configuración dinámica de CORS
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }
  // Defaults para desarrollo
  if (process.env.NODE_ENV !== 'production') {
    return [
      `http://localhost:${process.env.FRONTEND_PORT || 5000}`,
      `http://localhost:${process.env.GATEWAY_PORT || 8001}`,
      "http://127.0.0.1:5000",
    ];
  }
  return [];
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);

// Session configuration for Auth0
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Body parser
app.use(express.json({ limit: "1mb" }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.connect();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRY = "24h";

// Validation schemas

// ============================================================================
// SCHEMA DE CONTRASEÑA SEGURA (1.A)
// ============================================================================
// Requisitos de contraseña segura:
// - Mínimo 8 caracteres (evita contraseñas débiles)
// - Máximo 128 caracteres (previene ataques de DoS)
// - Al menos una letra minúscula (complejidad)
// - Al menos una letra mayúscula (complejidad)
// - Al menos un número (complejidad)
// - Al menos un carácter especial @$!%*?& (complejidad)
// Estas reglas cumplen con estándares de seguridad OWASP
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
  .required()
  .messages({
    "string.min": "La contraseña debe tener al menos 8 caracteres",
    "string.max": "La contraseña no puede exceder 128 caracteres",
    "string.pattern.base":
      "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)",
    "any.required": "La contraseña es requerida",
  });

// ============================================================================
// SCHEMA DE EMAIL ROBUSTO (1.B)
// ============================================================================
// Validaciones de email:
// - Formato válido de email
// - Mínimo 2 segmentos de dominio (ej: @domain.com)
// - Validar TLDs reales (.com, .org, etc)
// - Convertir a minúsculas (normalización)
// - Eliminar espacios en blanco (sanitización)
// - Máximo 255 caracteres (límite RFC 5321)
const emailSchema = Joi.string()
  .email({
    minDomainSegments: 2,
    tlds: { allow: true }, // Valida que el TLD existe (.com, .org, etc)
  })
  .lowercase() // Normaliza a minúsculas
  .trim() // Elimina espacios
  .max(255) // Límite estándar de email RFC 5321
  .required()
  .messages({
    "string.email": "El email debe tener un formato válido",
    "string.max": "El email no puede exceder 255 caracteres",
    "any.required": "El email es requerido",
  });

// ============================================================================
// SCHEMA DE USERNAME SEGURO (1.C)
// ============================================================================
// Validaciones de username:
// - Solo caracteres alfanuméricos y guión bajo (previene inyección)
// - Mínimo 3 caracteres (evita usernames muy cortos)
// - Máximo 30 caracteres (límite razonable)
// - Convertir a minúsculas (normalización y consistencia)
// - Eliminar espacios (sanitización)
// - Pattern estricto: solo [a-z0-9_] (seguridad)
const usernameSchema = Joi.string()
  .min(3)
  .max(30)
  .lowercase() // Normaliza a minúsculas
  .trim() // Elimina espacios
  .pattern(/^[a-z0-9_]+$/) // Solo letras minúsculas, números y guión bajo
  .required()
  .messages({
    "string.min": "El username debe tener al menos 3 caracteres",
    "string.max": "El username no puede exceder 30 caracteres",
    "string.pattern.base":
      "El username solo puede contener letras minúsculas, números y guión bajo (_)",
    "any.required": "El username es requerido",
  });

// ============================================================================
// SCHEMAS DE ENDPOINTS
// ============================================================================
const loginSchema = Joi.object({
  username: usernameSchema,
  password: Joi.string().required(), // En login no validamos complejidad (ya existe)
});

const registerSchema = Joi.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// ============================================================================
// USER PREFERENCES ENDPOINTS
// ============================================================================

// Helper function to get or create user preferences with caching
async function getUserPreferences(userId) {
  try {
    // Check Redis cache first
    const cacheKey = `user_prefs:${userId}`;
    const cachedPrefs = await redisClient.get(cacheKey);

    if (cachedPrefs) {
      return JSON.parse(cachedPrefs);
    }

    // Query database
    let result = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id = $1",
      [userId]
    );

    // If no preferences exist, create default preferences
    if (result.rows.length === 0) {
      await pool.query(
        "INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)",
        [userId]
      );

      result = await pool.query(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [userId]
      );
    }

    const preferences = result.rows[0];

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(preferences));

    return preferences;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    throw error;
  }
}

// Helper function to invalidate user preferences cache
async function invalidateUserPreferencesCache(userId) {
  try {
    const cacheKey = `user_prefs:${userId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Error invalidating user preferences cache:", error);
  }
}

// Get user preferences
app.get(
  "/preferences",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await getUserPreferences(userId);

      res.json({
        success: true,
        preferences: {
          consulta_service_enabled: preferences.consulta_service_enabled,
          updated_at: preferences.updated_at,
        },
      });
    } catch (error) {
      console.error("Error getting preferences:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

// Update consulta service status (con control de contenedor Docker)
app.put(
  "/preferences/consulta-service",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const username = req.user.username || `User ${userId}`;
      const { enabled } = req.body;

      // Validate input
      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: 'El campo "enabled" debe ser un valor booleano',
        });
      }

      // Obtener estado anterior para saber qué cambió
      const previousStateResult = await pool.query(
        `SELECT consulta_service_enabled FROM user_preferences WHERE user_id = $1`,
        [userId]
      );
      const previousState =
        previousStateResult.rows[0]?.consulta_service_enabled ?? true;

      console.log(
        `🔄 User ${userId} (${username}) changing service from ${previousState} to ${enabled}`
      );

      // Control del contenedor Docker
      let dockerResult = null;

      if (enabled) {
        console.log(
          `✅ User ${userId} (${username}) is ENABLING service - starting container and enabling for ALL users`
        );
        dockerResult = await dockerController.startConsultaService();

        if (!dockerResult.success && !dockerResult.already_running) {
          // Si falla al iniciar, NO guardar la preferencia
          console.error(
            `❌ Failed to start container for user ${userId}:`,
            dockerResult.error
          );

          // Registrar en logs el intento fallido
          logTransaction(
            userId,
            "ENABLE_CONSULTA_SERVICE",
            "ERROR",
            req,
            {
              username: username,
              enabled: true,
              docker_action: "start",
              docker_result: "failed",
              error: dockerResult.error,
            },
            dockerResult.error
          );

          return res.status(500).json({
            success: false,
            message:
              "No se pudo iniciar el servicio de consulta. Revisa que Docker esté funcionando.",
            error: dockerResult.error,
          });
        }

        // Contenedor iniciado exitosamente o ya estaba corriendo
        console.log(
          `✅ Container started/running for user ${userId} (${username})`
        );

        // 1. Activar para TODOS los usuarios
        const enableAllResult = await pool.query(
          `UPDATE user_preferences 
           SET consulta_service_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE consulta_service_enabled = FALSE
           RETURNING user_id`
        );

        const affectedUsers = enableAllResult.rows.map((row) => row.user_id);
        console.log(
          `✅ Enabled service for ${
            affectedUsers.length
          } user(s): [${affectedUsers.join(", ")}]`
        );

        // 2. Invalidar cache de todos los usuarios afectados
        for (const affectedUserId of affectedUsers) {
          try {
            await invalidateUserPreferencesCache(affectedUserId);
          } catch (cacheError) {
            console.warn(
              `⚠️ Failed to invalidate cache for user ${affectedUserId}:`,
              cacheError.message
            );
            // Continue even if cache invalidation fails
          }
        }

        // 3. Registrar en logs la activación masiva
        logTransaction(userId, "ENABLE_CONSULTA_SERVICE", "SUCCESS", req, {
          username: username,
          enabled: true,
          docker_action: "start",
          docker_result: dockerResult?.success ? "success" : "already_running",
          affected_users: affectedUsers,
          total_affected: affectedUsers.length,
          container_started:
            dockerResult?.success || dockerResult?.already_running,
          message: `User ${username} enabled service for all users`,
        });

        // Retornar respuesta para activación
        return res.json({
          success: true,
          message: `Servicio de consulta habilitado para todos los usuarios`,
          affected_users: affectedUsers.length,
          preferences: {
            consulta_service_enabled: true,
          },
          container_status: dockerResult
            ? {
                action: "started",
                success: dockerResult.success || dockerResult.already_running,
                message: dockerResult.message,
              }
            : null,
        });
      } else {
        // ❌ DESACTIVAR SERVICIO: Desactivar para TODOS y detener contenedor
        console.log(
          `🛑 User ${userId} (${username}) is DISABLING service - stopping container and disabling for ALL users`
        );

        // 1. Desactivar para TODOS los usuarios
        const disableAllResult = await pool.query(
          `UPDATE user_preferences 
           SET consulta_service_enabled = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE consulta_service_enabled = TRUE
           RETURNING user_id`
        );

        const affectedUsers = disableAllResult.rows.map((row) => row.user_id);
        console.log(
          `🛑 Disabled service for ${
            affectedUsers.length
          } user(s): [${affectedUsers.join(", ")}]`
        );

        // 2. Invalidar cache de todos los usuarios afectados
        for (const affectedUserId of affectedUsers) {
          try {
            await invalidateUserPreferencesCache(affectedUserId);
          } catch (cacheError) {
            console.warn(
              `⚠️ Failed to invalidate cache for user ${affectedUserId}:`,
              cacheError.message
            );
            // Continue even if cache invalidation fails
          }
        }

        // 3. Detener el contenedor Docker
        console.log(`🛑 Stopping Docker container`);
        dockerResult = await dockerController.stopConsultaService();

        if (!dockerResult.success && !dockerResult.already_stopped) {
          console.warn(
            `⚠️ Failed to stop container, but preferences were updated:`,
            dockerResult.error
          );
          // No revertir las preferencias, solo advertir
        } else {
          console.log(`✅ Container stopped successfully`);
        }

        // 4. Registrar en logs la desactivación masiva
        logTransaction(userId, "DISABLE_CONSULTA_SERVICE", "SUCCESS", req, {
          username: username,
          enabled: false,
          docker_action: "stop",
          docker_result: dockerResult?.success ? "success" : "failed",
          affected_users: affectedUsers,
          total_affected: affectedUsers.length,
          container_stopped:
            dockerResult?.success || dockerResult?.already_stopped,
          message: `User ${username} disabled service for all users`,
        });

        // Retornar respuesta temprano para desactivación
        return res.json({
          success: true,
          message: `Servicio de consulta deshabilitado para todos los usuarios`,
          affected_users: affectedUsers.length,
          preferences: {
            consulta_service_enabled: false,
          },
          container_status: dockerResult
            ? {
                action: "stopped",
                success: dockerResult.success || dockerResult.already_stopped,
                message: dockerResult.message,
              }
            : null,
        });
      }
    } catch (error) {
      console.error("Error updating consulta service preference:", error);
      logTransaction(
        req.user.id,
        "UPDATE_PREFERENCES",
        "ERROR",
        req,
        null,
        error.message
      );
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

// Check if consulta service is enabled for a user (used by gateway)
app.get("/preferences/consulta-service/check/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        enabled: true, // Default to enabled on invalid input
        message: "Invalid user ID",
      });
    }

    const preferences = await getUserPreferences(userId);

    res.json({
      enabled: preferences.consulta_service_enabled,
      user_id: userId,
    });
  } catch (error) {
    console.error("Error checking consulta service status:", error);
    // Default to enabled on error to avoid breaking functionality
    res.json({
      enabled: true,
      user_id: req.params.userId,
      error: "Error checking preferences, defaulting to enabled",
    });
  }
});

// Get Docker container status for consulta-service (admin/monitoring)
app.get(
  "/preferences/consulta-service/container-status",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const info = await dockerController.getContainerInfo();

      // También obtener cuántos usuarios tienen el servicio habilitado
      const usersResult = await pool.query(
        `SELECT COUNT(*) as count FROM user_preferences WHERE consulta_service_enabled = TRUE`
      );
      const usersWithService = parseInt(usersResult.rows[0].count);

      res.json({
        success: true,
        container: info,
        users_with_service_enabled: usersWithService,
      });
    } catch (error) {
      console.error("Error getting container status:", error);
      res.status(500).json({
        success: false,
        message: "Error obteniendo estado del contenedor",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// ACCOUNT MANAGEMENT ENDPOINTS
// ============================================================================

// Middleware de autenticación flexible: acepta JWT o x-user-id del gateway
const flexibleAuth = async (req, res, next) => {
  // Si viene el header x-user-id del gateway, usar ese usuario
  if (req.headers["x-user-id"]) {
    try {
      const userId = parseInt(req.headers["x-user-id"]);
      const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);

      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      req.user = userQuery.rows[0];
      return next();
    } catch (error) {
      console.error("Error loading user from x-user-id:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  // Si no, intentar autenticación JWT tradicional
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Error de autenticación" });
    }
    if (!user) {
      return res.status(401).json({ message: "No autorizado" });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Auth0 logout
app.get("/logout/auth0", (req, res) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: "Auth0 not configured" });
  }

  const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
  logoutURL.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID);
  logoutURL.searchParams.set("returnTo", `${process.env.FRONTEND_URL}/login`);

  res.redirect(logoutURL.toString());
});

// Cambiar correo electrónico
app.post("/cambiar-email", flexibleAuth, async (req, res) => {
  try {
    const { nuevo_email, password_confirm, user_id } = req.body;

    // Validar datos
    if (!nuevo_email || !password_confirm) {
      return res.status(400).json({
        message: "Nuevo correo electrónico y contraseña actual son requeridos",
      });
    }

    // Verificar que el user_id coincida con el usuario autenticado
    if (req.user.id !== user_id) {
      return res.status(403).json({
        message: "No autorizado para cambiar este correo",
      });
    }

    // Validar formato del email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevo_email)) {
      return res.status(400).json({
        message: "Por favor, ingresa un correo electrónico válido",
      });
    }

    // Obtener usuario actual de la base de datos
    const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [
      user_id,
    ]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = userQuery.rows[0];

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(
      password_confirm,
      user.password_hash
    );
    if (!validPassword) {
      // Log failed attempt
      logTransaction(user_id, "CHANGE_EMAIL_FAILED", "FAILED", req, {
        reason: "Invalid password",
      });

      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Verificar que el nuevo email no esté en uso
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [nuevo_email, user_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "El correo electrónico ya está en uso",
      });
    }

    // Actualizar el email
    await pool.query(
      "UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [nuevo_email, user_id]
    );

    // Log successful change
    logTransaction(user_id, "CHANGE_EMAIL", "SUCCESS", req, {
      old_email: user.email,
      new_email: nuevo_email,
    });

    res.json({
      message:
        "Correo electrónico actualizado correctamente. Por seguridad, inicia sesión nuevamente.",
      email: nuevo_email,
    });
  } catch (error) {
    console.error("Error al cambiar correo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Cambiar contraseña
// ============================================================================
// ENDPOINT: POST /cambiar-password
// Rate Limiting: 3 intentos por hora por usuario
// ============================================================================
app.post(
  "/cambiar-password",
  passwordChangeLimiter,
  flexibleAuth,
  async (req, res) => {
    try {
      const { password_actual, password_nueva, user_id } = req.body;

      // Validar datos
      if (!password_actual || !password_nueva) {
        return res.status(400).json({
          message: "Contraseña actual y nueva contraseña son requeridas",
        });
      }

      // Verificar que el user_id coincida con el usuario autenticado
      if (req.user.id !== user_id) {
        return res.status(403).json({
          message: "No autorizado para cambiar esta contraseña",
        });
      }

      // Validar fortaleza de la nueva contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password_nueva)) {
        return res.status(400).json({
          message:
            "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
        });
      }

      // Obtener usuario actual de la base de datos
      const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [
        user_id,
      ]);

      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const user = userQuery.rows[0];

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(
        password_actual,
        user.password_hash
      );
      if (!validPassword) {
        // Log failed attempt
        logTransaction(user_id, "CHANGE_PASSWORD_FAILED", "FAILED", req, {
          reason: "Invalid current password",
        });

        return res
          .status(401)
          .json({ message: "Contraseña actual incorrecta" });
      }

      // Verificar que la nueva contraseña sea diferente
      const samePassword = await bcrypt.compare(
        password_nueva,
        user.password_hash
      );
      if (samePassword) {
        return res.status(400).json({
          message: "La nueva contraseña debe ser diferente a la actual",
        });
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(password_nueva, 10);

      // Actualizar la contraseña
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [hashedPassword, user_id]
      );

      // Invalidar todos los tokens existentes del usuario
      // (Opcional: podrías agregar lógica más sofisticada aquí)

      // Log successful change
      logTransaction(user_id, "CHANGE_PASSWORD", "SUCCESS", req);

      res.json({
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

// Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1 OR email = $1",
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        return done(null, false, { message: "Usuario no encontrado" });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return done(null, false, { message: "Contraseña incorrecta" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Passport JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },
    async (payload, done) => {
      try {
        // Check if token is in blacklist
        const isBlacklisted = await redisClient.get(`blacklist_${payload.jti}`);
        if (isBlacklisted) {
          return done(null, false);
        }

        const result = await pool.query(
          "SELECT id, username, email FROM users WHERE id = $1",
          [payload.sub]
        );

        const user = result.rows[0];
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Auth0 Strategy
if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID) {
  passport.use(
    new Auth0Strategy(
      {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL: process.env.AUTH0_CALLBACK_URL,
      },
      async (accessToken, refreshToken, extraParams, profile, done) => {
        try {
          console.log("Auth0 profile received:", profile);

          // Check if user exists
          let result = await pool.query(
            "SELECT * FROM users WHERE provider = $1 AND provider_id = $2",
            ["auth0", profile.id]
          );

          let user = result.rows[0];

          if (!user) {
            // Create new user from Auth0 profile
            const email =
              profile.emails && profile.emails[0]
                ? profile.emails[0].value
                : profile.email;
            const username =
              profile.nickname || profile.displayName || email.split("@")[0];

            result = await pool.query(
              `INSERT INTO users (username, email, provider, provider_id) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
              [username, email, "auth0", profile.id]
            );
            user = result.rows[0];

            console.log("New user created from Auth0:", user);
          } else {
            console.log("Existing Auth0 user found:", user);
          }

          return done(null, user);
        } catch (error) {
          console.error("Error in Auth0 strategy:", error);
          return done(error);
        }
      }
    )
  );
} else {
  console.log("Auth0 not configured - missing AUTH0_DOMAIN or AUTH0_CLIENT_ID");
}

// Helper function to generate JWT
function generateToken(user) {
  const jti = require("crypto").randomBytes(16).toString("hex");
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    jti: jti,
    iat: Date.now(),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Routes

// Health check
app.get("/health", (req, res) => {
  const auth0Configured = !!(
    process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID
  );
  res.json({
    status: "OK",
    service: "auth-service",
    auth0_configured: auth0Configured,
  });
});

// Local login
// ============================================================================
// ENDPOINT: POST /login
// Rate Limiting: 5 intentos por 15 minutos por IP (skip en tests)
// ============================================================================
app.post(
  "/login",
  isRateLimitEnabled() ? loginLimiter : [],
  async (req, res, next) => {
    try {
      // =========================================================================
      // VALIDACIÓN Y NORMALIZACIÓN EN LOGIN (1.C)
      // =========================================================================
      // Normalizar el username antes de buscar en la base de datos
      // Esto asegura que "Admin", " admin " y "ADMIN" sean el mismo usuario
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Usar valores normalizados para la autenticación
      // Importante: Sobrescribir req.body para que passport use valores normalizados
      req.body.username = value.username;
      req.body.password = value.password;

      passport.authenticate(
        "local",
        { session: false },
        async (err, user, info) => {
          if (err || !user) {
            return res
              .status(401)
              .json({ error: info?.message || "Authentication failed" });
          }

          const token = generateToken(user);

          // Get user preferences
          let preferences = { consulta_service_enabled: true };
          try {
            const userPrefs = await getUserPreferences(user.id);
            preferences.consulta_service_enabled =
              userPrefs.consulta_service_enabled;
          } catch (error) {
            console.error("Error loading user preferences on login:", error);
            // Default to enabled on error
          }

          // Log successful login
          logTransaction(user.id, "LOGIN", "SUCCESS", req);

          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              consulta_service_enabled: preferences.consulta_service_enabled,
            },
          });
        }
      )(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Register
// ============================================================================
// ENDPOINT: POST /register
// Rate Limiting: 3 intentos por hora por IP (skip en tests)
// ============================================================================
app.post(
  "/register",
  isRateLimitEnabled() ? registerLimiter : [],
  async (req, res) => {
    try {
      // =========================================================================
      // VALIDACIÓN Y NORMALIZACIÓN (1.A, 1.B, 1.C)
      // =========================================================================
      // Joi no solo valida, también NORMALIZA los valores:
      // - username: convierte a minúsculas y elimina espacios
      // - email: convierte a minúsculas y elimina espacios
      // - password: valida complejidad
      // Es CRÍTICO usar el valor normalizado (value) en lugar de req.body
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Usar valores NORMALIZADOS de Joi, no los originales de req.body
      const { username, email, password } = value;

      // Check if user exists
      // Nota: La búsqueda también debe usar valores normalizados
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE username = $1 OR email = $2",
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: "Usuario o email ya existe" });
      }

      // Hash password
      const saltRounds = process.env.NODE_ENV === "production" ? 10 : 4;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user (guardamos valores normalizados)
      const result = await pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username, email, passwordHash]
      );

      const user = result.rows[0];
      const token = generateToken(user);

      // Log registration
      logTransaction(user.id, "REGISTER", "SUCCESS", req);

      res.status(201).json({
        token,
        user,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Auth0 routes
// Auth0 login
app.get("/login/auth0", (req, res, next) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: "Auth0 not configured" });
  }

  passport.authenticate("auth0", {
    scope: "openid email profile",
  })(req, res, next);
});

// Auth0 callback
app.get("/login/auth0/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user, info) => {
    if (err) {
      console.error("Auth0 callback error:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_error`);
    }

    if (!user) {
      console.error("Auth0 callback: no user returned");
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=auth_failed`
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Log successful SSO login
    logTransaction(user.id, "SSO_LOGIN", "SUCCESS", req);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
});

// Verify token
app.get(
  "/verify",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  }
);

// Logout
app.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.decode(token);

      // Add token to blacklist
      await redisClient.setEx(
        `blacklist_${decoded.jti}`,
        24 * 60 * 60, // 24 hours
        "true"
      );

      // Log logout
      logTransaction(req.user.id, "LOGOUT", "SUCCESS", req);

      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Auth0 logout
app.get("/logout/auth0", (req, res) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: "Auth0 not configured" });
  }

  const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
  logoutURL.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID);
  logoutURL.searchParams.set("returnTo", `${process.env.FRONTEND_URL}/login`);

  res.redirect(logoutURL.toString());
});

// Service Registry client para discovery de servicios
const { ServiceRegistryClient } = require("./shared/service-registry-client");
const discoveryClient = new ServiceRegistryClient({}, process.env.SERVICE_REGISTRY_URL);

// Helper function to log transactions
async function logTransaction(userId, type, status, req) {
  try {
    // Descubrir el servicio de logs dinámicamente
    const logServiceUrl = await discoveryClient.getServiceUrl('log-service').catch(() => {
      // Fallback solo si no hay service registry configurado
      console.warn('⚠️ Service discovery failed, using default log-service URL');
      return process.env.LOG_SERVICE_URL || "http://log-service:3005";
    });
    
    await fetch(`${logServiceUrl}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_type: type,
        entity_type: "USER",
        entity_id: userId,
        user_id: userId,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        status: status,
      }),
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    console.log(
      `Auth0 configured: ${!!(
        process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID
      )}`
    );

    // Auto-registrar en el Service Registry
    const serviceConfig = {
      serviceId: "auth-service",
      name: "auth-service",
      host: "auth-service",
      port: parseInt(PORT),
      protocol: "http",
      metadata: {
        version: "1.0.0",
        description: "Authentication and authorization service",
        maintainer: "auth-team",
        healthEndpoint: "/health",
        tags: ["auth", "authentication", "security"],
        capabilities: ["local-auth", "auth0", "jwt", "session-management"],
      },
    };

    createServiceRegistryClient(serviceConfig);
  });
}

// Export app for testing
module.exports = app;
