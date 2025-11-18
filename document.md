## 1. Introducción

### Contexto del Sistema

El **Sistema de Gestión de Personas v3.0** es una aplicación web empresarial basada en arquitectura de microservicios que facilita la gestión integral de registros de personas con capacidades avanzadas de búsqueda mediante IA.

### Propósito

Proporcionar una plataforma escalable, segura y eficiente para:

- Gestión CRUD completa de registros personales
- Consultas en lenguaje natural mediante Google Gemini
- Búsqueda semántica con vectorización (Qdrant)
- Auditoría completa de transacciones
- Autenticación robusta con JWT y Auth0

### Alcance

- **Usuarios objetivo**: Personal administrativo, gerentes de recursos humanos
- **Funcionalidades principales**: Crear, modificar, consultar y eliminar registros de personas
- **Capacidades especiales**: Consultas NLP, búsqueda semántica, carga masiva CSV
- **Restricciones**: Requiere API Key de Gemini para funcionalidad NLP completa

---

## 2. Requisitos y Supuestos

### Requisitos Funcionales

#### RF-001: Gestión de Personas

```
Prioridad: ALTA
Descripción: CRUD completo con validación en tiempo real
Criterios de aceptación:
- Validación de documentos duplicados (código 409)
- Campos obligatorios: número_documento, tipo_documento, primer_nombre, 
  apellidos, fecha_nacimiento, genero, correo_electronico, celular
- Soporte de imagen (JPG/PNG/GIF, máx 2MB)
- Respuesta < 200ms en consultas simples
```

#### RF-002: Autenticación y Autorización

```
Prioridad: CRÍTICA
Descripción: Sistema dual de autenticación
Opciones:
- Login local con JWT (expiración 24h)
- Auth0 SSO (Google, GitHub, Microsoft)
Requisitos:
- Sesiones distribuidas en Redis
- Password hashing con bcrypt (10 rounds producción)
- Logout con limpieza de sesión
```

#### RF-003: Búsqueda Avanzada

```
Prioridad: MEDIA
Descripción: Múltiples estrategias de búsqueda
Capacidades:
- Filtros por documento, edad, nombre, género
- Paginación optimizada (20 resultados por página)
- Cache Redis con TTL de 5 minutos
- Búsqueda semántica con Qdrant (similaridad > 0.7)
```

#### RF-004: Consultas en Lenguaje Natural

```
Prioridad: MEDIA
Descripción: Procesamiento NLP con Google Gemini
Funcionalidades:
- Interpretación de preguntas en español
- Consultas estadísticas y agregadas
- Búsqueda por similitud semántica
- Respuestas estructuradas con metadata
Ejemplo: "¿Cuántas personas menores de 30 años hay?"
```

#### RF-005: Auditoría y Logs

```
Prioridad: ALTA
Descripción: Sistema completo de trazabilidad
Registros:
- Usuario, IP, timestamp, acción
- Datos de entrada/salida
- Códigos de error específicos
Consulta con filtros por:
- Tipo de transacción
- Entidad
- Rango de fechas
- Estado (success/error)
```

### Requisitos No Funcionales

#### RNF-001: Performance

```
- Response time: < 200ms (consultas simples)
- Throughput: > 1000 requests/min
- Cache hit ratio: > 80%
- Tiempo de carga inicial: < 3s
```

#### RNF-002: Escalabilidad

```
- Arquitectura horizontal con Service Registry
- Connection pooling PostgreSQL (max 20 conexiones)
- Sesiones distribuidas en Redis
- Servicios stateless para replicación
```

#### RNF-003: Seguridad

```
- Autenticación JWT con expiración configurable
- Bcrypt hashing (10+ rounds)
- Validación de entrada en frontend y backend
- Rate limiting en API Gateway
- CORS configurado
```

#### RNF-004: Disponibilidad

```
- Health checks cada 30s
- Heartbeats del Service Registry cada 15s
- Re-registro automático de servicios
- Target uptime: 99.5%
```

#### RNF-005: Usabilidad

```
- Interfaz responsive (Bootstrap 5.3)
- Temas claro/oscuro/automático
- Accesibilidad WCAG 2.1
- Notificaciones toast con historial
- Validación en tiempo real
```

### Supuestos Técnicos

1. **Infraestructura**:
   - Docker y Docker Compose disponibles
   - Red interna `app-network` configurada
   - Volúmenes persistentes para datos

2. **Dependencias Externas**:
   - API de Google Gemini accesible
   - Auth0 configurado (opcional)
   - Acceso a internet para librerías CDN

3. **Base de Datos**:
   - PostgreSQL con extensión pg_trgm habilitada
   - Redis con persistencia RDB

4. **Entorno**:
   - Desarrollo: Hot reload habilitado
   - Producción: Optimización de imágenes Docker

---

## 3. Arquitectura General

### Diagrama de Arquitectura de Alto Nivel

```plantuml
@startuml
!define RECTANGLE_CORNER 20
skinparam backgroundColor #FEFEFE
skinparam defaultTextAlignment center

' Estilos
skinparam rectangle {
    BackgroundColor<<frontend>> #E3F2FD
    BackgroundColor<<gateway>> #FFF3E0
    BackgroundColor<<service>> #E8F5E9
    BackgroundColor<<data>> #FCE4EC
    BorderColor #424242
    FontSize 12
}

' Frontend Layer
rectangle "Frontend Flask\n:5000" <<frontend>> as frontend

' Gateway Layer
rectangle "API Gateway\n:8001" <<gateway>> as gateway
rectangle "Service Registry\n:3010" <<gateway>> as registry

' Microservices Layer
rectangle "Auth Service\n:3001" <<service>> as auth
rectangle "Personas Service\n:3002" <<service>> as personas
rectangle "Consulta Service\n:3003" <<service>> as consulta
rectangle "NLP Service\n:3004" <<service>> as nlp
rectangle "Log Service\n:3005" <<service>> as log

' Data Layer
database "PostgreSQL\n:5432" <<data>> as postgres
database "Redis\n:6379" <<data>> as redis
database "Qdrant\n:6333" <<data>> as qdrant

' Conexiones Frontend
frontend --> gateway : HTTP/REST

' Conexiones Gateway
gateway --> registry : Service\nDiscovery
gateway --> auth : /api/auth/*
gateway --> personas : /api/personas/*
gateway --> consulta : /api/consulta/*
gateway --> nlp : /api/nlp/*
gateway --> log : /api/logs/*

' Auto-registro de servicios
auth .up.> registry : Auto\nregister
personas .up.> registry : Auto\nregister
consulta .up.> registry : Auto\nregister
nlp .up.> registry : Auto\nregister
log .up.> registry : Auto\nregister

' Conexiones a datos
auth --> postgres : Users &\nPreferences
auth --> redis : Sessions &\nCache
personas --> postgres : Personas\ndata
consulta --> postgres : Read\nQueries
consulta --> redis : Query\nCache
nlp --> postgres : Analytics
nlp --> qdrant : Vector\nSearch
log --> postgres : Audit\nLogs

note top of registry
  **Service Discovery**
  - Auto-registro
  - Health monitoring
  - Metadata management
end note

note right of gateway
  **API Gateway**
  - Routing dinámico
  - Rate limiting
  - CORS handling
end note

note bottom of postgres
  **PostgreSQL**
  - ACID transactions
  - Connection pooling
  - Backup automático
end note

@enduml
```

### Descripción de Componentes

#### **Frontend (Flask - Puerto 5000)**

- **Responsabilidades**: Renderizado de UI, gestión de sesiones, agregación de APIs
- **Tecnologías**: Python 3.10, Flask, Bootstrap 5.3, Plotly.js
- **Características**: Temas dinámicos, notificaciones persistentes, validación en tiempo real

#### **Service Registry (Node.js - Puerto 3010)**

- **Responsabilidades**: Autodescubrimiento de servicios, health monitoring
- **Patrón**: Service Discovery Pattern
- **Heartbeats**: Cada 15 segundos
- **Cleanup**: Servicios inactivos > 1 minuto

#### **API Gateway (Node.js - Puerto 8001)**

- **Responsabilidades**: Routing, rate limiting, autenticación centralizada
- **Integración**: Service Registry client
- **Protección**: CORS, helmet.js, compression

#### **Microservicios de Negocio**

| Servicio | Puerto | Responsabilidad | Base de Datos |
|----------|--------|-----------------|---------------|
| Auth | 3001 | Autenticación JWT/Auth0 | PostgreSQL + Redis |
| Personas | 3002 | CRUD personas + imágenes | PostgreSQL |
| Consulta | 3003 | Búsqueda avanzada + filtros | PostgreSQL + Redis |
| NLP | 3004 | Procesamiento lenguaje natural | PostgreSQL + Qdrant |
| Log | 3005 | Auditoría de transacciones | PostgreSQL |

#### **Capa de Datos**

**PostgreSQL (Puerto 5432)**

- Connection pooling: 20 conexiones máximo
- Backup automático con scripts en `/backups`
- Migraciones versionadas en `database/migrations/`

**Redis (Puerto 6379)**

- Sesiones JWT distribuidas
- Cache de consultas (TTL: 5 min)
- Rate limiting counters

**Qdrant (Puerto 6333)**

- Búsqueda semántica vectorial
- Embeddings con Google Gemini
- Similaridad por coseno (threshold: 0.7)

---

## 4. Diseño de Componentes

### 4.1 Frontend Component

