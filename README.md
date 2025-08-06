# Plan de Ruta - Proyecto Gestión de Datos Personales

## Análisis del Proyecto

### Objetivos Principales
- Crear una aplicación CRUD para gestión de datos personales
- Implementar consultas en lenguaje natural con RAG y LLM
- Desplegar en arquitectura de microservicios con contenedores
- Integrar sistema de autenticación SSO
- Registrar todas las transacciones en logs

### Puntuación Total: 50 puntos

---

## Fase 1: Planificación y Diseño (Duración: 1 semana)

### 1.1 Diseño de Arquitectura
- **Microservicios identificados:**
  - `auth-service`: Autenticación (Microsoft Entra/SSO)
  - `person-crud-service`: Crear, modificar, borrar personas
  - `query-service`: Consultar datos personales (independiente)
  - `nlp-rag-service`: Consultas en lenguaje natural
  - `log-service`: Gestión de logs
  - `api-gateway`: Gateway principal

### 1.2 Diseño de Base de Datos
```sql
-- Tabla Personas
CREATE TABLE personas (
    documento VARCHAR(10) PRIMARY KEY,
    tipo_documento ENUM('Tarjeta de identidad', 'Cédula'),
    primer_nombre VARCHAR(30),
    segundo_nombre VARCHAR(30),
    apellidos VARCHAR(60),
    fecha_nacimiento DATE,
    genero ENUM('Masculino', 'Femenino', 'No binario', 'Prefiero no reportar'),
    correo_electronico VARCHAR(255),
    celular VARCHAR(10),
    foto LONGBLOB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Tabla Logs
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(10),
    tipo_operacion ENUM('CREATE', 'UPDATE', 'DELETE', 'QUERY'),
    fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detalles TEXT,
    usuario VARCHAR(255)
);
```

### 1.3 Stack Tecnológico Recomendado
- **Backend**: Node.js/Express o Python/FastAPI
- **Base de datos**: MySQL/PostgreSQL
- **Autenticación**: Microsoft Entra ID o Auth0
- **LLM/RAG**: OpenAI API + Vector Database (Pinecone/Chroma)
- **Contenedores**: Docker + Docker Compose
- **Frontend**: React.js o Vue.js

---

## Fase 2: Configuración del Entorno (Duración: 3-4 días)

### 2.1 Configuración de Contenedores
- Crear `docker-compose.yml` con todos los servicios
- Configurar redes entre contenedores
- Configurar volúmenes para persistencia

### 2.2 Base de Datos
- ✅ **Puntos: 2** - Contenedor independiente para BD
- Configurar MySQL/PostgreSQL en contenedor
- Crear scripts de inicialización
- Configurar backup y restore

### 2.3 Configuración SSO
- ✅ **Puntos: 4** - Sistema de autenticación SSO
- Registrar aplicación en Microsoft Entra
- Configurar OAuth 2.0/OIDC
- Implementar middleware de autenticación

---

## Fase 3: Desarrollo Core CRUD (Duración: 1 semana)

### 3.1 Microservicio Person-CRUD
- ✅ **Puntos: 15** - Funcionalidad CRUD completa
- Endpoints para crear, leer, actualizar, eliminar
- Búsqueda por documento como clave primaria
- Manejo de archivos para fotos

### 3.2 Validaciones
- ✅ **Puntos: 4** - Validaciones requeridas
```javascript
// Validaciones requeridas:
- Primer/Segundo Nombre: No números, máx 30 caracteres
- Apellidos: No números, máx 60 caracteres
- Fecha: Formato dd-mm-yyyy o selector calendario
- Género: Lista cerrada (4 opciones)
- Email: Formato válido
- Celular: Solo números, 10 caracteres
- Documento: Solo números, máx 10 caracteres
- Foto: Máximo 2MB
```

### 3.3 Campos de Captura
- ✅ **Puntos: 2** - Implementar todos los campos mostrados
- Formularios con validación frontend y backend
- Manejo de archivos para fotos

---

## Fase 4: Microservicios Especializados (Duración: 1 semana)

