# 🗄️ Database Management

Este directorio contiene scripts y configuraciones para la gestión de la base de datos PostgreSQL con pgvector.

## 📁 Estructura de Archivos

```
database/
├── init.sql              # Script de inicialización de la base de datos
├── init-db.sh           # Script que ejecuta la inicialización automáticamente
├── reinit-db.sh         # Script para reinicializar sin recrear el contenedor
├── backup.sh            # Script para crear backups
├── restore.sh           # Script para restaurar backups
├── migrations/          # Directorio de migraciones SQL
│   ├── add_user_preferences.sql
│   └── enable_pgvector.sql
└── backups/            # Directorio de backups automáticos
    └── latest_backup.sql
```

## 🚀 Inicialización Automática

### Primera Vez (Contenedor Nuevo)

Cuando creas el contenedor de PostgreSQL por primera vez, el script `init-db.sh` se ejecuta **automáticamente**:

1. Verifica si existe un backup
2. Si existe backup → ejecuta `restore.sh`
3. Si NO existe backup → ejecuta `init.sql` y aplica migraciones
4. Registra las migraciones en la tabla `schema_migrations`

### Contenedor Existente

Si el contenedor ya existe y el volumen de datos persiste, los scripts en `/docker-entrypoint-initdb.d/` **NO se ejecutan automáticamente**.

Para forzar la reinicialización sin perder el contenedor:

```bash
# Opción 1: Usar Makefile
make db-reinit

# Opción 2: Ejecutar directamente
bash database/reinit-db.sh
```

## 🔧 Comandos Disponibles

### Makefile

```bash
# Ver estadísticas de la base de datos
make db-status

# Reinicializar (re-ejecutar init.sql)
make db-reinit

# Crear backup manual
make db-backup

# Restaurar desde backup
make db-restore

# Reset completo (elimina todo y restaura)
make db-reset

# Ver migraciones aplicadas
make db-migrations
```

### Scripts Directos

```bash
# Reinicializar base de datos
bash database/reinit-db.sh

# Crear backup
docker exec personas_db bash /backups/backup.sh

# Restaurar backup
docker exec personas_db bash /backups/restore.sh
```

## 📊 Componentes de la Base de Datos

### Extensiones

- **pgvector**: Extensión para búsqueda vectorial semántica
  - Versión: 0.8.1
  - Dimensiones: 1536 (text-embedding-ada-002 de Azure OpenAI)

### Tablas Principales

1. **users**: Usuarios del sistema
2. **personas**: Información de personas/empleados
3. **user_preferences**: Preferencias de usuario
4. **transaction_logs**: Logs de auditoría
5. **personas_embeddings**: Vectores para búsqueda semántica
6. **schema_migrations**: Control de migraciones

### Vistas

- **personas_con_edad**: Vista con edad calculada y grupo etario

### Índices Especiales

- **HNSW Index**: Índice vectorial para búsqueda semántica eficiente
  ```sql
  personas_embeddings_hnsw_idx USING hnsw (embedding vector_cosine_ops)
  ```

## 🔄 Sistema de Migraciones

Las migraciones se aplican automáticamente en orden alfabético desde `migrations/`:

1. Se crea tabla `schema_migrations` si no existe
2. Se ejecutan archivos `.sql` que no estén registrados
3. Se registra cada migración aplicada con timestamp

### Crear Nueva Migración

```bash
# Crear archivo con prefijo numérico
touch database/migrations/003_add_new_feature.sql

# Editar el archivo con comandos SQL
vim database/migrations/003_add_new_feature.sql

# Aplicar (se ejecutará automáticamente en próximo reinicio o con db-reinit)
make db-reinit
```

## 🐳 Configuración Docker

### docker-compose.yml

```yaml
postgres:
  image: pgvector/pgvector:pg15
  volumes:
    - ./database/init-db.sh:/docker-entrypoint-initdb.d/01-init-db.sh:ro
    - ./database/init.sql:/init-scripts/init.sql:ro
    - ./database/migrations:/init-scripts/migrations:ro
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U admin -d personas_db"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

### Puntos Importantes

1. ✅ **pgvector está pre-instalado** en la imagen `pgvector/pgvector:pg15`
2. ✅ **init-db.sh se ejecuta automáticamente** en la primera creación
3. ⚠️ **Scripts NO se re-ejecutan** si el volumen existe
4. ✅ **Healthcheck** asegura que PostgreSQL esté listo antes de otros servicios

## 🔍 Verificación

### Verificar Extensión pgvector

```bash
docker exec personas_db psql -U admin -d personas_db -c "\dx"
```

Debe mostrar:
```
 vector  | 0.8.1   | public     | vector data type and ivfflat and hnsw access methods
```

### Verificar Tabla de Embeddings

```bash
docker exec personas_db psql -U admin -d personas_db -c "\d personas_embeddings"
```

Debe mostrar `embedding | vector(1536)`

### Verificar Migraciones

```bash
make db-migrations
```

## 🚨 Solución de Problemas

### Problema: pgvector no está instalado

```bash
# Solución: Instalar manualmente
docker exec personas_db psql -U admin -d personas_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Problema: Tabla personas_embeddings no existe

```bash
# Solución: Reinicializar base de datos
make db-reinit
```

### Problema: Dimensiones incorrectas (768 vs 1536)

```bash
# Solución 1: Recrear tabla
docker exec personas_db psql -U admin -d personas_db -c "DROP TABLE IF EXISTS personas_embeddings CASCADE;"
make db-reinit

# Solución 2: Recrear contenedor (CUIDADO: pérdida de datos)
docker-compose down -v
docker-compose up -d postgres
```

### Problema: init.sql no se ejecutó en primera creación

```bash
# Solución: Ejecutar manualmente
docker exec -i personas_db psql -U admin -d personas_db < database/init.sql
```

## 📝 Notas Importantes

1. **Backups Automáticos**: Se crean automáticamente al hacer `make down`
2. **Volúmenes Persistentes**: Los datos persisten entre reinicios
3. **Migraciones**: Se ejecutan solo una vez (registro en schema_migrations)
4. **Dimensiones**: 1536 para text-embedding-ada-002 (Azure OpenAI)
5. **Healthcheck**: Asegura disponibilidad antes de otros servicios

## 🔗 Referencias

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Azure OpenAI Embeddings](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/embeddings)
