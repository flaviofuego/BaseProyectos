Actúa como arquitecto de software senior especializado en documentación técnica.

CONTEXTO:
Necesito generar un documento de diseño de software completo basado en el código fuente de esta aplicación. El documento debe seguir estándares IEEE 1016-2009 y estar orientado a un proyecto universitario de nivel profesional.

OBJETIVO:
Analiza exhaustivamente el código de esta aplicación (Sistema de Gestión de Personas) y proporciona información estructurada para cada sección del documento de diseño.

APLICACIÓN:
- Arquitectura: Microservicios con Service Registry y API Gateway
- Backend: Node.js (Express)
- Frontend: Flask (Python)
- Bases de datos: PostgreSQL, Redis, Qdrant
- Autenticación: JWT, OAuth2, Auth0
- Servicios: Auth, Personas, Consulta, NLP (Google Gemini), Logs
- Containerización: Docker, Docker Compose

ALCANCE DEL ANÁLISIS:
Examina todos los archivos del repositorio incluyendo:
- Código fuente (JavaScript, Python)
- Configuraciones (package.json, docker-compose.yml, .env.example)
- Esquemas de base de datos (migrations, models)
- APIs y endpoints
- Middlewares y utilidades
- Documentación existente

ESTRUCTURA REQUERIDA:
Organiza tu análisis en las siguientes secciones numeradas:

---

## 1. ARQUITECTURA GENERAL

### 1.1 Identificar Componentes Principales
Lista TODOS los componentes/servicios encontrados con:
- Nombre del servicio
- Ubicación en el código (ruta del archivo/directorio)
- Propósito/responsabilidad
- Puerto/configuración de red
- Dependencias con otros servicios

### 1.2 Patrones Arquitectónicos
Identifica y documenta:
- Patrones de diseño aplicados (Registry, Gateway, Repository, etc.)
- Principios SOLID observados
- Arquitectura de capas/niveles
- Separación de responsabilidades

### 1.3 Tecnologías por Capa
Mapea qué tecnologías se usan en:
- Presentación
- Lógica de negocio
- Acceso a datos
- Infraestructura

---

## 2. MICROSERVICIOS DETALLADOS

Para CADA microservicio encontrado, documenta:

### Service: [NOMBRE]
**Ubicación:** [ruta del directorio]
**Puerto:** [puerto configurado]
**Propósito:** [descripción breve]

**Endpoints/APIs:**
- [Método HTTP] [Ruta] - [Descripción] - [Autenticación requerida: Sí/No]

**Dependencias:**
- Servicios internos: [lista]
- Servicios externos: [lista]
- Bases de datos: [lista]

**Modelos de Datos:**
- [Nombre del modelo] - [campos principales]

**Middleware Utilizado:**
- [Lista de middlewares con propósito]

**Configuración Específica:**
- Variables de entorno necesarias
- Configuraciones especiales

---

## 3. FLUJOS DE DATOS

### 3.1 Flujo de Autenticación
Describe paso a paso:
1. Usuario ingresa credenciales
2. [Continúa con cada paso identificado en el código]

### 3.2 Flujo de Creación de Persona
[Secuencia completa desde request hasta response]

### 3.3 Flujo de Consulta con NLP
[Describe cómo se procesa una consulta en lenguaje natural]

### 3.4 Flujo de Registro en Service Registry
[Cómo se registran y descubren los servicios]

### 3.5 Otros Flujos Críticos
[Identifica y documenta]

---

## 4. MODELO DE DATOS

### 4.1 Esquema de Base de Datos
Para cada tabla/colección:

**Tabla: [nombre]**
| Campo | Tipo | Restricciones | Descripción | Índices |
|-------|------|---------------|-------------|---------|
| [campo] | [tipo] | [PK/FK/NOT NULL/UNIQUE] | [descripción] | [índice si aplica] |

### 4.2 Relaciones
- [Tabla A] → [Tabla B]: [Tipo de relación] [Cardinalidad]

