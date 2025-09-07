# 🚀 Sistema de Gestión de Personas - Versión 2.5

Sistema completo de gestión de datos personales con arquitectura de microservicios, interfaz moderna, autenticación avanzada, notificaciones inteligentes y sistema de consultas mejorado con IA.

## ✨ Características Principales

- 🏗️ **Arquitectura de Microservicios** escalable y modular
- 🔐 **Autenticación JWT completa** con sesiones seguras
- 🔍 **Búsqueda avanzada** con filtros dinámicos y resultados en tiempo real
- 🤖 **Consultas en lenguaje natural** usando IA (Google Gemini + RAG)
- 📊 **Dashboard interactivo** con estadísticas y refrescos automáticos
- 📝 **Sistema de auditoría** completo con logs detallados
- 🚀 **Cache inteligente** optimizado para performance
- 📱 **Interfaz moderna** responsive con Bootstrap 5.3
- 🔔 **Sistema de notificaciones** avanzado con historial
- 🎨 **Temas dinámicos** (claro/oscuro/automático)
- ⚡ **Validación en tiempo real** y manejo de errores mejorado
- � **Búsqueda silenciosa** sin notificaciones innecesarias

## 🆕 Últimas Mejoras (Septiembre 2025)

### 🎨 **Interfaz y UX**
- ✅ **Tema oscuro completo** - Soporte mejorado para modo oscuro
- ✅ **Sistema de notificaciones dropdown** - Historial de sesión con contador
- ✅ **Validación en tiempo real** - Verificación de documentos existentes
- ✅ **Navegación mejorada** - Flujo usuario → notificaciones optimizado
- ✅ **Dashboard con auto-refresh** - Datos actualizados automáticamente

### 🔧 **Funcionalidad y Performance**
- ✅ **Manejo de errores avanzado** - Códigos HTTP específicos (409, 422, etc.)
- ✅ **Búsqueda silenciosa en logs** - Sin notificaciones molestas
- ✅ **Cache invalidation** inteligente en dashboard
- ✅ **Contenedores renombrados** - Consistencia en nomenclatura
- ✅ **Debugging mejorado** - Logs detallados para troubleshooting

### 🚀 **Backend y API**
- ✅ **Error 409 handling** - Documentos duplicados correctamente manejados
- ✅ **Gateway error forwarding** - Códigos de estado preservados
- ✅ **Session storage** - Persistencia de notificaciones por sesión
- ✅ **API response optimization** - Mejores tiempos de respuesta

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Flask)                        │
│                    Puerto: 5000                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  API GATEWAY                                │
│                    Puerto: 8001                             │
└─┬─────────┬─────────┬─────────────┬────────────┬────────────┘
  │         │         │             │            │
  ▼         ▼         ▼             ▼            ▼
