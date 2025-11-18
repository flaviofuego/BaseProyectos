const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
require("dotenv").config();

// Service Discovery Client
class ServiceDiscoveryClient {
  constructor(registryUrl) {
    this.registryUrl = registryUrl;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  async discoverService(serviceName, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.cache.has(serviceName)) {
        const cached = this.cache.get(serviceName);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await axios.get(
        `${this.registryUrl}/discover/${serviceName}`
      );
      const serviceData = response.data;

      // Cache the result
      this.cache.set(serviceName, {
        data: serviceData,
        timestamp: Date.now(),
      });

      return serviceData;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Service not found: ${serviceName}`);
      }
      console.error(
        `Failed to discover service ${serviceName}:`,
        error.message
      );
      throw error;
    }
  }

  async getServiceUrl(serviceName) {
    try {
      const discovery = await this.discoverService(serviceName);
      return discovery.instance.url;
    } catch (error) {
      throw new Error(
        `Failed to get URL for service ${serviceName}: ${error.message}`
      );
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

console.log("🚀 Iniciando API Gateway con Service Discovery...");

const app = express();
const PORT = process.env.PORT || 8001;
const SERVICE_REGISTRY_URL =
  process.env.SERVICE_REGISTRY_URL || "http://service-registry:3010";

// Initialize Service Discovery Client
const serviceDiscovery = new ServiceDiscoveryClient(SERVICE_REGISTRY_URL);

console.log(`🔍 Service Registry URL: ${SERVICE_REGISTRY_URL}`);

// Middleware de seguridad con CSP personalizada para permitir imágenes
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: [
          "'self'",
          "data:",
          "http://localhost:8001",
          "http://localhost:5000",
          "http://localhost:3002",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:8001",
          "http://localhost:5000",
        ],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: [
      "http://localhost:5000", // Frontend
      "http://localhost:3000", // Por si se usa otro puerto
      "http://127.0.0.1:5000", // Alternativo para localhost
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
app.use(morgan("combined"));
// Parseo de JSON para que los proxys puedan reenviar correctamente el body
app.use(express.json());

// Rate limiting
// En producción limitamos a 100 req/15min; en desarrollo/test elevamos el límite
// para no bloquear pruebas de carga y performance.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "production" ? 100 : 100000, // límite alto en dev/test
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Dynamic Service URL Resolution using Service Discovery
async function getServiceUrl(serviceName) {
  try {
    return await serviceDiscovery.getServiceUrl(serviceName);
  } catch (error) {
    console.error(
      `❌ Failed to discover service ${serviceName}:`,
      error.message
    );
    throw error;
  }
}

// Service Health Check
async function checkServiceHealth(serviceName) {
  try {
    const serviceUrl = await getServiceUrl(serviceName);
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Health check failed for ${serviceName}:`, error.message);
    return false;
  }
}