### 4.3 Migraciones y Versionamiento
Lista las migraciones encontradas con su propósito

---

## 5. APIS Y CONTRATOS

### 5.1 Especificación por Endpoint

Para CADA endpoint de CADA servicio:

**[MÉTODO] /ruta/del/endpoint**
- **Servicio:** [nombre del servicio]
- **Descripción:** [qué hace]
- **Autenticación:** [Requerida/Opcional/No]
- **Parámetros de Ruta:** [lista]
- **Query Parameters:** [lista]
- **Body (Request):**
json
{
  "campo": "tipo - descripción"
}

- **Response (Success):**
json
{
  "campo": "tipo - descripción"
}

- **Códigos de Estado:**
  - 200: [significado]
  - 400: [significado]
  - 401: [significado]
  - etc.
- **Validaciones:** [lista de validaciones implementadas]

---

## 6. SEGURIDAD

### 6.1 Mecanismos de Autenticación
- Estrategia implementada (JWT, OAuth2, etc.)
- Ubicación del código de autenticación
- Flujo de generación de tokens
- Tiempo de expiración

### 6.2 Autorización
- ¿Hay roles o permisos?
- ¿Cómo se verifican los permisos?
- Middleware de autorización

### 6.3 Protección de Datos
- Cifrado de contraseñas (algoritmo usado)
- Sanitización de inputs
- Prevención de inyecciones SQL
- CORS configurado
- Rate limiting implementado

### 6.4 Gestión de Secretos
- Variables de entorno sensibles identificadas
- ¿Hay secrets en el código? (mala práctica)

---

## 7. MANEJO DE ERRORES

### 7.1 Estrategia Global
- ¿Hay middleware de manejo de errores?
- Ubicación del código

### 7.2 Tipos de Errores Definidos
Lista clases/tipos de errores custom:
- [Nombre]: [Código HTTP] - [Descripción]

### 7.3 Logging de Errores
- Sistema de logging implementado
- Niveles de log (info, warn, error, debug)
- ¿Dónde se almacenan los logs?

---

## 8. INFRAESTRUCTURA Y DESPLIEGUE

### 8.1 Docker Compose
Analiza docker-compose.yml y documenta:
- Servicios definidos
- Redes configuradas
- Volúmenes persistentes
- Variables de entorno por servicio
- Dependencias entre contenedores
- Health checks configurados

### 8.2 Dockerfile
Para cada Dockerfile encontrado:
- Imagen base
- Comandos de instalación
- Puertos expuestos
- Volúmenes
- Comando de inicio

### 8.3 Configuraciones por Entorno
- ¿Hay archivos .env.example, .env.development, etc.?
- Diferencias entre entornos

---

## 9. INTEGRACIONES EXTERNAS

Identifica TODAS las integraciones con servicios externos:

### 9.1 [Nombre del Servicio] (ej: Google Gemini)
- **Propósito:** [para qué se usa]
- **Ubicación en código:** [archivos que lo usan]
- **Configuración:** [API keys, endpoints]
- **Flujo de integración:** [cómo se comunica]

### 9.2 [Otras integraciones: Auth0, etc.]

---

## 10. FRONTEND

### 10.1 Estructura de Archivos
Árbol de directorios del frontend con descripción

### 10.2 Rutas/Páginas
Lista todas las rutas encontradas:
- /ruta → archivo.py/html → Descripción → Requiere Auth

### 10.3 Formularios
Para cada formulario:
- Campos
- Validaciones cliente
- Endpoint de destino

### 10.4 Componentes Reutilizables
Identifica templates, componentes, layouts

---

## 11. CALIDAD Y PRUEBAS

### 11.1 Tests Encontrados
- Tests unitarios (ubicación, framework)
- Tests de integración
- Coverage actual si está documentado

### 11.2 Linting y Formateo
- Herramientas configuradas (ESLint, Prettier, etc.)
- Archivos de configuración

---

## 12. DEPENDENCIAS