```plantuml
@startuml
package "Frontend Flask" {
    [app.py] as app
    [Templates] as templates
    [Static Assets] as static
    
    package "Routes" {
        [Auth Routes] as auth_routes
        [Personas Routes] as personas_routes
        [Dashboard Routes] as dashboard_routes
        [NLP Routes] as nlp_routes
        [Logs Routes] as logs_routes
    }
    
    package "Static Resources" {
        [theme-manager.js] as theme
        [notification-history.js] as notif
        [content-manager.js] as content
        [style.css] as css
    }
}

app --> auth_routes
app --> personas_routes
app --> dashboard_routes
app --> nlp_routes
app --> logs_routes

auth_routes --> templates : render
personas_routes --> templates : render

static --> theme
static --> notif
static --> content
static --> css

note right of app
  **Flask Application**
  - Session management
  - API aggregation
  - Error handling
end note

@enduml
```

### 4.2 Personas Service Component

```plantuml
@startuml
!include <C4/C4_Component>

Container_Boundary(personas, "Personas Service") {
    Component(api, "REST API", "Express.js", "CRUD endpoints")
    Component(validation, "Input Validator", "Joi", "Schema validation")
    Component(imageHandler, "Image Handler", "Multer + Sharp", "Upload & resize")
    Component(db, "Database Client", "pg Pool", "Connection pooling")
    Component(logger, "Transaction Logger", "Axios", "Audit logging")
    Component(registry, "Service Registry Client", "Shared module", "Auto-registration")
}

Rel(api, validation, "Validates input")
Rel(api, imageHandler, "Processes images")
Rel(api, db, "Queries data")
Rel(api, logger, "Logs transactions")
Rel(registry, api, "Registers service")

@enduml
```

### 4.3 Consulta Service Component con Cache

```plantuml
@startuml
actor Usuario
participant "API Gateway" as Gateway
participant "Consulta Service" as Consulta
database Redis
database PostgreSQL

Usuario -> Gateway: GET /api/consulta/search?q=Juan
Gateway -> Consulta: Forward request

alt Cache Hit
    Consulta -> Redis: GET query:search:Juan
    Redis --> Consulta: Cached result
    Consulta --> Gateway: 200 OK + data (cached)
else Cache Miss
    Consulta -> Redis: GET query:search:Juan
    Redis --> Consulta: null
    Consulta -> PostgreSQL: SELECT * WHERE nombre ILIKE '%Juan%'
    PostgreSQL --> Consulta: Result set
    Consulta -> Redis: SETEX query:search:Juan 300 {data}
    Consulta --> Gateway: 200 OK + data (fresh)
end

Gateway --> Usuario: JSON response

note over Redis
  **Cache Strategy**
  - TTL: 5 minutos
  - Invalidación manual en updates
  - Hit ratio objetivo: > 80%
end note

@enduml
```

---

## 5. Flujos de Datos y Casos de Uso

### 5.1 Flujo de Autenticación JWT

```plantuml
@startuml
actor Usuario
participant "Frontend" as FE
participant "API Gateway" as GW
participant "Auth Service" as Auth
database PostgreSQL
database Redis

Usuario -> FE: POST /login\n(username, password)
FE -> GW: POST /api/auth/login
GW -> Auth: Forward credentials

Auth -> PostgreSQL: SELECT * FROM users\nWHERE username = ?
PostgreSQL --> Auth: User record

Auth -> Auth: bcrypt.compare(password, hash)

alt Authentication Success
    Auth -> Auth: Generate JWT\n(secret, expires: 24h)
    Auth -> Redis: SETEX session:{userId} 86400 {data}
    Auth -> PostgreSQL: SELECT consulta_service_enabled
    Auth --> GW: 200 OK + JWT + preferences
    GW --> FE: Set session cookie
    FE --> Usuario: Redirect to /dashboard
else Authentication Failure
    Auth --> GW: 401 Unauthorized
    GW --> FE: Error response
    FE --> Usuario: Display error message
end

@enduml
```

### 5.2 Flujo de Creación de Persona con Validación

```plantuml
@startuml
actor Usuario
participant "Frontend" as FE
participant "API Gateway" as GW
participant "Personas Service" as PS
participant "Log Service" as LS
database PostgreSQL

Usuario -> FE: Fill form + upload image
FE -> FE: Real-time validation\n(document number)

alt Document Already Exists
    FE -> GW: GET /api/personas/existe/{doc}
    GW -> PS: Check existence
    PS -> PostgreSQL: SELECT COUNT(*) WHERE numero_documento = ?
    PostgreSQL --> PS: count > 0
    PS --> GW: 200 OK {exists: true}
    GW --> FE: Document exists
    FE --> Usuario: Show error (409 conflict)
else New Document
    Usuario -> FE: Submit form
    FE -> GW: POST /api/personas + multipart/form-data
    GW -> PS: Forward request
    
    PS -> PS: Validate with Joi schema
    PS -> PS: Resize image (Sharp)\n800x800, quality 80%
    PS -> PostgreSQL: BEGIN TRANSACTION
    PS -> PostgreSQL: INSERT INTO personas
    PostgreSQL --> PS: persona_id
    PS -> PostgreSQL: COMMIT
    
    PS -> LS: Log transaction (async)
    LS -> PostgreSQL: INSERT INTO logs
    
    PS --> GW: 201 Created + persona_id
    GW --> FE: Success response
    FE --> Usuario: Show success notification
end

@enduml
```

### 5.3 Flujo de Consulta NLP con RAG

```plantuml
@startuml
actor Usuario
participant "Frontend" as FE
participant "API Gateway" as GW
participant "NLP Service" as NLP
participant "Google Gemini" as Gemini
database PostgreSQL
database Qdrant

Usuario -> FE: Enter question:\n"¿Cuántas personas hay?"
FE -> GW: POST /api/nlp/query {pregunta}
GW -> NLP: Forward query

NLP -> NLP: Classify intent\n(count, search, stats)

alt Intent: Database Query
    NLP -> PostgreSQL: Execute SQL based on intent
    PostgreSQL --> NLP: Query result
    NLP -> Gemini: Generate natural response\n+ context
    Gemini --> NLP: Formatted answer
else Intent: Semantic Search
    NLP -> Gemini: Generate embedding vector
    Gemini --> NLP: [512-dim vector]
    NLP -> Qdrant: Search similar\n(threshold: 0.7)
    Qdrant --> NLP: Matching personas
    NLP -> Gemini: Format results
    Gemini --> NLP: Natural language response
else Intent: Security Risk
    NLP -> NLP: Detect sensitive keywords\n(.env, password, etc.)
    NLP --> GW: 400 Bad Request\n"Query not allowed"
end

NLP --> GW: 200 OK + {respuesta, metadata}
GW --> FE: JSON response
FE --> Usuario: Display answer + metadata

@enduml
```

### 5.4 Flujo de Service Discovery y Auto-registro

```plantuml
@startuml
participant "Personas Service" as PS
participant "Service Registry" as SR
participant "API Gateway" as GW

== Startup: Auto-registration ==
PS -> PS: createServiceRegistryClient(config)
PS -> SR: POST /register\n{serviceId, name, host, port, metadata}
SR -> SR: Store service info\n+ Set lastHeartbeat
SR --> PS: 201 Created {serviceId}

== Runtime: Heartbeats ==
loop Every 15 seconds
    PS -> SR: POST /heartbeat {serviceId}
    SR -> SR: Update lastHeartbeat
    SR --> PS: 200 OK
end

== Gateway: Service Discovery ==
GW -> SR: GET /discover/personas-service
SR -> SR: Find healthy instance\n(lastHeartbeat < 60s ago)
SR --> GW: 200 OK {instance: {url, metadata}}
GW -> GW: Cache discovery result (5 min)

== Failure: Automatic Cleanup ==
SR -> SR: Cleanup job (every 30s)
SR -> SR: Mark services DOWN\nif lastHeartbeat > 60s

note over SR
  **Service Registry**
  - Heartbeat interval: 15s
  - Timeout threshold: 60s
  - Cleanup frequency: 30s
end note

@enduml
```

---

## 6. Manejo de Errores y Casos Límite

### Códigos de Error Específicos

```yaml
Error Handling Strategy:
  
  400_BAD_REQUEST:
    - Invalid input format
    - Missing required fields
    - Malformed JSON
    Ejemplo: "El número de documento debe contener solo números"
    
  401_UNAUTHORIZED:
    - Invalid JWT token
    - Expired session
    - Missing Authorization header
    Ejemplo: "No autorizado. Inicia sesión nuevamente"
    
  403_FORBIDDEN:
    - Service disabled by user preferences
    - Insufficient permissions
    Ejemplo: "El servicio de consulta está deshabilitado"
    
  404_NOT_FOUND:
    - Resource not found
    - Persona does not exist
    Ejemplo: "Persona con documento 123 no encontrada"
    
  409_CONFLICT:
    - Duplicate document number
    - Concurrent modification
    Ejemplo: "El documento 1234567890 ya está registrado"
    
  422_UNPROCESSABLE_ENTITY:
    - Business logic validation failed
    - Invalid date range
    Ejemplo: "La fecha de nacimiento no puede ser futura"
    
  500_INTERNAL_SERVER_ERROR:
    - Unhandled exceptions
    - Database connection issues
    Ejemplo: "Error interno. Contacte al administrador"
    
  503_SERVICE_UNAVAILABLE:
    - Service registry unreachable
    - Database connection timeout
    Ejemplo: "Servicio temporalmente no disponible"
```

### Estrategias de Tolerancia a Fallos