// Middleware para verificar autenticación (excepto para login, health y uploads)
const authMiddleware = async (req, res, next) => {
  console.log("DEBUG: Auth middleware called for:", req.method, req.path);
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/health",
    "/uploads",
  ];
  const healthPaths = [
    "/api/auth/health",
    "/api/personas/health",
    "/api/consulta/health",
    "/api/nlp/health",
    "/api/logs/health",
  ];

  if (
    publicPaths.some((path) => req.path.startsWith(path)) ||
    healthPaths.includes(req.path)
  ) {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];
  console.log("DEBUG: Received token:", token);
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Para tokens temporales del frontend, extraer user ID
  if (token.startsWith("temp-")) {
    // Token temporal: usar ID específico basado en el tipo de token
    if (token === "temp-admin-token") {
      req.headers["x-user-id"] = "1"; // ID fijo para admin
      console.log("DEBUG: Set user_id to 1 for temp-admin-token");
    } else if (token === "temp-dev-user-token") {
      req.headers["x-user-id"] = "1"; // ID del usuario admin para desarrollo
      console.log("DEBUG: Set user_id to 1 for temp-dev-user-token");
    } else if (token.includes("-")) {
      // Extraer username del token y generar ID consistente
      const username = token.replace("temp-", "").replace("-token", "");
      const userId = String(
        (Math.abs(
          username.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0)
        ) %
          1000) +
          10
      ); // ID entre 10-1009
      req.headers["x-user-id"] = userId;
      console.log("DEBUG: Set user_id to", userId, "for username", username);
    } else {
      // Fallback para tokens temporales malformados
      req.headers["x-user-id"] = "999";
      console.log(
        "DEBUG: Set fallback user_id to 999 for malformed temp token"
      );
    }
    return next();
  }

  // Para tokens reales, verificar con el servicio de autenticación
  try {
    const authServiceUrl = await getServiceUrl("auth-service");
    const authResponse = await axios.get(`${authServiceUrl}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (authResponse.status === 200) {
      req.headers["x-user-id"] = String(authResponse.data.user.id);
      next();
    } else {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ error: "Token verification failed" });
  }
};

// Middleware para verificar si el servicio de consulta está habilitado para el usuario
const checkConsultaServiceEnabled = async (req, res, next) => {
  try {
    // Solo aplicar a rutas del servicio de consulta (excepto health checks)
    if (
      !req.path.startsWith("/api/consulta") ||
      req.path === "/api/consulta/health"
    ) {
      return next();
    }

    const userId = req.headers["x-user-id"];

    if (!userId) {
      console.warn(
        "No user ID found in request, allowing consulta service access"
      );
      return next();
    }

    console.log(`DEBUG: Checking consulta service status for user ${userId}`);

    // Check with auth service
    const authServiceUrl = await getServiceUrl("auth-service");
    const checkResponse = await axios.get(
      `${authServiceUrl}/preferences/consulta-service/check/${userId}`,
      { timeout: 2000 }
    );

    if (checkResponse.data.enabled === false) {
      console.log(`DEBUG: Consulta service is DISABLED for user ${userId}`);
      return res.status(403).json({
        error: "Servicio de consulta deshabilitado",
        message:
          "El servicio de consulta está deshabilitado para tu usuario. Puedes habilitarlo desde la configuración de tu cuenta.",
        service_disabled: true,
      });
    }

    console.log(`DEBUG: Consulta service is ENABLED for user ${userId}`);
    next();
  } catch (error) {
    console.error("Error checking consulta service status:", error.message);
    // En caso de error, permitir acceso por defecto (fail-open para no romper funcionalidad)
    next();
  }
};

console.log("Configuring auth middleware...");
app.use(authMiddleware);

console.log("Configuring consulta service check middleware...");
app.use(checkConsultaServiceEnabled);

// Dynamic Proxy Creator
function createDynamicProxy(serviceName, pathRewrite = {}) {
  return createProxyMiddleware({
    target: "http://placeholder", // Will be replaced dynamically
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
    pathRewrite: pathRewrite,
    router: async (req) => {
      try {
        const serviceUrl = await getServiceUrl(serviceName);
        console.log(
          `🔄 Routing ${req.method} ${req.path} to ${serviceName} at ${serviceUrl}`
        );
        return serviceUrl;
      } catch (error) {
        console.error(`❌ Failed to route to ${serviceName}:`, error.message);
        throw error;
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user_id from middleware
      if (req.headers["x-user-id"]) {
        proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
        console.log(
          `DEBUG: Forwarding x-user-id to ${serviceName}:`,
          req.headers["x-user-id"]
        );
      }

      // Reinyecta el body si existe
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Service temporarily unavailable",
          service: serviceName,
          details: err.message,
        });
      }
    },
  });
}

// Rutas del API Gateway con Service Discovery

// Servicio de Autenticación
app.use("/api/auth", createDynamicProxy("auth-service", { "^/api/auth": "" }));

// Servicio de Personas (CRUD)
app.use(
  "/api/personas",
  createDynamicProxy("personas-service", { "^/api/personas": "" })
);

// Servicio de Consultas
app.use(
  "/api/consulta",
  createDynamicProxy("consulta-service", { "^/api/consulta": "" })
);

// Servicio de NLP
app.use("/api/nlp", createDynamicProxy("nlp-service", { "^/api/nlp": "" }));

// Servicio de Logs
app.use("/api/logs", createDynamicProxy("log-service", { "^/api/logs": "" }));

// Servir imágenes desde el servicio de personas (usando service discovery)
app.use(
  "/uploads",
  createDynamicProxy("personas-service", { "^/uploads": "/uploads" })
);

// Health check endpoint con Service Discovery
app.get("/health", async (req, res) => {
  try {
    const serviceList = await axios.get(`${SERVICE_REGISTRY_URL}/services`);
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      serviceRegistry: SERVICE_REGISTRY_URL,
      registeredServices: serviceList.data.services || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Service Registry unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Exportar app para pruebas y levantar servidor sólo si se ejecuta directamente
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(
      `🚀 API Gateway running on port ${PORT} with Service Discovery!`
    );
    console.log(`🔍 Service Registry: ${SERVICE_REGISTRY_URL}`);
    console.log("✅ Service Discovery enabled");

    // Test service registry connection
    try {
      await axios.get(`${SERVICE_REGISTRY_URL}/health`);
      console.log("✅ Connected to Service Registry");
    } catch (error) {
      console.error("❌ Failed to connect to Service Registry:", error.message);
    }
  });
}

module.exports = { app };
