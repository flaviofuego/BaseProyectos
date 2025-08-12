# 🚀 Sistema de Gestión de Personas

Sistema completo de gestión de datos personales con arquitectura de microservicios, autenticación, consultas avanzadas en tiempo real y logging completo de transacciones.

## ✨ Características Principales

- 🏗️ **Arquitectura de Microservicios** escalable y modular
- 🔐 **Autenticación completa** con sesiones seguras
- 🔍 **Búsqueda avanzada** con filtros dinámicos y resultados en tiempo real
- 🤖 **Consultas en lenguaje natural** usando IA (Google Gemini + RAG)
- 📊 **Dashboard interactivo** con estadísticas en tiempo real
- 📝 **Logging completo** de todas las transacciones
- 🚀 **Cache inteligente** para optimización de consultas
- 📱 **Interfaz responsive** con Bootstrap

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Flask)                        │
│                    Puerto: 5000                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  API GATEWAY                                │
│                    Puerto: 8000                            │
└─┬─────────┬─────────┬─────────────┬────────────┬────────────┘
  │         │         │             │            │
  ▼         ▼         ▼             ▼            ▼
┌─────┐  ┌─────┐  ┌──────────┐  ┌────────┐  ┌────────┐
│AUTH │  │PERS │  │ CONSULTA │  │  NLP   │  │  LOG   │
│3001 │  │3002 │  │   3003   │  │  3004  │  │  3005  │
└─────┘  └─────┘  └──────────┘  └────────┘  └────────┘
```

### Servicios:
- **API Gateway** (Puerto 8000): Punto de entrada único, rate limiting
- **Auth Service** (Puerto 3001): Autenticación JWT y gestión de sesiones
- **Personas Service** (Puerto 3002): CRUD completo con validaciones
- **Consulta Service** (Puerto 3003): Búsquedas escalables con cache Redis
- **NLP Service** (Puerto 3004): Consultas en lenguaje natural con IA
- **Log Service** (Puerto 3005): Registro y auditoría de transacciones
- **Frontend Flask** (Puerto 5000): Interfaz web responsive

### Bases de Datos:
- **PostgreSQL**: Datos principales y logs
- **Redis**: Cache de sesiones y consultas
- **Qdrant**: Vector database para búsquedas semánticas

## 📋 Requisitos Previos

- **Docker** y **Docker Compose** (recomendado)
- **Google Gemini API Key** (para consultas NLP)
- **8GB RAM** mínimo (recomendado 16GB)
- **Puertos disponibles**: 5000, 8000, 5432, 6379, 6333

## 🚀 Quick Start (Setup en 3 pasos)

### 1. 📥 Clonar e inicializar

```bash
git clone https://github.com/tu-usuario/gestion-personas-app.git
cd gestion-personas-app
cp env.example .env
```

### 2. ⚙️ Configurar API Key (Opcional)

Edita `.env` y agrega tu Gemini API Key:
```bash
GEMINI_API_KEY=tu_api_key_aqui
```
*Nota: Sin esto, las consultas NLP no funcionarán, pero el resto del sistema sí.*

### 3. 🐳 Levantar el sistema

```bash
# Construir y ejecutar todos los servicios
docker-compose up -d

# Ver logs en tiempo real (opcional)
docker-compose logs -f
```

### 4. 🌐 Acceder a la aplicación

**URL Principal:** http://localhost:5000

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

## 🔧 Desarrollo y Mantenimiento

### Comandos útiles

```bash
# Parar todos los servicios
docker-compose down

# Rebuild completo (después de cambios de código)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Ver logs de un servicio específico
docker-compose logs -f frontend
docker-compose logs -f consulta-service

# Restart de un servicio
docker-compose restart frontend

# Ver estado de servicios
docker-compose ps

# Acceso directo a la base de datos
docker exec -it personas_db psql -U admin -d personas_db
```

### Verificar instalación

```bash
# Health check de todos los servicios
curl http://localhost:8000/health

# Test de autenticación
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📱 Funcionalidades Completas

### 🏠 Dashboard Principal
- **Estadísticas en tiempo real**: Total de personas, registros por género
- **Búsqueda rápida**: Acceso directo a funciones principales
- **Navegación intuitiva**: Menú Bootstrap responsive