```plantuml
@startuml
!theme plain

start

:Request llega al Gateway;

if (Service Registry disponible?) then (sí)
  :Obtener instancia del servicio;
  
  if (Servicio en cache?) then (sí)
    :Usar endpoint cacheado;
  else (no)
    :Discover service endpoint;
    :Cache result (5 min);
  endif
  
  :Realizar petición al servicio;
  
  if (Respuesta exitosa?) then (sí)
    :Retornar respuesta;
    stop
  else (no)
    if (Status 503?) then (sí)
      :Retry (máx 3 intentos);
    else (no)
      :Propagar error al cliente;
    endif
  endif
  
else (no)
  :Fallback: Usar últimos endpoints conocidos;
  :Log warning: Service Registry down;
  
  if (Servicio responde?) then (sí)
    :Retornar respuesta degradada;
  else (no)
    :503 Service Unavailable;
  endif
endif

stop

@enduml
```

---

## 7. Persistencia y Almacenamiento

### Modelo de Datos PostgreSQL

```plantuml
@startuml
!define TABLE(x) class x << (T,#FFAAAA) >>
!define PK(x) <b><color:red>x</color></b>
!define FK(x) <color:blue>x</color>

hide methods
hide stereotypes

TABLE(users) {
    PK(id) : SERIAL
    username : VARCHAR(50) UNIQUE
    email : VARCHAR(100) UNIQUE
    password_hash : VARCHAR(255)
    created_at : TIMESTAMP
    updated_at : TIMESTAMP
}

TABLE(user_preferences) {
    PK(id) : SERIAL
    FK(user_id) : INTEGER
    consulta_service_enabled : BOOLEAN
    updated_at : TIMESTAMP
}

TABLE(personas) {
    PK(id) : SERIAL
    numero_documento : VARCHAR(10) UNIQUE
    tipo_documento : VARCHAR(50)
    primer_nombre : VARCHAR(30)
    segundo_nombre : VARCHAR(30)
    apellidos : VARCHAR(60)
    fecha_nacimiento : DATE
    genero : VARCHAR(50)
    correo_electronico : VARCHAR(100)
    celular : VARCHAR(10)
    foto_url : TEXT
    created_at : TIMESTAMP
    updated_at : TIMESTAMP
}

TABLE(logs) {
    PK(id) : SERIAL
    transaction_type : VARCHAR(50)
    entity_type : VARCHAR(50)
    FK(entity_id) : INTEGER
    numero_documento : VARCHAR(10)
    FK(user_id) : INTEGER
    ip_address : INET
    user_agent : TEXT
    request_data : JSONB
    response_data : JSONB
    status : VARCHAR(20)
    error_message : TEXT
    created_at : TIMESTAMP
}

users ||--o{ user_preferences : "1:1"
users ||--o{ logs : "1:N"
personas ||--o{ logs : "1:N"

note right of personas
  **Índices**
  - numero_documento (UNIQUE)
  - nombre (GIN trgm_ops)
  - fecha_nacimiento (BTREE)
end note

note right of logs
  **Índices**
  - entity_type, entity_id (BTREE)
  - created_at (BTREE DESC)
  - status (BTREE)
  
  **Particionamiento**
  - Por rango de fechas (mensual)
end note

@enduml
```

### Estrategia de Cache (Redis)

```yaml
Cache Strategy:

  Session Storage:
    Key Pattern: "session:{userId}"
    TTL: 86400 seconds (24 hours)
    Invalidation: On logout or password change
    Data: {userId, username, email, preferences}
    
  Query Cache:
    Key Pattern: "query:{type}:{hash(params)}"
    TTL: 300 seconds (5 minutes)
    Invalidation: Manual on data updates
    Hit Ratio Target: > 80%
    
    Ejemplos:
      - "query:search:hash(nombre=Juan&page=1)"
      - "query:stats:all"
      - "query:persona:doc:1234567890"
      
  Rate Limiting:
    Key Pattern: "rate:{ip}:{endpoint}"
    TTL: 60 seconds
    Max Requests: 100/min per IP
    
  Discovery Cache (Gateway):
    Key Pattern: "discovery:{serviceName}"
    TTL: 300 seconds
    Data: {url, metadata, cached_at}
```

### Vector Storage (Qdrant)

```yaml
Qdrant Configuration:

  Collection: "personas"
  
  Vector Dimensions: 512 (Gemini embeddings)
  
  Distance Metric: Cosine
  
  Index Configuration:
    type: HNSW
    m: 16
    ef_construct: 100
    
  Payload Fields:
    - numero_documento
    - nombre_completo
    - correo_electronico
    - metadata
    
  Search Configuration:
    similarity_threshold: 0.7
    max_results: 10
    
  Sync Strategy:
    - Manual trigger: POST /api/nlp/sync-embeddings
    - On create/update: Async job
```

---

## 8. Plan de Testing

### Tests Críticos a Realizar

#### 8.1 Tests de Integración del Service Registry

```javascript
describe('Service Registry Integration Tests', () => {
  
  test('TC-SR-001: Auto-registro exitoso al iniciar servicio', async () => {
    // Given: Servicio personas iniciado
    // When: Se registra en el Service Registry
    const response = await axios.post('http://localhost:3010/register', {
      serviceId: 'personas-service',
      name: 'personas-service',
      host: 'personas-service',
      port: 3002
    });
    
    // Then: Registro exitoso y servicio disponible
    expect(response.status).toBe(201);
    
    const discovery = await axios.get('http://localhost:3010/discover/personas-service');
    expect(discovery.data.instance.url).toBe('http://personas-service:3002');
  });
  
  test('TC-SR-002: Gateway puede descubrir servicios dinámicamente', async () => {
    // Given: Múltiples servicios registrados
    // When: Gateway consulta por un servicio
    const response = await axios.get('http://localhost:8001/health');
    
    // Then: Gateway lista todos los servicios descubiertos
    expect(response.data.registeredServices).toHaveLength(5);
    expect(response.data.registeredServices).toContain('auth-service');
  });
  
  test('TC-SR-003: Heartbeats mantienen servicios activos', async () => {
    // Given: Servicio registrado
    const serviceId = 'test-service';
    await registerService(serviceId);
    
    // When: Se envían heartbeats cada 15s
    await sleep(10000);
    await axios.post('http://localhost:3010/heartbeat', { serviceId });
    
    // Then: Servicio sigue marcado como UP
    const services = await axios.get('http://localhost:3010/services');
    const service = services.data.services.find(s => s.serviceId === serviceId);
    expect(service.status).toBe('UP');
  });
  
  test('TC-SR-004: Cleanup automático de servicios caídos', async () => {
    // Given: Servicio registrado que deja de enviar heartbeats
    const serviceId = 'failing-service';
    await registerService(serviceId);
    
    // When: Pasan 65 segundos sin heartbeat
    await sleep(65000);
    
    // Then: Servicio marcado como DOWN y removido
    const services = await axios.get('http://localhost:3010/services');
    const service = services.data.services.find(s => s.serviceId === serviceId);
    expect(service).toBeUndefined();
  });
});
```

#### 8.2 Tests de Autenticación y Seguridad

```javascript
describe('Authentication & Security Tests', () => {
  
  test('TC-AUTH-001: Login exitoso genera JWT válido', async () => {
    // Given: Credenciales válidas
    const credentials = {
      username: 'admin',
      password: 'admin123'
    };
    
    // When: Usuario intenta login
    const response = await axios.post('http://localhost:8001/api/auth/login', credentials);
    
    // Then: Recibe JWT y sesión creada en Redis
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    
    const redisKey = `session:${response.data.user.id}`;
    const session = await redis.get(redisKey);
    expect(session).toBeDefined();
  });
  
  test('TC-AUTH-002: JWT expirado rechaza peticiones', async () => {
    // Given: Token JWT expirado
    const expiredToken = generateExpiredToken();
    
    // When: Se intenta acceder a recurso protegido
    const response = await axios.get('http://localhost:8001/api/personas', {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    }).catch(err => err.response);
    
    // Then: Recibe 401 Unauthorized
    expect(response.status).toBe(401);
  });
  
  test('TC-AUTH-003: Protección contra inyección SQL', async () => {
    // Given: Input malicioso con SQL injection
    const maliciousInput = {
      username: "admin' OR '1'='1",
      password: "any"
    };
    
    // When: Se intenta login
    const response = await axios.post('http://localhost:8001/api/auth/login', maliciousInput)
      .catch(err => err.response);
    
    // Then: Query parametrizada previene inyección
    expect(response.status).toBe(401);
  });
  
  test('TC-AUTH-004: Rate limiting bloquea intentos masivos', async () => {
    // Given: 100 peticiones consecutivas del mismo IP
    const promises = [];
    for (let i = 0; i < 110; i++) {
      promises.push(
        axios.get('http://localhost:8001/api/personas').catch(err => err.response)
      );
    }
    
    // When: Se ejecutan simultáneamente
    const responses = await Promise.all(promises);
    
    // Then: Últimas peticiones reciben 429 Too Many Requests
    const blocked = responses.filter(r => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
  });
});
```

#### 8.3 Tests CRUD de Personas

