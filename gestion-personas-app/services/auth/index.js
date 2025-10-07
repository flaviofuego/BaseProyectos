// Auth service for user authentication and authorization
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const Auth0Strategy = require('passport-auth0');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const session = require('express-session');
const Joi = require('joi');
const helmet = require('helmet');
const cors = require('cors');
// const { createServiceRegistryClient } = require('../shared/service-registry-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:3000', 'http://localhost:8001'],
  credentials: true
}));

// Session configuration for Auth0
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '24h';

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
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
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    // If no preferences exist, create default preferences
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO user_preferences (user_id, consulta_service_enabled) VALUES ($1, TRUE)',
        [userId]
      );
      
      result = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      );
    }

    const preferences = result.rows[0];
    
    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(preferences));
    
    return preferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
}

// Helper function to invalidate user preferences cache
async function invalidateUserPreferencesCache(userId) {
  try {
    const cacheKey = `user_prefs:${userId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error('Error invalidating user preferences cache:', error);
  }
}

// Get user preferences
app.get('/preferences',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await getUserPreferences(userId);

      res.json({
        success: true,
        preferences: {
          consulta_service_enabled: preferences.consulta_service_enabled,
          updated_at: preferences.updated_at
        }
      });
    } catch (error) {
      console.error('Error getting preferences:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  }
);

// Update consulta service status
app.put('/preferences/consulta-service',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { enabled } = req.body;

      // Validate input
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false,
          message: 'El campo "enabled" debe ser un valor booleano' 
        });
      }

      // Update or insert preferences
      await pool.query(
        `INSERT INTO user_preferences (user_id, consulta_service_enabled)
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET consulta_service_enabled = $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, enabled]
      );

      // Invalidate cache
      await invalidateUserPreferencesCache(userId);

      // Log the change
      logTransaction(userId, 'UPDATE_PREFERENCES', 'SUCCESS', req, {
        preference: 'consulta_service_enabled',
        new_value: enabled
      });

      res.json({
        success: true,
        message: `Servicio de consulta ${enabled ? 'habilitado' : 'deshabilitado'} correctamente`,
        preferences: {
          consulta_service_enabled: enabled
        }
      });
    } catch (error) {
      console.error('Error updating consulta service preference:', error);
      logTransaction(req.user.id, 'UPDATE_PREFERENCES', 'ERROR', req, null, error.message);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  }
);

// Check if consulta service is enabled for a user (used by gateway)
app.get('/preferences/consulta-service/check/:userId',
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ 
          enabled: true, // Default to enabled on invalid input
          message: 'Invalid user ID' 
        });
      }

      const preferences = await getUserPreferences(userId);

      res.json({
        enabled: preferences.consulta_service_enabled,
        user_id: userId
      });
    } catch (error) {
      console.error('Error checking consulta service status:', error);
      // Default to enabled on error to avoid breaking functionality
      res.json({ 
        enabled: true,
        user_id: req.params.userId,
        error: 'Error checking preferences, defaulting to enabled'
      });
    }
  }
);

// ============================================================================
// ACCOUNT MANAGEMENT ENDPOINTS
// ============================================================================

// Auth0 logout
app.get('/logout/auth0', (req, res) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: 'Auth0 not configured' });
  }
  
  const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
  logoutURL.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID);
  logoutURL.searchParams.set('returnTo', `${process.env.FRONTEND_URL}/login`);
  
  res.redirect(logoutURL.toString());
});

// Cambiar correo electrónico
app.post('/cambiar-email',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { nuevo_email, password_confirm, user_id } = req.body;

      // Validar datos
      if (!nuevo_email || !password_confirm) {
        return res.status(400).json({ 
          message: 'Nuevo correo electrónico y contraseña actual son requeridos' 
        });
      }

      // Verificar que el user_id coincida con el usuario autenticado
      if (req.user.id !== user_id) {
        return res.status(403).json({ 
          message: 'No autorizado para cambiar este correo' 
        });
      }

      // Validar formato del email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nuevo_email)) {
        return res.status(400).json({ 
          message: 'Por favor, ingresa un correo electrónico válido' 
        });
      }

      // Obtener usuario actual de la base de datos
      const userQuery = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );

      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const user = userQuery.rows[0];

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(password_confirm, user.password_hash);
      if (!validPassword) {
        // Log failed attempt
        logTransaction(user_id, 'CHANGE_EMAIL_FAILED', 'FAILED', req, {
          reason: 'Invalid password'
        });
        
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      // Verificar que el nuevo email no esté en uso
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [nuevo_email, user_id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          message: 'El correo electrónico ya está en uso' 
        });
      }

      // Actualizar el email
      await pool.query(
        'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [nuevo_email, user_id]
      );

      // Log successful change
      logTransaction(user_id, 'CHANGE_EMAIL', 'SUCCESS', req, {
        old_email: user.email,
        new_email: nuevo_email
      });

      res.json({ 
        message: 'Correo electrónico actualizado correctamente. Por seguridad, inicia sesión nuevamente.',
        email: nuevo_email
      });

    } catch (error) {
      console.error('Error al cambiar correo:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// Cambiar contraseña
app.post('/cambiar-password',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { password_actual, password_nueva, user_id } = req.body;

      // Validar datos
      if (!password_actual || !password_nueva) {
        return res.status(400).json({ 
          message: 'Contraseña actual y nueva contraseña son requeridas' 
        });
      }

      // Verificar que el user_id coincida con el usuario autenticado
      if (req.user.id !== user_id) {
        return res.status(403).json({ 
          message: 'No autorizado para cambiar esta contraseña' 
        });
      }

      // Validar fortaleza de la nueva contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password_nueva)) {
        return res.status(400).json({ 
          message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número' 
        });
      }

      // Obtener usuario actual de la base de datos
      const userQuery = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );

      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const user = userQuery.rows[0];

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(password_actual, user.password_hash);
      if (!validPassword) {
        // Log failed attempt
        logTransaction(user_id, 'CHANGE_PASSWORD_FAILED', 'FAILED', req, {
          reason: 'Invalid current password'
        });
        
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }

      // Verificar que la nueva contraseña sea diferente
      const samePassword = await bcrypt.compare(password_nueva, user.password_hash);
      if (samePassword) {
        return res.status(400).json({ 
          message: 'La nueva contraseña debe ser diferente a la actual' 
        });
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(password_nueva, 10);

      // Actualizar la contraseña
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, user_id]
      );

      // Invalidar todos los tokens existentes del usuario
      // (Opcional: podrías agregar lógica más sofisticada aquí)
      
      // Log successful change
      logTransaction(user_id, 'CHANGE_PASSWORD', 'SUCCESS', req);

      res.json({ 
        message: 'Contraseña actualizada correctamente'
      });

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