### 👥 Gestión de Personas
1. **Crear Personas**: Formulario completo con validaciones en tiempo real
2. **Modificar Datos**: Actualización con búsqueda previa y navegación mejorada
3. **Consultar Datos**: 
   - 🔍 **Búsqueda individual** por documento
   - 🎯 **Búsqueda avanzada** con filtros múltiples
   - ⚡ **Resultados en tiempo real** (sin cache)
4. **Eliminar Personas**: Proceso seguro con confirmación

### 🤖 Consultas Inteligentes
- **Lenguaje Natural**: "¿Cuántas personas hay de Bogotá?"
- **IA con RAG**: Análisis semántico de los datos
- **Respuestas contextuales**: Usando Google Gemini

### 📊 Auditoría y Logs
- **Registro completo** de todas las operaciones
- **Filtros avanzados** por fecha, usuario, acción
- **Trazabilidad total** del sistema

### ✅ Validaciones Implementadas

| Campo | Validación | Ejemplo |
|-------|------------|---------|
| Primer/Segundo Nombre | Solo letras, máx 30 chars | "Juan Carlos" |
| Apellidos | Solo letras, máx 60 chars | "García López" |
| Documento | Solo números, máx 10 chars | "1234567890" |
| Fecha Nacimiento | No futura, calendario | "1990-05-15" |
| Género | Lista: M/F/Otro/Prefiero no decir | "Masculino" |
| Email | Formato válido | "user@domain.com" |
| Celular | Exactamente 10 dígitos | "3001234567" |
| Foto | Máx 2MB, jpg/png/gif | upload.jpg |

## 🔧 Configuración Avanzada

### Variables de Entorno (.env)

```bash
# Base de datos
DB_HOST=personas_db
DB_PORT=5432
DB_NAME=personas_db
DB_USER=admin
DB_PASSWORD=admin123

# Redis Cache
REDIS_HOST=personas_redis
REDIS_PORT=6379

# JWT y Seguridad
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
SESSION_SECRET=tu_session_secret_muy_seguro_aqui

# Google Gemini (Opcional)
GEMINI_API_KEY=tu_gemini_api_key_aqui

# Qdrant Vector DB
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# Puertos de servicios
GATEWAY_PORT=8000
FRONTEND_PORT=5000
AUTH_SERVICE_PORT=3001
PERSONAS_SERVICE_PORT=3002
CONSULTA_SERVICE_PORT=3003
NLP_SERVICE_PORT=3004
LOG_SERVICE_PORT=3005
```

### Optimizaciones Implementadas

#### 🚀 Cache Strategy
- **Redis TTL**: 5 minutos para consultas frecuentes
- **Anti-cache headers**: Búsquedas avanzadas sin cache
- **Session management**: Limpieza automática de estado

#### ⚡ Performance
- **Conexiones pooling**: PostgreSQL optimizado
- **Índices database**: Consultas rápidas
- **Rate limiting**: API Gateway protegido
- **Escalabilidad**: Consulta service con réplicas

#### 🔧 Correcciones Recientes (Enero 2025)
1. ✅ **Fixed**: Navegación "Buscar Otra Persona" ahora limpia el estado
2. ✅ **Fixed**: Búsqueda avanzada muestra resultados actualizados en tiempo real
3. ✅ **Fixed**: Anti-cache headers en servicio de consultas
4. ✅ **Improved**: Session management y limpieza de estado

## � Desarrollo Local (Sin Docker)

Para desarrolladores que prefieren ambiente local:

### Prerrequisitos
```bash
# Instalar dependencias del sistema
- Node.js 18+
- Python 3.10+
- PostgreSQL 13+
- Redis 6+
- Qdrant (opcional)
```

### Backend Services

```bash
# 1. Instalar dependencias de cada servicio
cd services/auth && npm install
cd ../personas && npm install
cd ../consulta && npm install
cd ../nlp && npm install
cd ../log && npm install
cd ../../gateway && npm install

# 2. Configurar base de datos local
createdb personas_db
psql personas_db < database/init.sql

# 3. Ejecutar servicios (en terminales separadas)
cd services/auth && npm run dev      # Puerto 3001
cd services/personas && npm run dev  # Puerto 3002
cd services/consulta && npm run dev  # Puerto 3003
cd services/nlp && npm run dev       # Puerto 3004
cd services/log && npm run dev       # Puerto 3005
cd gateway && npm run dev            # Puerto 8000
```