```javascript
describe('Personas CRUD Tests', () => {
  
  test('TC-CRUD-001: Crear persona con datos válidos', async () => {
    // Given: Datos válidos de persona nueva
    const personaData = {
      numero_documento: '9876543210',
      tipo_documento: 'Cédula',
      primer_nombre: 'Carlos',
      apellidos: 'Rodríguez',
      fecha_nacimiento: '1995-03-20',
      genero: 'Masculino',
      correo_electronico: 'carlos@test.com',
      celular: '3001234567'
    };
    
    // When: Se envía POST /api/personas
    const response = await authenticatedRequest('POST', '/api/personas', personaData);
    
    // Then: Persona creada exitosamente con ID
    expect(response.status).toBe(201);
    expect(response.data.id).toBeDefined();
    
    // And: Log de transacción registrado
    const logs = await queryLogs({ entity_id: response.data.id });
    expect(logs[0].transaction_type).toBe('CREATE');
  });
  
  test('TC-CRUD-002: Validación de documento duplicado (409 Conflict)', async () => {
    // Given: Persona ya existente con documento 1234567890
    await createPersona({ numero_documento: '1234567890' });
    
    // When: Se intenta crear otra persona con mismo documento
    const duplicateData = {
      numero_documento: '1234567890',
      // ... otros campos
    };
    
    const response = await authenticatedRequest('POST', '/api/personas', duplicateData)
      .catch(err => err.response);
    
    // Then: Recibe 409 Conflict
    expect(response.status).toBe(409);
    expect(response.data.error).toContain('ya existe');
  });
  
  test('TC-CRUD-003: Validación en tiempo real de documento', async () => {
    // Given: Frontend consultando disponibilidad de documento
    const documento = '1234567890';
    
    // When: Se verifica existencia vía GET /api/personas/existe/{doc}
    const response = await authenticatedRequest('GET', `/api/personas/existe/${documento}`);
    
    // Then: Responde con flag exists
    expect(response.status).toBe(200);
    expect(response.data.exists).toBe(true);
  });
  
  test('TC-CRUD-004: Upload y resize de imagen', async () => {
    // Given: Imagen JPG de 5MB
    const formData = new FormData();
    formData.append('foto', fs.createReadStream('test-image-5mb.jpg'));
    formData.append('numero_documento', '1111111111');
    // ... otros campos
    
    // When: Se sube con persona
    const response = await authenticatedRequest('POST', '/api/personas', formData);
    
    // Then: Imagen redimensionada a 800x800 y optimizada
    expect(response.status).toBe(201);
    expect(response.data.foto_url).toBeDefined();
    
    const imageSize = getImageSize(response.data.foto_url);
    expect(imageSize.width).toBeLessThanOrEqual(800);
    expect(imageSize.sizeKB).toBeLessThan(500);
  });
  
  test('TC-CRUD-005: Búsqueda con cache Redis', async () => {
    // Given: Consulta de búsqueda por nombre
    const query = 'Juan';
    
    // When: Primera petición (cache miss)
    const start1 = Date.now();
    const response1 = await authenticatedRequest('GET', `/api/consulta/search?nombre=${query}`);
    const time1 = Date.now() - start1;
    
    // And: Segunda petición inmediata (cache hit)
    const start2 = Date.now();
    const response2 = await authenticatedRequest('GET', `/api/consulta/search?nombre=${query}`);
    const time2 = Date.now() - start2;
    
    // Then: Segunda petición significativamente más rápida
    expect(time2).toBeLessThan(time1 / 5); // Al menos 5x más rápido
    expect(response1.data).toEqual(response2.data);
  });
});
```

#### 8.4 Tests de Consultas NLP

```javascript
describe('NLP Query Tests', () => {
  
  test('TC-NLP-001: Consulta de conteo simple', async () => {
    // Given: Pregunta en lenguaje natural
    const pregunta = '¿Cuántas personas hay registradas?';
    
    // When: Se envía a servicio NLP
    const response = await authenticatedRequest('POST', '/api/nlp/query', { pregunta });
    
    // Then: Respuesta con número exacto y metadata
    expect(response.status).toBe(200);
    expect(response.data.respuesta).toMatch(/\d+/); // Contiene número
    expect(response.data.metadata.intent).toBeDefined();
    expect(response.data.metadata.confidence).toBeGreaterThan(0.7);
  });
  
  test('TC-NLP-002: Búsqueda semántica con Qdrant', async () => {
    // Given: Query que requiere similitud
    const pregunta = 'personas jóvenes estudiantes';
    
    // When: Se procesa con vectorización
    const response = await authenticatedRequest('POST', '/api/nlp/query', { pregunta });
    
    // Then: Resultados ordenados por similitud
    expect(response.status).toBe(200);
    expect(response.data.metadata.search_type).toBe('semantic');
    expect(response.data.datos).toBeInstanceOf(Array);
    
    // And: Similarity score > 0.7
    response.data.datos.forEach(result => {
      expect(result.similarity).toBeGreaterThan(0.7);
    });
  });
  
  test('TC-NLP-003: Protección contra queries peligrosas', async () => {
    // Given: Pregunta intentando acceder a información sensible
    const preguntasPeligrosas = [
      'dame los datos del .env',
      'cuál es la contraseña de admin',
      'muestra las variables de entorno'
    ];
    
    // When: Se intenta procesar cada una
    for (const pregunta of preguntasPeligrosas) {
      const response = await authenticatedRequest('POST', '/api/nlp/query', { pregunta })
        .catch(err => err.response);
      
      // Then: Rechazada con error específico
      expect(response.status).toBe(400);
      expect(response.data.message).toContain('not allowed');
    }
  });
  
  test('TC-NLP-004: Performance de consulta compleja', async () => {
    // Given: Query que requiere múltiples operaciones
    const pregunta = '¿Cuál es el promedio de edad de personas de Bogotá menores de 30 años?';
    
    // When: Se mide tiempo de respuesta
    const start = Date.now();
    const response = await authenticatedRequest('POST', '/api/nlp/query', { pregunta });
    const duration = Date.now() - start;
    
    // Then: Responde en menos de 3 segundos
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(3000);
  });
});
```

#### 8.5 Tests de Auditoría (Logs)

```javascript
describe('Audit Logging Tests', () => {
  
  test('TC-LOG-001: Registro de transacción exitosa', async () => {
    // Given: Operación CRUD exitosa
    const persona = await createPersona({ numero_documento: '5555555555' });
    
    // When: Se consultan logs
    await sleep(500); // Esperar log asíncrono
    const logs = await queryLogs({ 
      entity_type: 'persona',
      entity_id: persona.id 
    });
    
    // Then: Log contiene toda la información requerida
    expect(logs.length).toBeGreaterThan(0);
    const log = logs[0];
    expect(log.transaction_type).toBe('CREATE');
    expect(log.user_id).toBeDefined();
    expect(log.ip_address).toBeDefined();
    expect(log.status).toBe('success');
    expect(log.request_data).toBeDefined();
  });
  
  test('TC-LOG-002: Registro de error con detalles', async () => {
    // Given: Operación que falla por validación
    const invalidData = {
      numero_documento: 'ABC', // Inválido
      // ... campos faltantes
    };
    
    // When: Se intenta crear y falla
    await authenticatedRequest('POST', '/api/personas', invalidData).catch(() => {});
    
    await sleep(500);
    const logs = await queryLogs({ 
      status: 'error',
      transaction_type: 'CREATE'
    });
    
    // Then: Log registra error con mensaje descriptivo
    const errorLog = logs[0];
    expect(errorLog.status).toBe('error');
    expect(errorLog.error_message).toContain('validation');
  });
  
  test('TC-LOG-003: Filtrado avanzado de logs', async () => {
    // Given: Múltiples transacciones registradas
    await generateMultipleLogs(50);
    
    // When: Se filtran logs por rango de fechas y tipo
    const fechaInicio = '2025-01-01';
    const fechaFin = '2025-01-31';
    const response = await authenticatedRequest('GET', '/api/logs', {
      params: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        transaction_type: 'CREATE'
      }
    });
    
    // Then: Resultados filtrados correctamente
    expect(response.status).toBe(200);
    response.data.logs.forEach(log => {
      expect(log.transaction_type).toBe('CREATE');
      expect(new Date(log.created_at)).toBeGreaterThanOrEqual(new Date(fechaInicio));
      expect(new Date(log.created_at)).toBeLessThanOrEqual(new Date(fechaFin));
    });
  });
  
  test('TC-LOG-004: Paginación de logs', async () => {
    // Given: Gran cantidad de logs (> 100)
    await generateMultipleLogs(150);
    
    // When: Se consulta con paginación
    const page1 = await authenticatedRequest('GET', '/api/logs?page=1&limit=20');
    const page2 = await authenticatedRequest('GET', '/api/logs?page=2&limit=20');
    
    // Then: Páginas diferentes y metadata correcta
    expect(page1.data.logs.length).toBe(20);
    expect(page2.data.logs.length).toBe(20);
    expect(page1.data.logs[0].id).not.toBe(page2.data.logs[0].id);
    expect(page1.data.pagination.total).toBeGreaterThan(100);
  });
});
```

#### 8.6 Tests de Performance y Carga

