const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

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
  
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  console.log('DEBUG: Received token:', token);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Para tokens temporales del frontend, extraer user ID
  if (token.startsWith('temp-')) {
    // Token temporal: usar ID fijo para admin o hash del username
    if (token === 'temp-admin-token') {
      req.headers['x-user-id'] = '1'; // ID fijo para admin
      console.log('DEBUG: Set user_id to 1 for temp-admin-token');
    } else {
      // Extraer username del token y generar ID consistente
      const username = token.replace('temp-', '').replace('-token', '');
      req.headers['x-user-id'] = String(Math.abs(username.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % 1000 + 1); // ID entre 1-1000
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
    // Verificar token y establecer user_id
    const token = req.headers.authorization?.split(' ')[1];
    console.log('DEBUG: Processing token in personas proxy:', token);
    
    if (token && token.startsWith('temp-')) {
      if (token === 'temp-admin-token') {
        proxyReq.setHeader('x-user-id', '1');
        console.log('DEBUG: Set x-user-id to 1 for temp-admin-token');
      } else {
        const username = token.replace('temp-', '').replace('-token', '');
        const userId = String(Math.abs(username.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0)) % 1000 + 1);
        proxyReq.setHeader('x-user-id', userId);
        console.log('DEBUG: Set x-user-id to', userId, 'for token', token);
      }
    } else {
      proxyReq.setHeader('x-user-id', '1'); // Fallback
      console.log('DEBUG: Set fallback x-user-id to 1');
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
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Services:', services);
});