┌─────┐  ┌─────┐  ┌──────────┐  ┌────────┐  ┌────────┐
│AUTH │  │PERS │  │ CONSULTA │  │  NLP   │  │  LOG   │
│3001 │  │3002 │  │   3003   │  │  3004  │  │  3005  │
└─────┘  └─────┘  └──────────┘  └────────┘  └────────┘
```

### Servicios:
- **API Gateway** (Puerto 8001): Punto de entrada único, rate limiting
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
- **Puertos disponibles**: 5000, 8001, 5432, 6379, 6333

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
curl http://localhost:8001/health

# Test de autenticación
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📱 Funcionalidades Completas

### 🏠 Dashboard Principal
- **Estadísticas en tiempo real**: Total de personas, registros por género, distribución por ciudad
- **Auto-refresh inteligente**: Datos actualizados cada 30 segundos con cache invalidation
- **Búsqueda rápida**: Acceso directo a funciones principales
- **Navegación intuitiva**: Menú Bootstrap responsive con tema dinámico
- **Notificaciones centralizadas**: Dropdown con historial de sesión y contador

### 👥 Gestión de Personas
1. **Crear Personas**: 
   - Formulario completo con validaciones en tiempo real
   - Verificación de documentos duplicados (Error 409)
   - Mensajes de error específicos y descriptivos
   - Upload de fotos con preview

2. **Modificar Datos**: 
   - Actualización con búsqueda previa y navegación mejorada
   - Validación de campos en tiempo real
   - Preservación de datos originales durante edición

3. **Consultar Datos**: 
   - 🔍 **Búsqueda individual** por documento con validación
   - 🎯 **Búsqueda avanzada** con filtros múltiples y paginación
   - ⚡ **Resultados en tiempo real** optimizados
   - 📊 **Cache inteligente** para consultas frecuentes

4. **Eliminar Personas**: 
   - Proceso seguro con confirmación doble
   - Verificación de existencia antes de eliminar
   - Logging completo de eliminaciones

### 🤖 Consultas Inteligentes
- **Lenguaje Natural**: "¿Cuántas personas hay de Bogotá menores de 30 años?"
- **IA con RAG**: Análisis semántico usando Google Gemini
- **Respuestas contextuales**: Interpretación inteligente de consultas
- **Vector database**: Búsquedas semánticas con Qdrant

### 📊 Auditoría y Logs
- **Registro completo** de todas las operaciones (CREATE, READ, UPDATE, DELETE)
- **Búsqueda silenciosa** - Sin notificaciones molestas al consultar
- **Filtros avanzados** por fecha, usuario, acción, tipo de entidad
- **Trazabilidad total** con timestamps y detalles de solicitudes
- **Exportación de datos** para análisis

### 🔔 Sistema de Notificaciones Avanzado
- **Toast notifications** modernas con iconos y colores
- **Dropdown de historial** con persistencia de sesión
- **Contador dinámico** con animaciones
- **Estados de leído/no leído** para seguimiento
- **Limpieza automática** y manual de notificaciones
- **Integración completa** con todos los módulos del sistema

### 🎨 Temas y Accesibilidad
- **Tema claro/oscuro/automático** con transiciones suaves
- **Modo oscuro completo** - Todos los componentes optimizados
- **Accesibilidad WCAG** - Screen readers y navegación por teclado
- **Responsive design** - Móvil, tablet y desktop
- **Shortcuts de teclado** - Ctrl+Shift+T para cambiar tema

### ✅ Validaciones y Manejo de Errores

| Campo | Validación | Ejemplo | Error Handling |
|-------|------------|---------|----------------|
| Primer/Segundo Nombre | Solo letras, máx 30 chars | "Juan Carlos" | Validación en tiempo real |
| Apellidos | Solo letras, máx 60 chars | "García López" | Formato automático |
| Documento | Solo números, máx 10 chars | "1234567890" | **Verificación de duplicados** |
| Fecha Nacimiento | No futura, calendario | "1990-05-15" | Validación de edad |
| Género | Lista: M/F/Otro/Prefiero no decir | "Masculino" | Selección obligatoria |
| Email | Formato válido | "user@domain.com" | Verificación sintáctica |
| Celular | Exactamente 10 dígitos | "3001234567" | Formato colombiano |
| Foto | Máx 2MB, jpg/png/gif | upload.jpg | Preview y validación |

#### 🛡️ **Códigos de Error Específicos**
- **400 Bad Request**: Datos inválidos con detalles específicos
- **409 Conflict**: "❌ Ya existe una persona con este documento"
- **422 Unprocessable Entity**: Errores de validación con campo específico
- **500 Server Error**: Errores internos con logging automático
- **404 Not Found**: Persona no encontrada en consultas

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
GATEWAY_PORT=8001
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

#### 🔧 Correcciones y Mejoras Recientes (Septiembre 2025)

##### 🎨 **Interfaz y UX**
1. ✅ **Tema oscuro mejorado**: Textos legibles en todos los componentes
2. ✅ **Sistema de notificaciones dropdown**: Historial con contador y persistencia
3. ✅ **Navegación optimizada**: Usuario → Notificaciones (lado derecho)
4. ✅ **Dashboard auto-refresh**: Invalidación de cache cada 30 segundos
5. ✅ **Validación en tiempo real**: Documentos duplicados detectados al escribir

##### 🔧 **Backend y Performance**
1. ✅ **Error 409 handling**: Documentos duplicados manejados correctamente
2. ✅ **Gateway error forwarding**: Códigos HTTP preservados en respuestas
3. ✅ **Búsqueda silenciosa**: Logs sin notificaciones molestas al usuario
4. ✅ **Container renaming**: consulta_service_dev para consistencia
5. ✅ **Session storage**: Notificaciones persistentes durante la sesión

##### 🚀 **Nuevas Características**
- **NotificationHistory**: Clase JavaScript para gestión de historial
- **AJAX form validation**: Verificación en tiempo real sin recargas
- **Theme manager mejorado**: Transiciones suaves entre temas
- **Error display específico**: Mensajes detallados para cada tipo de error
- **Cache invalidation**: Sistema inteligente para datos actualizados

#### 🔧 Correcciones Anteriores (Enero 2025)
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
cd gateway && npm run dev            # Puerto 8001
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
curl http://localhost:8001/health
curl http://localhost:5000/health
```