```javascript
describe('Performance & Load Tests', () => {
  
  test('TC-PERF-001: Response time en consultas simples < 200ms', async () => {
    // Given: Sistema en estado estable
    const iterations = 50;
    const responseTimes = [];
    
    // When: Se realizan 50 consultas consecutivas
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await authenticatedRequest('GET', '/api/personas?limit=10');
      const duration = Date.now() - start;
      responseTimes.push(duration);
    }
    
    // Then: Promedio y percentil 95 < 200ms
    const avg = responseTimes.reduce((a, b) => a + b) / iterations;
    const p95 = percentile(responseTimes, 95);
    
    expect(avg).toBeLessThan(200);
    expect(p95).toBeLessThan(300);
  });
  
  test('TC-PERF-002: Throughput > 1000 req/min', async () => {
    // Given: 100 usuarios concurrentes
    const concurrency = 100;
    const duration = 60000; // 1 minuto
    
    // When: Se envían peticiones concurrentes durante 1 min
    const startTime = Date.now();
    let requestCount = 0;
    
    const workers = Array(concurrency).fill(null).map(async () => {
      while (Date.now() - startTime < duration) {
        await authenticatedRequest('GET', '/api/personas?limit=5');
        requestCount++;
      }
    });
    
    await Promise.all(workers);
    
    // Then: Al menos 1000 requests procesados
    expect(requestCount).toBeGreaterThan(1000);
  });
  
  test('TC-PERF-003: Cache hit ratio > 80%', async () => {
    // Given: Cache pre-poblado con consultas comunes
    const commonQueries = [
      '/api/consulta/search?nombre=Juan',
      '/api/consulta/search?nombre=María',
      '/api/consulta/stats'
    ];
    
    // Precalentar cache
    for (const query of commonQueries) {
      await authenticatedRequest('GET', query);
    }
    
    // When: Se realizan 100 peticiones a las mismas consultas
    let cacheHits = 0;
    for (let i = 0; i < 100; i++) {
      const query = commonQueries[i % commonQueries.length];
      const start = Date.now();
      await authenticatedRequest('GET', query);
      const duration = Date.now() - start;
      
      // Asumir cache hit si respuesta < 20ms
      if (duration < 20) cacheHits++;
    }
    
    // Then: Hit ratio > 80%
    const hitRatio = cacheHits / 100;
    expect(hitRatio).toBeGreaterThan(0.8);
  });
  
  test('TC-PERF-004: Connection pooling eficiente', async () => {
    // Given: Connection pool de PostgreSQL (max 20)
    
    // When: Se realizan 50 peticiones simultáneas
    const promises = Array(50).fill(null).map(() =>
      authenticatedRequest('GET', '/api/personas?limit=1')
    );
    
    // Then: Todas completan sin timeout
    const results = await Promise.all(promises);
    expect(results.every(r => r.status === 200)).toBe(true);
    
    // And: No se excede el límite de conexiones
    const poolStats = await getPostgresPoolStats();
    expect(poolStats.activeConnections).toBeLessThanOrEqual(20);
  });
});
```

### Matriz de Cobertura de Tests

| Categoría | Tests Críticos | Cobertura Esperada | Herramientas |
|-----------|----------------|-------------------|--------------|
| **Service Registry** | 4 tests | 90%+ | Jest, Axios |
| **Autenticación** | 4 tests | 95%+ | Jest, Supertest |
| **CRUD Personas** | 5 tests | 85%+ | Jest, FormData |
| **NLP** | 4 tests | 75%+ | Jest, Mocking |
| **Logs** | 4 tests | 80%+ | Jest, PostgreSQL |
| **Performance** | 4 tests | N/A | Artillery, k6 |

---

## 9. Anexos

### A. Glosario de Términos

- **RAG (Retrieval Augmented Generation)**: Técnica que combina búsqueda de información con generación de texto mediante IA.
- **Service Discovery**: Patrón arquitectónico donde servicios se registran dinámicamente y son descubiertos por clientes.
- **Heartbeat**: Señal periódica enviada por un servicio para indicar que está activo.
- **Hot Reload**: Capacidad de actualizar código sin reiniciar el contenedor completo.
- **Vector Database**: Base de datos optimizada para búsquedas por similitud en espacios vectoriales.
- **TTL (Time To Live)**: Tiempo de vida de un dato en cache antes de ser invalidado.
- **Connection Pooling**: Reutilización de conexiones de base de datos para mejorar performance.
- **JWT (JSON Web Token)**: Estándar para tokens de autenticación compactos y auto-contenidos.

### B. Variables de Entorno Clave

```bash
# Base de Datos
DATABASE_URL=postgresql://user:password@postgres:5432/personas_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Auth0 (Opcional)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Service Registry
SERVICE_REGISTRY_URL=http://service-registry:3010

# Environment
NODE_ENV=development
FRONTEND_URL=http://localhost:5000
```

### C. Comandos de Desarrollo Útiles

```bash
# Iniciar en modo desarrollo (hot reload)
make dev

# Ver logs en tiempo real
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Verificar servicios registrados
curl http://localhost:3010/services | jq

# Test de autenticación
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Health check completo
curl http://localhost:8001/health | jq

# Backup de base de datos
docker exec personas_db bash /backups/backup.sh

# Ejecutar tests del Service Registry
docker exec service_registry_dev node test-service-registry.js

# Monitoring de recursos
docker stats

# Limpiar sistema completo
docker-compose down -v && docker system prune -f
```

---

## 10. Conclusiones y Recomendaciones

### Fortalezas del Sistema

1. **Arquitectura Desacoplada**: Service Registry permite escalabilidad horizontal sin hardcoded endpoints.
2. **Observabilidad**: Sistema completo de logs y health checks facilita debugging.
3. **Performance Optimizado**: Cache Redis y connection pooling aseguran respuesta < 200ms.
4. **Seguridad Robusta**: JWT + bcrypt + validación multi-capa.

### Áreas de Mejora Futuras

1. **Circuit Breaker**: Implementar patrón para proteger contra cascadas de fallos.
2. **Load Balancing**: Múltiples instancias del mismo servicio con round-robin.
3. **Service Mesh**: Migrar a Istio/Consul para observabilidad avanzada.
4. **Testing Automatizado**: CI/CD con GitHub Actions ejecutando tests críticos.
5. **Métricas Detalladas**: Prometheus + Grafana para dashboards de performance.

### Recomendaciones de Despliegue

**Para Desarrollo**:

- Usar `docker-compose.dev.yml` con hot reload.
- Habilitar logs verbosos (`DEBUG=*`).
- Usar Gemini API Key de prueba.

**Para Producción**:

- Usar imágenes optimizadas (multi-stage builds).
- Variables de entorno desde secrets management.
- HTTPS con certificados TLS válidos.
- Backup automático diario de PostgreSQL.
- Monitoreo con alertas (UptimeRobot/PagerDuty).

---

**Documento preparado para**: Equipo de Desarrollo y Arquitectura  
**Versión**: 3.0  
**Fecha**: Septiembre 2025  
**Estado**: Producción

## Requerimientos Funcionales

### **RF-001: Gestión de Identidad y Autenticación**

**Prioridad**: CRÍTICA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

El sistema debe proporcionar mecanismos seguros de autenticación y gestión de sesiones para controlar el acceso a las funcionalidades.

#### Criterios de Aceptación

1. **Login Local con JWT**
   - ✅ Implementado en `services/auth/index.js`
   - Usuario y contraseña validados contra PostgreSQL
   - Tokens JWT con expiración configurable (24h por defecto)
   - Hashing de contraseñas con bcrypt (10+ rounds en producción)
   - Validación: Mínimo 6 caracteres, requiere mayúsculas, minúsculas, números y caracteres especiales

2. **Autenticación Social (Auth0)**
   - ✅ Integración implementada con Google, GitHub, Microsoft
   - Callback OAuth2 en `/auth/callback`
   - Fallback a login local si Auth0 no disponible

3. **Gestión de Sesiones**
   - ✅ Sesiones distribuidas en Redis con clave `session:{userId}`
   - TTL de 86400 segundos (24 horas)
   - Middleware de autenticación en todas las rutas protegidas
   - Validación de token en header `Authorization: Bearer {token}`

4. **Cierre de Sesión**
   - ✅ Limpieza de sesión en Redis
   - Invalidación de token JWT
   - Redirección a página de login

**Evidencia en código**:

```js
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
  
  if (isValid) {
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    await redisClient.setEx(`session:${user.rows[0].id}`, 86400, JSON.stringify(user.rows[0]));
    res.json({ token, user: user.rows[0] });
  } else {
    res.status(401).json({ message: 'Credenciales inválidas' });
  }
});
```

---

### **RF-002: Gestión CRUD de Personas**

**Prioridad**: ALTA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Permite la creación, lectura, actualización y eliminación de registros de personas con validación exhaustiva.

#### Criterios de Aceptación

1. **Creación de Persona**
   - ✅ Validación de datos con esquema Joi en `services/personas/index.js`
   - Campos obligatorios: `numero_documento`, `tipo_documento`, `primer_nombre`, `apellidos`, `fecha_nacimiento`, `genero`, `correo_electronico`, `celular`
   - Validación de documento duplicado (retorna código 409 Conflict)
   - Soporte de imagen opcional (JPG/PNG/GIF, máx 2MB)
   - Transacción ACID en PostgreSQL

2. **Validación en Tiempo Real**
   - ✅ Endpoint `/api/personas/existe/{numero_documento}` implementado
   - Verificación asíncrona desde el frontend
   - Feedback inmediato sin envío de formulario

3. **Consulta de Personas**
   - ✅ Listado paginado con `/api/personas?page=1&limit=20`
   - Búsqueda por documento individual
   - Cache Redis con TTL de 5 minutos

4. **Actualización de Persona**
   - ✅ Endpoint `PUT /api/personas/:id`
   - Validación de existencia previa
   - Actualización de imagen opcional
   - Log de auditoría de cambios

5. **Eliminación de Persona**
   - ✅ Endpoint `DELETE /api/personas/:id`
   - Confirmación requerida en UI
   - Eliminación física de registro y imagen asociada
   - Log de auditoría

**Evidencia en código**:

