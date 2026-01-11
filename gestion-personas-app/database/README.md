# 🗄️ Database Management

Este directorio contiene scripts y configuraciones para la gestión de la base de datos PostgreSQL.

## 📁 Estructura de Archivos

```
database/
├── init.sql              # Script de inicialización de la base de datos
├── init-db.sh           # Script que ejecuta la inicialización automáticamente
├── reinit-db.sh         # Script para reinicializar sin recrear el contenedor
├── backup.sh            # Script para crear backups
├── restore.sh           # Script para restaurar backups
├── flyway/              # Migraciones con Flyway
│   ├── flyway.conf
│   └── sql/
│       ├── V1__initial_schema.sql
│       └── V2__add_user_preferences.sql
├── migrations/          # Directorio de migraciones SQL legacy
│   └── add_user_preferences.sql
└── backups/            # Directorio de backups automáticos
    └── latest_backup.sql
```

## 🚀 Inicialización Automática

### Con Flyway (Recomendado)

El servicio Flyway se ejecuta automáticamente al iniciar los contenedores:

```yaml
flyway:
  image: flyway/flyway:10-alpine
  depends_on:
    postgres:
      condition: service_healthy
  command: migrate
```

Las migraciones se encuentran en `flyway/sql/` y siguen el patrón `V{version}__{description}.sql`.

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

### Tablas Principales

1. **users**: Usuarios del sistema
2. **personas**: Información de personas/empleados
3. **user_preferences**: Preferencias de usuario
4. **transaction_logs**: Logs de auditoría

### Vistas

- **personas_con_edad**: Vista con edad calculada y grupo etario

### Tablas de Control

- **flyway_schema_history**: Control de migraciones Flyway
- **schema_migrations**: Control de migraciones legacy

## 🔄 Sistema de Migraciones Flyway

Las migraciones se aplican automáticamente usando Flyway:

1. Flyway espera a que PostgreSQL esté healthy
2. Ejecuta migraciones en orden de versión (V1, V2, ...)
3. Registra cada migración en `flyway_schema_history`
4. Valida checksums para detectar cambios

### Crear Nueva Migración

```bash
# Crear archivo con el formato correcto
touch database/flyway/sql/V3__add_new_feature.sql

# Editar el archivo con comandos SQL
vim database/flyway/sql/V3__add_new_feature.sql

# Las migraciones se aplicarán automáticamente al reiniciar
docker-compose down && docker-compose up -d
```

## 🐳 Configuración Docker

### docker-compose.yml

```yaml
postgres:
  image: postgres:15-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./database/backups:/backups
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U admin -d personas_db"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s

flyway:
  image: flyway/flyway:10-alpine
  depends_on:
    postgres:
      condition: service_healthy
  volumes:
    - ./database/flyway/sql:/flyway/sql:ro
    - ./database/flyway/flyway.conf:/flyway/conf/flyway.conf:ro
  command: migrate
```

### Puntos Importantes

1. ✅ **Flyway gestiona migraciones** automáticamente
2. ✅ **Healthcheck** asegura que PostgreSQL esté listo antes de otros servicios
3. ⚠️ **Baseline on Migrate** habilitado para bases de datos existentes
4. ✅ **Volúmenes Persistentes**: Los datos persisten entre reinicios

## 🔍 Verificación

### Verificar Migraciones Flyway

```bash
docker exec personas_db psql -U admin -d personas_db -c "SELECT * FROM flyway_schema_history;"
```

### Verificar Tablas

```bash
docker exec personas_db psql -U admin -d personas_db -c "\dt"
```

### Verificar Datos

```bash
make db-status
```

## 🚨 Solución de Problemas

### Problema: Migración falló

```bash
# Ver estado de Flyway
docker-compose logs flyway

# Reparar (marcar como exitoso manualmente)
docker-compose run --rm flyway repair
```

### Problema: Tablas no existen

```bash
# Solución: Reinicializar con Flyway
docker-compose down
docker-compose up -d postgres
docker-compose run --rm flyway migrate
```

### Problema: Checksum mismatch

```bash
# Si una migración fue modificada después de aplicarse
docker-compose run --rm flyway repair
docker-compose run --rm flyway migrate
```

## 📝 Notas Importantes

1. **Backups Automáticos**: Se crean automáticamente al hacer `make down`
2. **Volúmenes Persistentes**: Los datos persisten entre reinicios
3. **Migraciones**: Flyway asegura que solo se ejecuten una vez
4. **Healthcheck**: Asegura disponibilidad antes de otros servicios
5. **NLP**: Usa Text-to-SQL, no requiere extensiones adicionales

## 🔗 Referencias

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