### Troubleshooting Avanzado

#### 🐳 Docker Issues
```bash
# Error: Port already in use
docker-compose down
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/Mac
taskkill /F /PID <PID>        # Windows

# Error: Build failed
docker-compose down
docker system prune -a
docker-compose build --no-cache

# Error: Database connection
docker-compose logs personas_db
docker exec -it personas_db psql -U admin -d personas_db

# Error: Container name conflicts
docker-compose down
docker container prune
```

#### 🔔 Notification Issues
```bash
# Verificar NotificationManager
# En Developer Tools Console:
window.notificationManager.show("Test", "success")
window.notificationHistory.getNotifications()

# Limpiar sessionStorage
sessionStorage.clear()

# Verificar eventos
# En Console: Ver eventos 'notificationShown'
```

#### 🎨 Theme Issues
```bash
# Resetear tema
localStorage.removeItem('preferred-theme')
location.reload()

# Verificar CSS loading
# En Network tab: Verificar style.css carga correctamente

# Debug tema oscuro
# En Console: document.documentElement.dataset.bsTheme
```

#### 🔍 Search and Error Issues
```bash
# Verificar consulta service
docker-compose logs consulta_service_dev

# Test error handling
curl -X POST http://localhost:8001/api/personas \
  -H "Content-Type: application/json" \
  -d '{"numero_documento":"1234567890"}' # Documento existente

# Debug frontend errors
# En Developer Tools: Ver Network responses y Console errors
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
- **API Gateway**: http://localhost:8001/health
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

**Version**: 2.5.0 (Septiembre 2025)
- ✅ Sistema de notificaciones avanzado con dropdown e historial
- ✅ Tema oscuro completo y optimizado
- ✅ Validación en tiempo real y manejo de errores específicos
- ✅ Dashboard con auto-refresh y cache invalidation
- ✅ Navegación UX mejorada y búsqueda silenciosa
- ✅ Performance optimization y error handling avanzado

### 🎯 **Roadmap Futuro**
- 🔄 **PWA Support**: Aplicación web progresiva
- 📊 **Analytics Dashboard**: Métricas de uso avanzadas
- 🔍 **Elasticsearch Integration**: Búsqueda full-text mejorada
- 👥 **Multi-tenant Support**: Múltiples organizaciones
- 📱 **Mobile App**: React Native companion
- 🔐 **OAuth Integration**: Login con Google/Microsoft
- 🌍 **Internacionalización**: Múltiples idiomas
- 📈 **Machine Learning**: Insights predictivos

---

> 💡 **Tip**: Para un setup súper rápido, solo ejecuta `docker-compose up -d` y ve a http://localhost:5000

> 🔧 **Support**: Si encuentras algún problema, revisa la sección Troubleshooting Avanzado o crea un issue en GitHub.

> 🎨 **UI/UX**: El sistema incluye tema oscuro completo, notificaciones inteligentes y validación en tiempo real para la mejor experiencia de usuario.
