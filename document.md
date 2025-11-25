flaviofuego: @workspace dame una explicacion detallada de como funciona el backend de esta aplicacion, con un enfasis especial en como se conectan los contenedores y como estan conformados los docker-compose

Workspace: Recopilando información del área de trabajo# Explicación Detallada del Backend - Sistema de Gestión de Personas

## Arquitectura General

Este sistema implementa una **arquitectura de microservicios** con contenedores Docker, donde cada servicio tiene responsabilidades específicas y se comunica a través de una red compartida.

## 🏗️ Componentes Principales del Backend

### 1. **API Gateway** (`gateway/`)
- **Puerto**: 8001
- **Función**: Punto de entrada único para todas las peticiones
- **Responsabilidades**:
  - Enrutamiento de peticiones a microservicios
  - Autenticación y autorización centralizada
  - Balanceo de carga entre servicios
  - Gestión de CORS y seguridad

### 2. **Microservicios** (`services/`)

#### **Auth Service** (Puerto: 3001)
- Autenticación con Auth0 OAuth 2.0
- Generación y validación de JWT tokens
- Gestión de sesiones de usuario
- Variables clave: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `JWT_SECRET`

#### **Personas Service** (Puerto: 3002)
- CRUD de personas
- Validación de datos
- Conexión directa con PostgreSQL
- Usa `DATABASE_URL` para conectarse a la BD

#### **Consulta Service** (Puerto: 3003)
- Búsquedas y filtros avanzados
- Caché con Redis (`REDIS_URL`)
- Optimización de queries recurrentes

#### **NLP Service** (Puerto: 3004)
- Procesamiento de lenguaje natural
- Integración con Google Gemini (`GEMINI_API_KEY`)
- Búsqueda semántica con Qdrant (`QDRANT_URL`)
- Embeddings con Azure OpenAI (`AZURE_EMBEDDING_MODEL`)

#### **Log Service** (Puerto: 3005)
- Auditoría centralizada de eventos
- Registro de todas las operaciones del sistema
- Almacenamiento en PostgreSQL

### 3. **Service Registry** (Puerto: 3010)
- **Service Discovery**: Registro dinámico de microservicios
- Health checks automáticos
- Balanceo de carga
- Variable: `SERVICE_REGISTRY_URL`

### 4. **Bases de Datos y Caché**

#### **PostgreSQL** (`personas_db`)
- Puerto: 5432
- Usuario: `admin` / Password: `admin123`
- Base de datos: `personas_db`
- Scripts de inicialización en `database/init.sql`
- Backups automáticos en `database/backups/`

#### **Redis**
- Puerto: 6379
- Caché de queries frecuentes
- Sesiones temporales
- TTL configurable

#### **Qdrant Vector DB**
- Puerto: 6333
- Almacenamiento de embeddings vectoriales
- Búsqueda semántica por similitud

## 🐳 Arquitectura Docker Compose

### **docker-compose.yml** (Producción)
Estructura base con servicios en modo producción:

```yaml
services:
  # Base de datos
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - DATABASE_URL=${DATABASE_URL}
  
  # Caché
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  # Vector DB
  qdrant:
    image: qdrant/qdrant
    ports: ["6333:6333"]
  
  # Service Registry (primero que inicia)
  service-registry:
    build: ./services/service-registry
    ports: ["3010:3010"]
    depends_on: [postgres, redis]
  
  # Microservicios
  auth-service:
    build: ./services/auth
    ports: ["3001:3001"]
    depends_on: [service-registry, postgres]
    environment:
      - SERVICE_REGISTRY_URL=${SERVICE_REGISTRY_URL}
  
  personas-service:
    build: ./services/personas
    ports: ["3002:3002"]
    depends_on: [service-registry, postgres]
  
  consulta-service:
    build: ./services/consulta
    ports: ["3003:3003"]
    depends_on: [service-registry, postgres, redis]
  
  nlp-service:
    build: ./services/nlp
    ports: ["3004:3004"]
    depends_on: [service-registry, qdrant]
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - AZURE_API_KEY=${AZURE_API_KEY}
  
  log-service:
    build: ./services/log
    ports: ["3005:3005"]
    depends_on: [postgres]
  
  # Gateway (último que inicia)
  api-gateway:
    build: ./gateway
    ports: ["8001:8001"]
    depends_on:
      - service-registry
      - auth-service
      - personas-service
      - consulta-service
      - nlp-service
      - log-service
    environment:
      - API_GATEWAY_URL=${API_GATEWAY_URL}
  
  # Frontend
  flask-app:
    build: ./frontend
    ports: ["5000:5000"]
    depends_on: [api-gateway]
    environment:
      - FRONTEND_URL=${FRONTEND_URL}

networks:
  default:
    name: personas-network
```

### **docker-compose.dev.yml** (Desarrollo)
Extiende el compose base con características de desarrollo:

```yaml
# Características adicionales en DEV:
services:
  auth-service:
    volumes:
      - ./services/auth:/app          # Hot reload
      - /app/node_modules              # Volumen anónimo
    command: npm run dev               # Nodemon
    environment:
      - NODE_ENV=development
  
  # ... mismo patrón para todos los servicios Node.js
  
  flask-app:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - FLASK_ENV=development
      - FLASK_DEBUG=1
```

## 🔄 Flujo de Comunicación entre Contenedores

