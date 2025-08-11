# Sistema de Gestión de Personas

Sistema completo de gestión de datos personales con arquitectura de microservicios, autenticación SSO, consultas en lenguaje natural con RAG y logging completo de transacciones.

## 🏗️ Arquitectura

El sistema está construido con una arquitectura de microservicios:

- **API Gateway**: Punto de entrada único para todos los servicios
- **Auth Service**: Autenticación local y SSO con Microsoft Entra ID
- **Personas Service**: CRUD completo de personas con validaciones
- **Consulta Service**: Servicio escalable de consultas con cache Redis
- **NLP Service**: Consultas en lenguaje natural usando Google Gemini y RAG con Qdrant
- **Log Service**: Registro y consulta de todas las transacciones
- **Frontend**: Interfaz web con Flask

## 📋 Requisitos Previos

- Docker y Docker Compose
- Google Gemini API Key (para consultas en lenguaje natural)
- (Opcional) Credenciales de Microsoft Entra ID para SSO

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd gestion-personas-app
```

### 2. Configurar variables de entorno

```bash
cp env.example .env
```

Edita el archivo `.env` y configura:
- `GEMINI_API_KEY`: Tu API key de Google Gemini
- `JWT_SECRET`: Una clave secreta segura para JWT
- (Opcional) Credenciales de Microsoft Entra ID

### 3. Iniciar los servicios

```bash
docker-compose up -d
```

Esto iniciará todos los servicios:
- PostgreSQL en puerto 5432
- Redis en puerto 6379
- Qdrant en puerto 6333
- API Gateway en puerto 8000
- Frontend Streamlit en puerto 8501

### 4. Acceder a la aplicación

Abre tu navegador en: http://localhost:8501

## 📱 Funcionalidades

### Menú Principal
1. **Crear Personas**: Registro de nuevas personas con validaciones completas
2. **Modificar Datos Personales**: Actualización de información existente
3. **Consultar Datos Personales**: Búsqueda individual y avanzada con filtros
4. **Consulta en Lenguaje Natural**: Preguntas usando IA (ej: "¿Cuál es el empleado más joven?")
5. **Borrar Personas**: Eliminación segura con confirmación
6. **Consultar Log**: Auditoría completa de todas las transacciones

### Validaciones Implementadas

- **Primer/Segundo Nombre**: Solo letras, máximo 30 caracteres
- **Apellidos**: Solo letras, máximo 60 caracteres
- **Número de Documento**: Solo números, máximo 10 caracteres
- **Fecha de Nacimiento**: No puede ser futura, con calendario
- **Género**: Lista desplegable con 4 opciones
- **Correo Electrónico**: Validación de formato email
- **Celular**: Exactamente 10 dígitos numéricos
- **Foto**: Máximo 2MB, formatos jpg/jpeg/png/gif

## 🔧 Desarrollo Local

Para desarrollo sin Docker:

### Backend

1. Instalar PostgreSQL, Redis y Qdrant localmente
2. En cada servicio:
   ```bash
   cd services/<service-name>
   npm install
   npm run dev
   ```

### Frontend

```bash
cd frontend
pip install -r requirements.txt
streamlit run app.py
```

## 📊 Monitoreo y Logs

- Los logs de transacciones se almacenan en la base de datos
- Consulta de logs con filtros avanzados desde el menú
- Estadísticas en tiempo real disponibles

## 🔒 Seguridad

- Autenticación JWT para todas las APIs
- Soporte SSO con Microsoft Entra ID
- Rate limiting en el API Gateway
- Validación exhaustiva de entrada de datos
- Logs de auditoría para todas las operaciones

## 🚦 Escalabilidad

- El servicio de consultas está configurado para escalar automáticamente
- Cache Redis para optimizar consultas frecuentes
- Base de datos con índices optimizados
- Vector database (Qdrant) para búsquedas semánticas eficientes

## 🛠️ Mantenimiento

### Limpiar logs antiguos

```bash
curl -X DELETE "http://localhost:8000/api/logs/cleanup?days=90"
```

### Sincronizar embeddings para RAG

```bash
curl -X POST "http://localhost:8000/api/nlp/sync-embeddings"
```

## 📝 Notas Importantes

1. **Primer Usuario**: El sistema crea un usuario admin por defecto. Cambia la contraseña en producción.
2. **Gemini API**: Sin esta configuración, las consultas en lenguaje natural no funcionarán.
3. **Volúmenes Docker**: Los datos persisten en volúmenes Docker (`postgres_data` y `qdrant_data`).
4. **Fotos**: Se almacenan localmente en el contenedor. En producción, considera usar un servicio de almacenamiento en la nube.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