### 4.1 Query Service Independiente
- ✅ **Puntos: 3** - Contenedor independiente para consultas
- Servicio separado para consultar datos
- Funcionalidad de habilitar/deshabilitar según demanda
- Load balancer opcional

### 4.2 Arquitectura de Microservicios
- ✅ **Puntos: 5** - Cada opción del menú en microservicio
- API Gateway para ruteo
- Comunicación entre servicios (REST/gRPC)
- Manejo de fallos y resilencia

### 4.3 Log Service
- ✅ **Puntos: 3** - Consulta de logs avanzada
- Búsqueda por tipo de operación y documento
- Filtros por fecha de transacción
- Paginación y exportación

---

## Fase 5: Implementación RAG y LLM (Duración: 1 semana)

### 5.1 Sistema RAG
- ✅ **Puntos: 12** - Consulta en lenguaje natural con RAG
```python
# Componentes RAG:
1. Vector Database (embeddings de datos)
2. Retrieval (búsqueda semántica)
3. LLM Integration (OpenAI/local)
4. Response Generation
```

### 5.2 Casos de Uso
- "¿Cuál es el empleado más joven registrado?"
- "Muéstrame todos los usuarios de género masculino"
- "¿Cuántas personas nacieron en 1990?"
- "Busca personas con correo de Gmail"

---

## Fase 6: Integración y Testing (Duración: 3-4 días)

### 6.1 Testing
- Unit tests para cada microservicio
- Integration tests
- E2E tests con Selenium/Cypress
- Load testing para query service

### 6.2 Documentación
- API Documentation (Swagger/OpenAPI)
- README con instrucciones de despliegue
- Documentación de arquitectura

---

## Fase 7: Despliegue y Optimización (Duración: 2-3 días)

### 7.1 Containerización Final
- Optimización de imágenes Docker
- Multi-stage builds
- Health checks para todos los servicios

### 7.2 Orquestación
- Docker Compose para desarrollo
- Kubernetes manifests (opcional)
- Scripts de deployment

---

## Cronograma Sugerido (3-4 semanas)

| Semana | Fases | Entregables |
|--------|--------|-------------|
| 1 | Planificación + Entorno | Arquitectura, Docker setup, BD |
| 2 | CRUD + Validaciones | Microservicios core funcionando |
| 3 | RAG/LLM + Logs | Sistema de consulta natural |
| 4 | Testing + Despliegue | Aplicación completa |

---

## Checklist de Requerimientos

- [ ] **Autenticación SSO (4 pts)**: Microsoft Entra configurado
- [ ] **Contenedores (implícito)**: Docker para toda la app
- [ ] **CRUD + Log (15 pts)**: Funcionalidad completa con logging
- [ ] **RAG + LLM (12 pts)**: Consultas en lenguaje natural
- [ ] **Campos de captura (2 pts)**: Todos los campos implementados
- [ ] **Validaciones (4 pts)**: Todas las validaciones requeridas
- [ ] **Microservicios (5 pts)**: Cada menú en servicio separado
- [ ] **Query independiente (3 pts)**: Servicio consulta separado
- [ ] **BD independiente (2 pts)**: Base de datos en contenedor
- [ ] **Consulta logs (3 pts)**: Búsqueda por tipo, documento y fecha

**Total: 50 puntos**

---

## Recomendaciones Adicionales

1. **Comenzar con un MVP**: Implementar CRUD básico primero
2. **Usar herramientas conocidas**: No experimentar con tecnologías nuevas
3. **Documentar desde el inicio**: Mantener documentación actualizada
4. **Backup frecuente**: Version control y respaldos regulares
5. **Testing continuo**: No dejar testing para el final

---

## Recursos y Enlaces Útiles

- **Docker**: Documentación oficial y Docker Compose
- **Microsoft Entra**: Guías de integración OAuth
- **OpenAI API**: Documentación para RAG implementation
- **Vector Databases**: Chroma, Pinecone, o FAISS
- **Validation Libraries**: Joi (Node.js), Pydantic (Python)