### 12.1 Backend (Node.js)
Analiza package.json y lista:
| Dependencia | Versión | Propósito | Categoría |
|-------------|---------|-----------|-----------|
| express | x.x.x | Framework web | Core |

### 12.2 Frontend (Python)
Analiza requirements.txt:
| Dependencia | Versión | Propósito |

### 12.3 Análisis de Vulnerabilidades
¿Hay dependencias desactualizadas o con vulnerabilidades conocidas?

---

## 13. RENDIMIENTO Y OPTIMIZACIÓN

### 13.1 Caching
- ¿Se usa Redis? ¿Para qué?
- Estrategia de cache (TTL, invalidación)
- Ubicación del código de caching

### 13.2 Optimizaciones de Base de Datos
- Índices definidos
- Consultas optimizadas vs N+1 problems
- Connection pooling

### 13.3 Manejo de Archivos
- ¿Se suben archivos? ¿Cómo se manejan?
- Límites de tamaño
- Validaciones

---

## 14. OBSERVABILIDAD

### 14.1 Logging
- Sistema de logs implementado
- Formato de logs (JSON, texto plano)
- Centralización de logs

### 14.2 Métricas
- ¿Hay endpoints de health check?
- ¿Se recopilan métricas de rendimiento?

### 14.3 Monitoreo
- Herramientas integradas

---

## 15. CONFIGURACIÓN Y VARIABLES

Lista TODAS las variables de entorno:

| Variable | Servicio | Propósito | Valor Default | Obligatoria |
|----------|----------|-----------|---------------|-------------|
| DATABASE_URL | Personas | Conexión DB | postgres://... | Sí |

---

## 16. ANÁLISIS DE CÓDIGO

### 16.1 Métricas de Calidad
- Complejidad ciclomática estimada
- Código duplicado
- Funciones/archivos muy largos

### 16.2 Deuda Técnica
- TODOs encontrados en el código
- FIXMEs
- Comentarios que indican mejoras pendientes

### 16.3 Buenas Prácticas Observadas
- Separación de responsabilidades
- Uso de constantes vs hard-coded values
- Validaciones implementadas

### 16.4 Áreas de Mejora
Sugiere mejoras encontradas en el código

---

## 17. CASOS DE USO INFERIDOS

Basándote en los endpoints y funcionalidades, describe:

### CU-001: [Nombre del Caso de Uso]
- **Actor:** [Usuario/Admin/Sistema]
- **Precondiciones:** [lista]
- **Flujo Principal:**
  1. [paso]
  2. [paso]
- **Postcondiciones:** [lista]
- **Flujos Alternativos:** [si aplica]

---

## 18. DIAGRAMA DE INFORMACIÓN

Proporciona la información necesaria para crear:

### 18.1 Diagrama de Contexto (C4-L1)
- Sistema: [nombre]
- Actores externos: [usuarios, sistemas externos]
- Relaciones: [quién interactúa con quién]

### 18.2 Diagrama de Contenedores (C4-L2)
- Contenedores identificados con sus tecnologías
- Comunicación entre contenedores

### 18.3 Diagrama de Componentes (C4-L3)
Por cada microservicio, sus componentes internos

### 18.4 Diagrama de Secuencia
Información para los flujos críticos identificados en sección 3

### 18.5 Diagrama de Despliegue
Basado en docker-compose y configuraciones

---

## FORMATO DE SALIDA

- Usa Markdown con tablas bien formateadas
- Incluye bloques de código con sintaxis highlighting cuando sea necesario
- Sé específico: incluye nombres de archivos, números de línea si es relevante
- Si encuentras código incompleto o ambiguo, indícalo
- Prioriza precisión sobre brevedad

## IMPORTANTE
- NO inventes información que no esté en el código
- Si algo no está implementado, indícalo claramente
- Identifica discrepancias entre documentación existente y código real
- Marca con ⚠️ cualquier mala práctica de seguridad o código problemático


---
