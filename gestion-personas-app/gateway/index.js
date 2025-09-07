const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

console.log('🚀 Iniciando API Gateway en modo desarrollo con hot reload...');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware de seguridad
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por ventana
});
app.use('/api/', limiter);

// Configuración de servicios
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  personas: process.env.PERSONAS_SERVICE_URL || 'http://personas-service:3002',
  consulta: process.env.CONSULTA_SERVICE_URL || 'http://consulta-service:3003',
  nlp: process.env.NLP_SERVICE_URL || 'http://nlp-service:3004',
  log: process.env.LOG_SERVICE_URL || 'http://log-service:3005'
};

// Middleware para verificar autenticación (excepto para login, health y uploads)
const authMiddleware = async (req, res, next) => {
  console.log('DEBUG: Auth middleware called for:', req.method, req.path);
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/health', '/uploads'];
  const healthPaths = ['/api/auth/health', '/api/personas/health', '/api/consulta/health', '/api/nlp/health', '/api/logs/health'];
  
  if (publicPaths.some(path => req.path.startsWith(path)) || healthPaths.includes(req.path)) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  console.log('DEBUG: Received token:', token);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Para tokens temporales del frontend, extraer user ID
  if (token.startsWith('temp-')) {
    // Token temporal: usar ID específico basado en el tipo de token
    if (token === 'temp-admin-token') {
      req.headers['x-user-id'] = '1'; // ID fijo para admin
      console.log('DEBUG: Set user_id to 1 for temp-admin-token');
    } else if (token === 'temp-dev-user-token') {
      req.headers['x-user-id'] = '999'; // ID específico para dev-user
      console.log('DEBUG: Set user_id to 999 for temp-dev-user-token');
    } else if (token.includes('-')) {
      // Extraer username del token y generar ID consistente
      const username = token.replace('temp-', '').replace('-token', '');
      const userId = String(Math.abs(username.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % 1000 + 10); // ID entre 10-1009
      req.headers['x-user-id'] = userId;
      console.log('DEBUG: Set user_id to', userId, 'for username', username);
    } else {
      // Fallback para tokens temporales malformados
      req.headers['x-user-id'] = '999';
      console.log('DEBUG: Set fallback user_id to 999 for malformed temp token');
    }
    return next();
  }

  // Para tokens reales, verificar con el servicio de autenticación
  try {
    const authResponse = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (authResponse.status === 200) {
      req.headers['x-user-id'] = String(authResponse.data.user.id);
      next();
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

console.log('Configuring auth middleware...');
app.use(authMiddleware);

// Rutas del API Gateway

// Servicio de Autenticación
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: {
    '^/api/auth': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Reinyecta el body si existe (cuando algún middleware lo haya parseado)
    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Bad gateway', details: err.message });
    }
  }
}));

// Servicio de Personas (CRUD)
app.use('/api/personas', createProxyMiddleware({
  target: services.personas,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: {
    '^/api/personas': ''
  },
  onProxyReq: (proxyReq, req) => {
    // Pass user_id from middleware if it exists
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      console.log('DEBUG: Forwarding x-user-id:', req.headers['x-user-id']);
    } else {
      console.log('WARNING: No x-user-id found in headers');
    }

    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Servicio de Consultas
app.use('/api/consulta', createProxyMiddleware({
  target: services.consulta,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: {
    '^/api/consulta': ''
  },
  onProxyReq: (proxyReq, req) => {
    // Forward user_id from middleware
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      console.log('DEBUG: Forwarding x-user-id to consulta:', req.headers['x-user-id']);
    }

    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Servicio de NLP
app.use('/api/nlp', createProxyMiddleware({
  target: services.nlp,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: {
    '^/api/nlp': ''
  },
  onProxyReq: (proxyReq, req) => {
    // Forward user_id from middleware
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      console.log('DEBUG: Forwarding x-user-id to nlp:', req.headers['x-user-id']);
    }

    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Servicio de Logs
app.use('/api/logs', createProxyMiddleware({
  target: services.log,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  pathRewrite: {
    '^/api/logs': ''
  },
  onProxyReq: (proxyReq, req) => {
    // Forward user_id from middleware
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      console.log('DEBUG: Forwarding x-user-id to logs:', req.headers['x-user-id']);
    }

    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// Servir imágenes desde el servicio de personas
app.use('/uploads', createProxyMiddleware({
  target: services.personas,
  changeOrigin: true,
  pathRewrite: {
    '^/uploads': '/uploads'
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    services: services,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT} - HOT RELOAD FUNCIONANDO!`);
  console.log('Services:', services);
  console.log('✅ Modo desarrollo activo');
});

// Comentario para probar hot reload - 09/04/2025 09:25:19