### Frontend Flask

```bash
cd frontend
pip install -r requirements.txt
python app.py  # Puerto 5000
```

## � Troubleshooting

### Problemas Comunes

#### 🐳 Docker Issues
```bash
# Error: Port already in use
docker-compose down
sudo lsof -i :5000  # Verificar procesos
kill -9 <PID>

# Error: Build failed
docker-compose down
docker system prune -a
docker-compose build --no-cache

# Error: Database connection
docker-compose logs personas_db
docker exec -it personas_db psql -U admin -d personas_db
```

#### 🔄 Cache Issues
```bash
# Limpiar cache Redis
docker exec -it personas_redis redis-cli
> FLUSHALL

# Verificar estado de servicios
curl http://localhost:8000/health
curl http://localhost:5000/health
```

#### � Search Issues
```bash
# Verificar consulta service
docker-compose logs consulta-service

# Test directo
curl "http://localhost:8000/api/consulta/avanzada?nombre=test"
```

### Logs y Debugging

```bash
# Ver logs en tiempo real
docker-compose logs -f --tail=100

# Logs específicos por servicio
docker-compose logs -f frontend
docker-compose logs -f consulta-service
docker-compose logs -f personas-service

# Acceso a containers
docker exec -it flask_app bash
docker exec -it personas_db psql -U admin -d personas_db
docker exec -it personas_redis redis-cli
```

## � Monitoreo y Performance

### Health Checks
- **Frontend**: http://localhost:5000/health
- **API Gateway**: http://localhost:8000/health
- **Database**: Conexión automática verificada

### Métricas de Performance
- **Response time**: < 200ms para consultas simples
- **Throughput**: 1000+ requests/min
- **Cache hit ratio**: > 80% en consultas frecuentes
- **Memory usage**: < 2GB total system

### Estadísticas del Sistema
- **Total requests**: Tracking en logs
- **Active users**: Session management
- **Database size**: Monitoring automático
- **Error rates**: < 1% target

## 🔒 Seguridad y Mejores Prácticas

### Seguridad Implementada
- 🔐 **JWT Authentication** con expiración
- 🛡️ **Rate limiting** en API Gateway
- 🔍 **Input validation** exhaustiva
- 📝 **Audit trail** completo
- 🚫 **SQL injection** prevention
- 🔒 **Session security** con secrets

### Producción Checklist
- [ ] Cambiar credenciales por defecto
- [ ] Configurar HTTPS/SSL
- [ ] Backup automático de database
- [ ] Monitoring y alertas
- [ ] Log rotation
- [ ] Security updates
- [ ] Load balancer setup
- [ ] CDN para assets estáticos

## 🤝 Contribuir

### Development Workflow
```bash
# 1. Fork y clone
git clone https://github.com/tu-usuario/gestion-personas-app.git
cd gestion-personas-app

# 2. Crear feature branch
git checkout -b feature/nueva-funcionalidad

# 3. Desarrollar y test
docker-compose up -d
# ... hacer cambios ...
docker-compose restart <service>

# 4. Commit y push
git add .
git commit -m "feat: agregar nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# 5. Crear Pull Request
```

### Estructura de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Documentación
- `style:` Formatting
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Maintenance

## 📄 Licencia y Contacto

**Licencia**: MIT License

**Contacto**: 
- GitHub: [@flaviofuego](https://github.com/flaviofuego)
- Proyecto: [BaseProyectos](https://github.com/flaviofuego/BaseProyectos)

**Version**: 2.0.0 (Enero 2025)
- ✅ Microservices architecture
- ✅ Real-time search fixes
- ✅ Navigation improvements
- ✅ Cache optimization
- ✅ Performance enhancements

---

> 💡 **Tip**: Para un setup súper rápido, solo ejecuta `docker-compose up -d` y ve a http://localhost:5000

> 🔧 **Support**: Si encuentras algún problema, revisa la sección Troubleshooting o crea un issue en GitHub.