### 1. **Inicio del Sistema** (Orden de arranque)
```
PostgreSQL → Redis → Qdrant
    ↓
Service Registry (registra su propia ubicación)
    ↓
Microservicios (se registran en Service Registry)
    ↓
API Gateway (consulta Service Registry para ubicar servicios)
    ↓
Frontend (conecta a Gateway)
```

### 2. **Flujo de una Petición HTTP**

```
Cliente (Browser)
    ↓
http://localhost:5000 (Frontend Flask)
    ↓
http://localhost:8001/api/personas (API Gateway)
    ↓
Service Registry (¿dónde está personas-service?)
    ↓
http://personas-service:3002/personas (Microservicio)
    ↓
PostgreSQL (postgres:5432)
    ↓
Redis (cache opcional)
    ↓
Log Service (auditoría)
    ↓
Response → Gateway → Frontend → Cliente
```

### 3. **Service Discovery en Acción**

Cuando `personas-service` inicia:
```javascript
// Código en servicios Node.js
const registerService = async () => {
  await fetch(`${SERVICE_REGISTRY_URL}/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'personas-service',
      url: 'http://personas-service:3002',
      health: '/health'
    })
  });
};
```

Cuando Gateway necesita llamar a un servicio:
```javascript
// Gateway consulta el registro
const serviceUrl = await serviceRegistry.getService('personas-service');
const response = await fetch(`${serviceUrl}/personas`);
```

## 🔐 Gestión de Variables de Entorno

El archivo .env se inyecta en todos los contenedores:

```bash
# Ejemplo de cómo un servicio accede a las variables
docker-compose up -d
# Docker Compose automáticamente pasa las variables
# definidas en .env a cada contenedor según su configuración
```

Cada servicio accede a sus variables específicas:
- **Auth Service**: `AUTH0_DOMAIN`, `JWT_SECRET`
- **NLP Service**: `GEMINI_API_KEY`, `AZURE_API_KEY`
- **Consulta Service**: `REDIS_URL`

## 🧪 Sistema de Testing

El Makefile proporciona comandos automatizados:

### Tests Unitarios
```bash
make test-unit
# Ejecuta dentro de contenedores dev:
# docker exec auth_service_dev npm test
```

### Tests de Integración
```bash
make test-integration
# Verifica comunicación entre servicios
```

### Tests E2E con Playwright
```bash
make test-e2e
# Inicia contenedores → Espera health checks → Ejecuta Playwright
```

### Tests de Performance
```bash
make test-performance
# Carga concurrente con configuración:
# PERF_CONCURRENCY=15
# PERF_DURATION_MS=15000
```

## 🔧 Comandos Makefile Clave

```bash
# Desarrollo con hot reload
make dev
# → docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Producción
make up
# → docker-compose up -d

# Backup automático antes de detener
make down
# → docker exec personas_db bash /backups/backup.sh
# → docker-compose down

# Health check
make health
# → curl -s http://localhost:8001/health | jq .
```

## 📊 Gestión de Base de Datos

Scripts en `database/`:

### **init.sql**
- Se ejecuta automáticamente al crear el contenedor
- Crea tablas iniciales (`users`, `personas`, `logs`)
- Inserta datos de prueba

### **backup.sh**
```bash
pg_dump -U admin personas_db > /backups/backup_$(date).sql
```

### **restore.sh**
```bash
psql -U admin personas_db < /backups/latest_backup.sql
```

## 🌐 Networking

Todos los contenedores están en la red `personas-network`:

```yaml
networks:
  default:
    name: personas-network
    driver: bridge
```

Esto permite:
- Resolución DNS interna: `http://postgres:5432`
- Comunicación directa entre contenedores
- Aislamiento del host

## 🔄 Flujo de Datos Completo

```
1. Usuario hace login
   Frontend → Gateway → Auth Service → Auth0 → JWT Token

2. Usuario busca personas
   Frontend → Gateway → Service Registry → Consulta Service
   ↓
   Consulta Service verifica Redis (cache)
   ↓
   Si no hay cache → PostgreSQL
   ↓
   Guarda resultado en Redis (TTL: 5min)
   ↓
   Log Service registra la operación
   ↓
   Response

3. Usuario hace consulta NLP
   Frontend → Gateway → NLP Service
   ↓
   NLP Service → Gemini API (embeddings)
   ↓
   Qdrant (búsqueda vectorial)
   ↓
   PostgreSQL (datos completos)
   ↓
   Response con resultados semánticos
```

## 🛡️ Seguridad

- **JWT Tokens**: Generados por Auth Service, validados en Gateway
- **Secrets**: Todas las claves en .env (nunca en código)
- **Network Isolation**: Solo Gateway expone puertos al host
- **Health Checks**: Service Registry monitorea todos los servicios

## 📝 Resumen

Este backend implementa:
1. **Microservicios desacoplados** (cada uno con su responsabilidad)
2. **Service Discovery dinámico** (Service Registry)
3. **API Gateway como proxy inteligente**
4. **Caché multinivel** (Redis + Qdrant)
5. **Observabilidad** (Log Service centralizado)
6. **CI/CD ready** (Makefile con todos los comandos necesarios)
7. **Desarrollo ágil** (Hot reload en modo dev)

La arquitectura permite escalar servicios independientemente y facilita el mantenimiento mediante la separación de responsabilidades.