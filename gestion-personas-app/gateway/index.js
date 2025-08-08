const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware de seguridad
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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

// Middleware para verificar autenticación (excepto para login y health)
const authMiddleware = async (req, res, next) => {
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/health'];
  
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Aquí se verificaría el token con el servicio de autenticación
  req.headers['x-user-id'] = 'user-id-from-token'; // Placeholder
  next();
};

app.use(authMiddleware);

// Rutas del API Gateway

// Servicio de Autenticación
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
  }
}));

// Servicio de Personas (CRUD)
app.use('/api/personas', createProxyMiddleware({
  target: services.personas,
  changeOrigin: true,
  pathRewrite: {
    '^/api/personas': ''
  }
}));

// Servicio de Consultas
app.use('/api/consulta', createProxyMiddleware({
  target: services.consulta,
  changeOrigin: true,
  pathRewrite: {
    '^/api/consulta': ''
  }
}));

// Servicio de NLP
app.use('/api/nlp', createProxyMiddleware({
  target: services.nlp,
  changeOrigin: true,
  pathRewrite: {
    '^/api/nlp': ''
  }
}));

// Servicio de Logs
app.use('/api/logs', createProxyMiddleware({
  target: services.log,
  changeOrigin: true,
  pathRewrite: {
    '^/api/logs': ''
  }
}));

// Health check
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
