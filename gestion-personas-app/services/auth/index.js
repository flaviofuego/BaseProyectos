const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const Joi = require('joi');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

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

// Microsoft Entra ID (Azure AD) Strategy
if (process.env.AZURE_AD_TENANT_ID) {
  passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_AD_CLIENT_ID,
    responseType: 'code',
    responseMode: 'query',
    redirectUrl: process.env.AZURE_AD_REDIRECT_URL,
    allowHttpForRedirectUrl: true,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    validateIssuer: false,
    passReqToCallback: false,
    scope: ['profile', 'email', 'openid']
  },
  async (iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      // Check if user exists
      let result = await pool.query(
        'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
        ['microsoft', profile.oid]
      );
      
      let user = result.rows[0];
      
      if (!user) {
        // Create new user
        result = await pool.query(
          'INSERT INTO users (username, email, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [profile.displayName, profile.email || profile.upn, 'microsoft', profile.oid]
        );
        user = result.rows[0];
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
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
  res.json({ status: 'OK', service: 'auth-service' });
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
    const passwordHash = await bcrypt.hash(password, 10);

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

// Microsoft login
app.get('/login/microsoft',
  passport.authenticate('azuread-openidconnect', { session: false })
);

app.get('/login/microsoft/callback',
  passport.authenticate('azuread-openidconnect', { session: false }),
  (req, res) => {
    const token = generateToken(req.user);
    
    // Log successful SSO login
    logTransaction(req.user.id, 'SSO_LOGIN', 'SUCCESS', req);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

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
});