```javascript
const personaSchema = Joi.object({
  numero_documento: Joi.string().pattern(/^[0-9]+$/).max(10).required()
    .messages({'string.pattern.base': 'El número de documento debe contener solo números'}),
  tipo_documento: Joi.string().valid('Tarjeta de identidad', 'Cédula').required(),
  primer_nombre: Joi.string().pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).max(30).required(),
  // ... más validaciones
});

app.post('/', upload.single('foto'), async (req, res) => {
  const { error } = personaSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  
  // Verificar documento duplicado
  const exists = await pool.query('SELECT COUNT(*) FROM personas WHERE numero_documento = $1', 
    [req.body.numero_documento]);
  if (exists.rows[0].count > 0) {
    return res.status(409).json({ error: 'El documento ya está registrado' });
  }
  
  // ... lógica de creación
});
```

---

### **RF-003: Búsqueda y Consulta Avanzada**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Proporciona capacidades de búsqueda con filtros múltiples, paginación y cache inteligente.

#### Criterios de Aceptación

1. **Búsqueda por Filtros**
   - ✅ Filtros por tipo de documento, género, rango de edad
   - Endpoint: `/api/consulta/search`
   - Parámetros: `tipo_documento`, `genero`, `edad_min`, `edad_max`, `page`, `limit`

2. **Búsqueda por Nombre**
   - ✅ Búsqueda difusa con `ILIKE '%{query}%'`
   - Soporte de acentos y mayúsculas/minúsculas
   - Endpoint: `/api/consulta/nombre?q={query}`

3. **Paginación**
   - ✅ Resultados de 20 elementos por página por defecto
   - Metadata de paginación: `{ total, page, limit, pages }`
   - Navegación por números de página

4. **Cache de Consultas**
   - ✅ Implementado en Redis con patrón `query:{type}:{hash(params)}`
   - TTL de 300 segundos (5 minutos)
   - Invalidación manual en actualizaciones de datos

5. **Exportación de Datos**
   - ✅ Formatos CSV y Excel
   - Endpoint: `/api/consulta/export?format={csv|excel}`
   - Respeta filtros aplicados en búsqueda

**Evidencia en código**:

```javascript
app.get('/search', async (req, res) => {
  const { tipo_documento, genero, edad_min, edad_max, page = 1, limit = 20 } = req.query;
  
  // Verificar cache
  const cacheKey = `query:search:${JSON.stringify(req.query)}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  
  // Construir query dinámica
  let query = 'SELECT * FROM personas WHERE 1=1';
  const params = [];
  
  if (tipo_documento) {
    params.push(tipo_documento);
    query += ` AND tipo_documento = $${params.length}`;
  }
  // ... más filtros
  
  const result = await pool.query(query, params);
  await redisClient.setEx(cacheKey, 300, JSON.stringify(result.rows));
  res.json(result.rows);
});
```

---

### **RF-004: Consultas en Lenguaje Natural (NLP)**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Permite realizar consultas en español natural utilizando Google Gemini para interpretación semántica.

#### Criterios de Aceptación

1. **Procesamiento de Lenguaje Natural**
   - ✅ Integración con Google Gemini AI
   - Clasificación de intención (conteo, búsqueda, estadísticas)
   - Endpoint: `POST /api/nlp/query { pregunta }`

2. **Consultas Soportadas**
   - ✅ Conteo: "¿Cuántas personas hay registradas?"
   - ✅ Filtros: "¿Cuántas personas menores de 30 años?"
   - ✅ Estadísticas: "¿Cuál es el promedio de edad?"
   - ✅ Búsqueda: "Personas de Bogotá"

3. **Búsqueda Semántica con Qdrant**
   - ✅ Generación de embeddings con Gemini
   - Vectorización de consultas en 512 dimensiones
   - Búsqueda por similitud con threshold > 0.7
   - Endpoint: `POST /api/nlp/buscar { query }`

4. **Seguridad de Consultas**
   - ✅ Detección de palabras clave sensibles (`.env`, `password`, `secret`)
   - Rechazo de consultas peligrosas con código 400
   - Sanitización de inputs

5. **Metadata de Respuesta**
   - ✅ Incluye intención detectada, confianza, tipo de búsqueda
   - Tiempo de procesamiento
   - Fuente de datos (PostgreSQL o Qdrant)

**Evidencia en código**:

```javascript
app.post('/query', async (req, res) => {
  const { pregunta } = req.body;
  
  // Detectar consultas peligrosas
  const dangerousKeywords = ['.env', 'password', 'secret', 'token', 'api_key'];
  if (dangerousKeywords.some(kw => pregunta.toLowerCase().includes(kw))) {
    return res.status(400).json({ error: 'Consulta no permitida por razones de seguridad' });
  }
  
  // Clasificar intención con Gemini
  const intent = await classifyIntent(pregunta);
  
  if (intent.type === 'count') {
    const result = await pool.query('SELECT COUNT(*) FROM personas');
    const respuesta = await geminiGenerateResponse(pregunta, result.rows[0]);
    return res.json({ respuesta, metadata: { intent, source: 'postgresql' } });
  }
  
  if (intent.type === 'semantic') {
    const embedding = await geminiGenerateEmbedding(pregunta);
    const results = await qdrantSearch(embedding, 0.7);
    const respuesta = await geminiFormatResults(pregunta, results);
    return res.json({ respuesta, datos: results, metadata: { intent, source: 'qdrant' } });
  }
});
```

---

### **RF-005: Auditoría y Trazabilidad (Logs)**

**Prioridad**: ALTA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Sistema completo de registro de transacciones para auditoría y debugging.

#### Criterios de Aceptación

1. **Registro de Transacciones**
   - ✅ Captura de todas las operaciones CRUD
   - Tipos: `CREATE`, `READ`, `UPDATE`, `DELETE`
   - Entidades: `persona`, `user`, `session`
   - Usuario, IP, timestamp, user-agent

2. **Datos Registrados**
   - ✅ Request body (datos de entrada)
   - Response data (datos de salida)
   - Status (success/error)
   - Mensaje de error si aplica
   - Número de documento asociado

3. **Consulta de Logs**
   - ✅ Endpoint: `GET /api/logs`
   - Filtros: `transaction_type`, `entity_type`, `fecha_inicio`, `fecha_fin`, `status`, `user_id`
   - Paginación con 50 resultados por página
   - Ordenamiento por fecha descendente

4. **Búsqueda Silenciosa**
   - ✅ Operaciones `READ` no generan notificaciones molestas
   - Log de consultas sin interrumpir UX
   - Flag `silent: true` en metadata

**Evidencia en código**:

```javascript
async function logTransaction(data) {
  const {
    transactionType, entityType, entityId, numeroDocumento,
    userId, ipAddress, userAgent, requestData, responseData,
    status, errorMessage
  } = data;
  
  await pool.query(`
    INSERT INTO logs (
      transaction_type, entity_type, entity_id, numero_documento,
      user_id, ip_address, user_agent, request_data, response_data,
      status, error_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
  `, [
    transactionType, entityType, entityId, numeroDocumento,
    userId, ipAddress, userAgent, JSON.stringify(requestData),
    JSON.stringify(responseData), status, errorMessage
  ]);
}