// Passport Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      
      const user = result.rows[0];
      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return done(null, false, { message: 'Contraseña incorrecta' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Passport JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
}, async (payload, done) => {
  try {
    // Check if token is in blacklist
    const isBlacklisted = await redisClient.get(`blacklist_${payload.jti}`);
    if (isBlacklisted) {
      return done(null, false);
    }

    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
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
}));

// Auth0 Strategy
if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID) {
  passport.use(new Auth0Strategy({
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL
  }, async (accessToken, refreshToken, extraParams, profile, done) => {
    try {
      console.log('Auth0 profile received:', profile);
      
      // Check if user exists
      let result = await pool.query(
        'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
        ['auth0', profile.id]
      );
      
      let user = result.rows[0];
      
      if (!user) {
        // Create new user from Auth0 profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : profile.email;
        const username = profile.nickname || profile.displayName || email.split('@')[0];
        
        result = await pool.query(
          `INSERT INTO users (username, email, provider, provider_id) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [username, email, 'auth0', profile.id]
        );
        user = result.rows[0];
        
        console.log('New user created from Auth0:', user);
      } else {
        console.log('Existing Auth0 user found:', user);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Error in Auth0 strategy:', error);
      return done(error);
    }
  }));
} else {
  console.log('Auth0 not configured - missing AUTH0_DOMAIN or AUTH0_CLIENT_ID');
}

// Helper function to generate JWT
function generateToken(user) {
  const jti = require('crypto').randomBytes(16).toString('hex');
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    jti: jti,
    iat: Date.now()
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  const auth0Configured = !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID);
  res.json({ 
    status: 'OK', 
    service: 'auth-service',
    auth0_configured: auth0Configured
  });
});

// Local login
app.post('/login', async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(401).json({ error: info?.message || 'Authentication failed' });
      }

      const token = generateToken(user);
      
      // Log successful login
      logTransaction(user.id, 'LOGIN', 'SUCCESS', req);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    })(req, res, next);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }

    // Hash password
    const saltRounds = process.env.NODE_ENV === 'production' ? 10 : 4;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    // Log registration
    logTransaction(user.id, 'REGISTER', 'SUCCESS', req);

    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth0 routes
// Auth0 login
app.get('/login/auth0', (req, res, next) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: 'Auth0 not configured' });
  }
  
  passport.authenticate('auth0', {
    scope: 'openid email profile'
  })(req, res, next);
});

// Auth0 callback
app.get('/login/auth0/callback', (req, res, next) => {
  passport.authenticate('auth0', (err, user, info) => {
    if (err) {
      console.error('Auth0 callback error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_error`);
    }
    
    if (!user) {
      console.error('Auth0 callback: no user returned');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Generate JWT token
    const token = generateToken(user);
    
    // Log successful SSO login
    logTransaction(user.id, 'SSO_LOGIN', 'SUCCESS', req);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
});

// Verify token
app.get('/verify',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ 
      valid: true, 
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      }
    });
  }
);

// Logout
app.post('/logout',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = jwt.decode(token);
      
      // Add token to blacklist
      await redisClient.setEx(
        `blacklist_${decoded.jti}`,
        24 * 60 * 60, // 24 hours
        'true'
      );

      // Log logout
      logTransaction(req.user.id, 'LOGOUT', 'SUCCESS', req);

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Auth0 logout
app.get('/logout/auth0', (req, res) => {
  if (!process.env.AUTH0_DOMAIN) {
    return res.status(501).json({ error: 'Auth0 not configured' });
  }
  
  const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
  logoutURL.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID);
  logoutURL.searchParams.set('returnTo', `${process.env.FRONTEND_URL}/login`);
  
  res.redirect(logoutURL.toString());
});

// Helper function to log transactions
async function logTransaction(userId, type, status, req) {
  try {
    // Send log to log service
    const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://log-service:3005';
    await fetch(`${logServiceUrl}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_type: type,
        entity_type: 'USER',
        entity_id: userId,
        user_id: userId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: status
      })
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Auth0 configured: ${!!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID)}`);
  
  // Auto-registrar en el Service Registry
  const serviceConfig = {
    serviceId: 'auth-service',
    name: 'auth-service',
    host: 'auth-service',
    port: parseInt(PORT),
    protocol: 'http',
    metadata: {
      version: '1.0.0',
      description: 'Authentication and authorization service',
      maintainer: 'auth-team',
      healthEndpoint: '/health',
      tags: ['auth', 'authentication', 'security'],
      capabilities: ['local-auth', 'auth0', 'jwt', 'session-management']
    }
  };
  
  // createServiceRegistryClient(serviceConfig);
});