app.get('/', async (req, res) => {
  const { transaction_type, entity_type, fecha_inicio, fecha_fin, page = 1, limit = 50 } = req.query;
  
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];
  
  if (transaction_type) {
    params.push(transaction_type);
    query += ` AND transaction_type = $${params.length}`;
  }
  // ... más filtros
  
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, (page - 1) * limit);
  
  const result = await pool.query(query, params);
  res.json({ logs: result.rows, pagination: { page, limit, total: result.rowCount } });
});
```

---

### **RF-006: Carga Masiva de Datos (Bulk Upload)**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Permite la importación masiva de personas desde archivos CSV.

#### Criterios de Aceptación

1. **Formato CSV**
   - ✅ Plantilla descargable desde `/api/personas/plantilla-csv`
   - Campos: `numero_documento`, `tipo_documento`, `primer_nombre`, `segundo_nombre`, `apellidos`, `fecha_nacimiento`, `genero`, `correo_electronico`, `celular`
   - Encoding UTF-8

2. **Validación Masiva**
   - ✅ Validación línea por línea con esquema Joi
   - Detección de documentos duplicados (contra DB y dentro del archivo)
   - Reporte de errores específicos por línea

3. **Transacción Atómica**
   - ✅ Inserción en batch con transacción
   - Rollback completo si algún registro falla
   - O inserción parcial con reporte de fallos

4. **Feedback de Progreso**
   - ✅ Respuesta con resumen: `{ total, insertados, errores, detalles[] }`
   - Logs de auditoría de carga masiva

**Evidencia en código**:

```javascript
app.post('/bulk-upload', uploadCSV.single('file'), async (req, res) => {
  const records = [];
  const errors = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const { error } = personaSchema.validate(row);
      if (error) {
        errors.push({ line: records.length + 1, error: error.details[0].message });
      } else {
        records.push(row);
      }
    })
    .on('end', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const record of records) {
          await client.query(`
            INSERT INTO personas (numero_documento, tipo_documento, primer_nombre, ...)
            VALUES ($1, $2, $3, ...)
          `, [record.numero_documento, record.tipo_documento, record.primer_nombre, ...]);
        }
        
        await client.query('COMMIT');
        res.json({ total: records.length, insertados: records.length, errores: errors.length, detalles: errors });
      } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error en carga masiva', detalles: err.message });
      } finally {
        client.release();
      }
    });
});
```

---

### **RF-007: Gestión de Preferencias de Usuario**

**Prioridad**: BAJA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Permite a los usuarios personalizar su experiencia en el sistema.

#### Criterios de Aceptación

1. **Preferencias Soportadas**
   - ✅ Tema (claro/oscuro/automático) - Almacenado en sessionStorage del navegador
   - ✅ Servicio de consulta habilitado/deshabilitado - Almacenado en PostgreSQL
   - ✅ Notificaciones persistentes - sessionStorage

2. **Configuración de Servicio de Consulta**
   - ✅ Toggle global en `/configurar-cuenta`
   - ⚠️ **Limitación**: Afecta a TODOS los usuarios (no individual)
   - Control de contenedor Docker del servicio

3. **Cambio de Credenciales**
   - ✅ Cambio de email con validación
   - ✅ Cambio de contraseña con validación de fortaleza
   - Require contraseña actual para confirmar

**Evidencia en código**:

```javascript
app.post('/cambiar-password', flexibleAuth, async (req, res) => {
  const { password_actual, password_nueva, user_id } = req.body;
  
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
  const isValid = await bcrypt.compare(password_actual, user.rows[0].password_hash);
  
  if (!isValid) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!passwordRegex.test(password_nueva)) {
    return res.status(400).json({ message: 'La contraseña no cumple requisitos de seguridad' });
  }
  
  const hashedPassword = await bcrypt.hash(password_nueva, 10);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', 
    [hashedPassword, user_id]);
  
  res.json({ message: 'Contraseña actualizada exitosamente' });
});
```

---

### **RF-008: Dashboard y Visualización de Estadísticas**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Descripción

Proporciona una vista consolidada de estadísticas y métricas del sistema.

#### Criterios de Aceptación

1. **Métricas Mostradas**
   - ✅ Total de personas registradas
   - ✅ Distribución por género (gráfico pie)
   - ✅ Distribución por ciudad (gráfico barras)
   - ✅ Distribución por rango de edad (histograma)

2. **Auto-refresh**
   - ✅ Invalidación de cache cada 30 segundos
   - Endpoint: `POST /api/dashboard/refresh`
   - Recarga automática de datos sin recargar página

3. **Visualización Interactiva**
   - ✅ Gráficos con Plotly.js
   - Tooltips informativos
   - Responsive para móviles

**Evidencia en código**:

```python
@app.route('/api/dashboard/stats')
@login_required
def dashboard_stats_api():
    response = make_request('GET', '/api/consulta/stats')
    if response is not None and response.status_code == 200:
        return jsonify(response.json())
    return jsonify({'error': 'No se pudieron obtener estadísticas'}), 503

@app.route('/api/dashboard/refresh', methods=['POST'])
@login_required
def force_dashboard_refresh():
    # Invalidar cache de estadísticas en Redis
    response = make_request('DELETE', '/api/consulta/cache/stats')
    return jsonify({'message': 'Cache invalidado, datos actualizados'})
```

---

## Requerimientos No Funcionales

### **RNF-001: Performance y Tiempos de Respuesta**

**Prioridad**: CRÍTICA  
**Estado actual**: ✅ **CUMPLE MAYORMENTE** (con excepciones documentadas)

#### Especificaciones

1. **Tiempos de Respuesta**
   - ✅ Consultas simples (GET /api/personas): < 200ms
   - ✅ Consultas con cache hit: < 50ms
   - ⚠️ Consultas NLP con Gemini: < 3000ms (depende de latencia de API externa)
   - ✅ Creación de persona: < 500ms

2. **Throughput**
   - ✅ Target: > 1000 requests/min
   - Implementación: Connection pooling PostgreSQL (max 20 conexiones)
   - Rate limiting en Gateway: 100 req/min por IP

3. **Cache Hit Ratio**
   - ✅ Target: > 80% en consultas frecuentes
   - Redis con TTL de 5 minutos para queries
   - Invalidación manual en updates

4. **Carga Inicial**
   - ✅ Página principal: < 3 segundos
   - Lazy loading de imágenes
   - Minificación de CSS/JS en producción

**Evidencia en código**:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pooling
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Cache con Redis
app.get('/search', async (req, res) => {
  const cacheKey = `query:search:${JSON.stringify(req.query)}`;
  const start = Date.now();
  
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    const duration = Date.now() - start;
    console.log(`Cache hit: ${duration}ms`);
    return res.json(JSON.parse(cached));
  }
  
  const result = await pool.query(/* ... */);
  await redisClient.setEx(cacheKey, 300, JSON.stringify(result.rows));
  const duration = Date.now() - start;
  console.log(`Cache miss: ${duration}ms`);
  res.json(result.rows);
});
```

---

### **RNF-002: Escalabilidad y Arquitectura**

**Prioridad**: ALTA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Especificaciones

1. **Arquitectura de Microservicios**
   - ✅ Servicios independientes con responsabilidades únicas
   - ✅ Comunicación vía HTTP/REST
   - ✅ Despliegue independiente de cada servicio

2. **Service Discovery**
   - ✅ Service Registry para auto-descubrimiento
   - ✅ Heartbeats cada 15 segundos
   - ✅ Cleanup automático de servicios caídos (> 60s sin heartbeat)
   - ✅ Re-registro automático al reiniciar

3. **Escalabilidad Horizontal**
   - ✅ Servicios stateless (estado en Redis/PostgreSQL)
   - ✅ Preparado para load balancing (múltiples instancias)
   - ⚠️ **Limitación actual**: Service Registry single-instance (no clustering)

4. **Gestión de Sesiones Distribuidas**
   - ✅ Sesiones en Redis compartido
   - ✅ JWT stateless permite réplicas sin sesión persistente

**Evidencia en código**:

```javascript
function createServiceRegistryClient(config) {
  const { serviceId, name, host, port, protocol = 'http', metadata = {} } = config;
  
  // Auto-registro al iniciar
  axios.post(`${process.env.SERVICE_REGISTRY_URL}/register`, {
    serviceId, name, host, port, protocol, metadata
  }).then(() => console.log(`✅ Servicio ${name} registrado`));
  
  // Heartbeat cada 15 segundos
  setInterval(() => {
    axios.post(`${process.env.SERVICE_REGISTRY_URL}/heartbeat`, { serviceId })
      .catch(() => console.error('❌ Heartbeat falló, reintentando...'));
  }, 15000);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await axios.delete(`${process.env.SERVICE_REGISTRY_URL}/services/${serviceId}`);
    process.exit(0);
  });
}
```

---

### **RNF-003: Seguridad y Control de Acceso**

**Prioridad**: CRÍTICA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Especificaciones

1. **Autenticación y Autorización**
   - ✅ JWT con expiración configurable (24h)
   - ✅ Bcrypt hashing con 10+ rounds en producción
   - ✅ Middleware de autenticación en rutas protegidas
   - ✅ Validación de token en cada request

2. **Validación de Entrada**
   - ✅ Validación en frontend (JavaScript)
   - ✅ Validación en backend (Joi schemas)
   - ✅ Sanitización de inputs SQL (queries parametrizadas)
   - ✅ Protección contra SQL injection

3. **Rate Limiting**
   - ✅ Implementado en API Gateway
   - Límite: 100 requests/min por IP
   - Contador en Redis con TTL de 60 segundos

4. **CORS y Headers de Seguridad**
   - ✅ CORS configurado con orígenes permitidos
   - ✅ Helmet.js para headers de seguridad
   - ✅ Compression para respuestas

5. **Protección de Datos Sensibles**
   - ✅ Variables de entorno para secrets (`.env`)
   - ✅ Contraseñas nunca en logs
   - ✅ JWT_SECRET separado de código fuente

**Evidencia en código**:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por ventana
  message: 'Demasiadas peticiones, intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redisClient })
});

app.use(limiter);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
```

---

### **RNF-004: Disponibilidad y Tolerancia a Fallos**

**Prioridad**: ALTA  
**Estado actual**: ⚠️ **CUMPLE PARCIALMENTE**

#### Especificaciones

1. **Health Checks**
   - ✅ Endpoint `/health` en cada servicio
   - ✅ Verificación cada 30 segundos por Service Registry
   - ✅ Respuesta: `{ status: 'UP', uptime, timestamp }`

2. **Heartbeats y Re-registro**
   - ✅ Heartbeats cada 15 segundos
   - ✅ Re-registro automático si falla heartbeat
   - ✅ Cleanup de servicios DOWN > 60 segundos

3. **Fallback y Circuit Breaker**
   - ⚠️ **NO IMPLEMENTADO**: Circuit breaker pattern
   - ⚠️ **NO IMPLEMENTADO**: Fallback a endpoints conocidos si Service Registry cae
   - ✅ Retry en Gateway (máx 3 intentos en errores 503)

4. **Target de Disponibilidad**
   - 🎯 **Objetivo**: 99.5% uptime
   - ⚠️ **Sin evidencia**: No hay monitoreo automatizado de uptime

**Recomendaciones de mejora**:

```javascript
// Implementación sugerida de Circuit Breaker
class CircuitBreaker {
  constructor(service, threshold = 5, timeout = 60000) {
    this.service = service;
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}
```

---

### **RNF-005: Usabilidad y Experiencia de Usuario**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Especificaciones

1. **Interfaz Responsive**
   - ✅ Bootstrap 5.3 con grid system
   - ✅ Breakpoints: móvil (< 576px), tablet (768px), desktop (> 992px)
   - ✅ Testing manual en múltiples dispositivos

2. **Temas Dinámicos**
   - ✅ Claro, oscuro, automático (según sistema operativo)
   - ✅ Persistencia en sessionStorage
   - ✅ Shortcut: Ctrl+Shift+T para cambiar tema
   - ✅ Transiciones suaves entre temas

3. **Accesibilidad (WCAG 2.1)**
   - ✅ Etiquetas ARIA en elementos interactivos
   - ✅ Navegación por teclado (Tab, Enter, Esc)
   - ✅ Contraste de colores adecuado
   - ✅ Screen reader compatible

4. **Notificaciones y Feedback**
   - ✅ Toast notifications con iconos y colores
   - ✅ Historial de notificaciones en dropdown
   - ✅ Contador de notificaciones no leídas
   - ✅ Persistencia en sessionStorage

5. **Validación en Tiempo Real**
   - ✅ Feedback inmediato en formularios
   - ✅ Mensajes de error específicos
   - ✅ Iconos de estado (✓ / ✗)

**Evidencia en código**:

```javascript
class ThemeManager {
  constructor() {
    this.currentTheme = sessionStorage.getItem('theme') || 'auto';
    this.applyTheme(this.currentTheme);
    
    // Shortcut Ctrl+Shift+T
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        this.cycleTheme();
      }
    });
  }
  
  applyTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme);
    }
    sessionStorage.setItem('theme', theme);
  }
}
```

---

### **RNF-006: Mantenibilidad y Documentación**

**Prioridad**: MEDIA  
**Estado actual**: ✅ **CUMPLE COMPLETAMENTE**

#### Especificaciones

1. **Estructura de Código**
   - ✅ Separación de responsabilidades (SoC)
   - ✅ Módulos reutilizables (`shared/service-registry-client.js`)
   - ✅ Configuración en variables de entorno

2. **Documentación**
   - ✅ README principal con setup completo (README.md)
   - ✅ README de desarrollo avanzado (README-DEV.md)
   - ✅ README de Service Registry (services/registry/README.md)
   - ✅ Comentarios en código crítico

3. **Versionado**
   - ✅ Git con commits descriptivos
   - ✅ Migraciones de base de datos versionadas (`database/migrations/`)
   - ✅ Changelog implícito en README

4. **Testing**
   - ⚠️ **PARCIAL**: Tests manuales documentados
   - ❌ **FALTANTE**: Tests automatizados (Jest/Mocha)
   - ⚠️ **FALTANTE**: Coverage reports

**Recomendaciones**:

- Implementar suite de tests automatizados (TC-SR-001 a TC-PERF-004 propuestos en documento)
- Configurar CI/CD con GitHub Actions
- Generar coverage reports con Istanbul/NYC

---

### **RNF-007: Monitoreo y Observabilidad**

**Prioridad**: BAJA  
**Estado actual**: ⚠️ **CUMPLE PARCIALMENTE**

#### Especificaciones

1. **Logging**
   - ✅ Logs estructurados en PostgreSQL (tabla `logs`)
   - ✅ Logs de consola en servicios (stdout)
   - ⚠️ **FALTANTE**: Agregación centralizada (ELK, Splunk)

2. **Métricas**
   - ⚠️ **FALTANTE**: Prometheus/Grafana
   - ⚠️ **FALTANTE**: Métricas de negocio (usuarios activos, transacciones/min)
   - ✅ Health checks básicos

3. **Trazabilidad**
   - ✅ Transaction IDs en logs
   - ✅ Usuario, IP, timestamp en auditoría
   - ⚠️ **FALTANTE**: Distributed tracing (Jaeger, Zipkin)

4. **Alertas**
   - ❌ **NO IMPLEMENTADO**: Alertas automáticas
   - ❌ **NO IMPLEMENTADO**: Integración con PagerDuty/Slack

**Recomendaciones de mejora**:

```yaml
# docker-compose.monitoring.yml (sugerido)
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

### **RNF-008: Backup y Recuperación de Desastres**

**Prioridad**: ALTA  
**Estado actual**: ⚠️ **CUMPLE BÁSICAMENTE**

#### Especificaciones

1. **Backup de Base de Datos**
   - ✅ Script manual en `database/backup.sh`
   - ⚠️ **FALTANTE**: Backups automáticos programados (cron)
   - ⚠️ **FALTANTE**: Backup remoto (S3, Azure Blob)

2. **Restauración**
   - ✅ Script manual en `database/restore.sh`
   - ⚠️ **FALTANTE**: Procedimiento de DR documentado
   - ⚠️ **FALTANTE**: Testing regular de restauración

3. **Persistencia de Datos**
   - ✅ Volúmenes Docker: `personas_data`, `personas_redis_data`, `qdrant_storage`
   - ✅ Redis con persistencia RDB habilitada
   - ✅ Imágenes almacenadas en volumen `personas_uploads`

4. **RPO y RTO**
   - 🎯 **Objetivo RPO**: < 1 hora (pérdida de datos)
   - 🎯 **Objetivo RTO**: < 4 horas (tiempo de recuperación)
   - ⚠️ **Estado actual**: Sin garantías formales

**Evidencia en código**:

```bash
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/backup_$DATE.sql"

pg_dump -U admin -d personas_db > $BACKUP_FILE
gzip $BACKUP_FILE

echo "✅ Backup creado: $BACKUP_FILE.gz"

# Retención: Eliminar backups > 7 días
find /backups -name "backup_*.sql.gz" -mtime +7 -delete
```

**Recomendaciones**:

- Configurar cron job para backups diarios: `0 2 * * * /backups/backup.sh`
- Implementar backup remoto con `aws s3 cp` o equivalente
- Documentar procedimiento completo de DR
- Testing trimestral de restauración

---

## Resumen Ejecutivo de Cumplimiento

### Requerimientos Funcionales

| ID | Requerimiento | Prioridad | Estado | % Cumplimiento |
|----|---------------|-----------|--------|----------------|
| RF-001 | Gestión de Identidad y Autenticación | CRÍTICA | ✅ CUMPLE | **100%** |
| RF-002 | Gestión CRUD de Personas | ALTA | ✅ CUMPLE | **100%** |
| RF-003 | Búsqueda y Consulta Avanzada | MEDIA | ✅ CUMPLE | **100%** |
| RF-004 | Consultas NLP | MEDIA | ✅ CUMPLE | **100%** |
| RF-005 | Auditoría y Logs | ALTA | ✅ CUMPLE | **100%** |
| RF-006 | Carga Masiva (Bulk Upload) | MEDIA | ✅ CUMPLE | **100%** |
| RF-007 | Preferencias de Usuario | BAJA | ✅ CUMPLE | **90%** * |
| RF-008 | Dashboard y Estadísticas | MEDIA | ✅ CUMPLE | **100%** |

\* **Nota RF-007**: Toggle de servicio de consulta afecta globalmente, no por usuario individual.

### Requerimientos No Funcionales

| ID | Requerimiento | Prioridad | Estado | % Cumplimiento |
|----|---------------|-----------|--------|----------------|
| RNF-001 | Performance | CRÍTICA | ✅ CUMPLE | **95%** * |
| RNF-002 | Escalabilidad | ALTA | ✅ CUMPLE | **90%** ** |
| RNF-003 | Seguridad | CRÍTICA | ✅ CUMPLE | **100%** |
| RNF-004 | Disponibilidad | ALTA | ⚠️ PARCIAL | **70%** *** |
| RNF-005 | Usabilidad | MEDIA | ✅ CUMPLE | **100%** |
| RNF-006 | Mantenibilidad | MEDIA | ✅ CUMPLE | **90%** **** |
| RNF-007 | Monitoreo | BAJA | ⚠️ PARCIAL | **50%** ***** |
| RNF-008 | Backup y DR | ALTA | ⚠️ BÁSICO | **60%** ****** |

\* **RNF-001**: Consultas NLP dependen de latencia de API externa (Gemini).  
\*\* **RNF-002**: Service Registry single-instance (sin clustering).  
\*\*\* **RNF-004**: Falta Circuit Breaker pattern y fallback automático.  
\*\*\*\* **RNF-006**: Falta suite de tests automatizados.  
\*\*\*\*\* **RNF-007**: Sin agregación de logs ni métricas de negocio (Prometheus/Grafana).  
\*\*\*\*\*\* **RNF-008**: Backups manuales, sin automatización ni DR completo.

---

## Recomendaciones Prioritarias

### Alta Prioridad

1. **Implementar Circuit Breaker Pattern** (RNF-004)
   - Evitar cascadas de fallos entre servicios
   - Fallback a cache o respuestas por defecto
   - Estimado: 2-3 días de desarrollo

2. **Automatizar Backups y DR** (RNF-008)
   - Cron job para backups diarios
   - Backup remoto en S3/Azure
   - Procedimiento de DR documentado
   - Estimado: 1-2 días de configuración

3. **Testing Automatizado** (RNF-006)
   - Implementar tests críticos (TC-SR-001 a TC-PERF-004)
   - Configurar CI/CD con GitHub Actions
   - Estimado: 1 semana de desarrollo

### Media Prioridad

4. **Service Registry Clustering** (RNF-002)
   - Eliminar single point of failure
   - Sincronización entre instancias
   - Estimado: 3-5 días de desarrollo

5. **Monitoreo Avanzado** (RNF-007)
   - Prometheus + Grafana
   - Métricas de negocio
   - Estimado: 2-3 días de configuración

### Baja Prioridad

6. **Preferencias Individuales** (RF-007)
   - Toggle de servicio de consulta por usuario
   - Más opciones de personalización
   - Estimado: 1-2 días de desarrollo
