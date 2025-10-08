# 🗄️ Sistema de Migraciones de Base de Datos

## 📋 Descripción General

Este proyecto implementa un sistema completo de migraciones y backup/restore automático para garantizar la consistencia de la base de datos entre diferentes entornos y deployments.

## 🔄 Workflow Automático

### Al iniciar contenedores (`make up` o `make dev`)
1. El contenedor de PostgreSQL ejecuta automáticamente `init-db.sh`
2. **Si existe un backup** (`/backups/latest_backup.sql`):
   - Restaura la base de datos desde el backup
   - Preserva el estado completo de la base de datos anterior
3. **Si NO existe backup**:
   - Ejecuta `init.sql` (schema inicial)
   - Aplica todas las migraciones en orden desde `database/migrations/`
   - Registra cada migración en la tabla `schema_migrations`

### Al detener contenedores (`make down` o `make down-dev`)
1. Automáticamente crea un backup de la base de datos actual
2. El backup se guarda como `latest_backup.sql` (siempre el más reciente)
3. También se crea una copia con timestamp: `backup_YYYYMMDD_HHMMSS.sql`
4. Se mantienen los últimos 5 backups, eliminando los más antiguos

## 📂 Estructura de Archivos

```
database/
├── init.sql                    # Schema inicial de la base de datos
├── init-db.sh                  # Script de inicialización (ejecutado por postgres)
├── backup.sh                   # Script de backup automático
├── restore.sh                  # Script de restore automático
├── backups/                    # Directorio de backups (persistente)
│   ├── latest_backup.sql       # Último backup (usado para restore)
│   ├── backup_20240101_120000.sql
│   ├── backup_20240102_150000.sql
│   └── .gitignore              # Los backups NO se suben a git
└── migrations/                 # Directorio de migraciones
    └── add_user_preferences.sql
```

## 🛠️ Comandos Disponibles

### Comandos Automáticos (se ejecutan solos)
```bash
make up          # Inicia servicios + restaura backup si existe
make down        # Crea backup + detiene servicios
make dev         # Inicia en modo desarrollo + restaura backup
make down-dev    # Crea backup + detiene desarrollo
```

### Comandos Manuales de Base de Datos
```bash
# Ver estado de la base de datos
make db-status           # Muestra estadísticas (usuarios, personas, tablas, migraciones)

# Crear backup manual
make db-backup           # Crea un backup manual de la base de datos actual

# Restaurar desde backup
make db-restore          # Restaura desde latest_backup.sql (no destructivo)

# Reset completo (⚠️ PELIGROSO)
make db-reset            # Borra TODAS las tablas y restaura desde backup
                         # Espera 5 segundos para cancelar con Ctrl+C

# Ver migraciones aplicadas
make db-migrations       # Lista todas las migraciones con sus fechas
```

## 🆕 Crear Nueva Migración

### 1. Crear archivo de migración
```bash
# Nombrar con formato: <numero>_<descripcion>.sql
# Ejemplo:
database/migrations/002_add_notifications_table.sql
```

### 2. Escribir el SQL de la migración
```sql
-- database/migrations/002_add_notifications_table.sql

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'info',
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leido ON notificaciones(leido);

-- Comentarios descriptivos
COMMENT ON TABLE notificaciones IS 'Tabla de notificaciones del sistema';
```

### 3. Aplicar la migración

**Opción A: Automática (recomendada)**
```bash
# Si ya tienes backup
make down     # Crea backup
make up       # Restaura + aplica nuevas migraciones

# Si NO tienes backup (primera vez)
make down     # Para servicios
make up       # Inicia y aplica migraciones
```

**Opción B: Manual (solo para testing)**
```bash
# Ejecutar migración directamente
docker exec personas_db psql -U admin -d personas_db -f /docker-entrypoint-initdb.d/migrations/002_add_notifications_table.sql

# Registrar manualmente en schema_migrations
docker exec personas_db psql -U admin -d personas_db -c \
  "INSERT INTO schema_migrations (migration_name) VALUES ('002_add_notifications_table.sql');"
```

### 4. Verificar migración aplicada
```bash
make db-migrations
# Output:
#        migration_name        |         applied_at         
# -----------------------------+----------------------------
#  add_user_preferences.sql    | 2024-01-15 10:30:00.123456
#  002_add_notifications_table.sql | 2024-01-16 14:25:00.789012
```

## 🔍 Cómo Funciona el Sistema

### Tabla schema_migrations
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Esta tabla rastrea qué migraciones ya se aplicaron para evitar ejecutarlas dos veces.

### Lógica de Detección de Duplicados

```bash
# Para cada archivo en database/migrations/*.sql
for migration_file in $(ls -1 $MIGRATION_DIR/*.sql | sort); do
    # Extraer nombre del archivo
    migration_name=$(basename $migration_file)
    
    # Verificar si ya se aplicó
    already_applied=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -tAc \
        "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name'")
    
    # Solo aplicar si no existe
    if [ "$already_applied" = "0" ]; then
        psql -U $POSTGRES_USER -d $POSTGRES_DB -f $migration_file
        psql -U $POSTGRES_USER -d $POSTGRES_DB -c \
            "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name')"
        echo "✅ Applied: $migration_name"
    else
        echo "⏭️  Skipped: $migration_name (already applied)"
    fi
done
```

### Orden de Aplicación de Migraciones

Las migraciones se aplican en **orden alfabético**. Por eso se recomienda usar números:

```
database/migrations/
├── 001_initial_schema.sql          # Se aplica primero
├── 002_add_notifications.sql       # Se aplica segundo
├── 003_add_user_roles.sql          # Se aplica tercero
└── add_user_preferences.sql        # Se aplica al final (sin número)
```

### Condiciones de Restore Inteligente

El script `restore.sh` tiene lógica inteligente para evitar sobrescribir datos:

```bash
# Cuenta las tablas existentes
TABLE_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -tAc \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")

# Si ya hay más de 5 tablas, asume que ya está inicializada
if [ "$TABLE_COUNT" -gt 5 ]; then
    echo "⚠️  Database already initialized (found $TABLE_COUNT tables). Skipping restore."
    exit 0
fi

# Solo restaura si hay pocas tablas (primera inicialización)
echo "♻️  Restoring database from backup..."
psql -U $POSTGRES_USER -d $POSTGRES_DB -f $LATEST_BACKUP
```

## 🚀 Casos de Uso

### Caso 1: Clonar Repositorio en Nueva Máquina

```bash
# En máquina original
git add -A
git commit -m "Update with latest changes"
git push

make down  # Crea backup automático antes de apagar

# Los backups NO se suben a git (están en .gitignore)
# Solo el código fuente se sube

# En máquina nueva
git clone <repo-url>
cd gestion-personas-app

# Copiar backup desde máquina original (manualmente)
# Opción A: Usar scp, rsync, USB, cloud storage, etc.
scp original:/path/to/database/backups/latest_backup.sql ./database/backups/

# Opción B: Si no tienes backup, la base de datos se creará desde cero
# con init.sql + migraciones

make up
# Automáticamente restaura desde latest_backup.sql si existe
# Si no existe, crea base de datos nueva desde init.sql
```

### Caso 2: Desarrollo Iterativo con Migraciones

```bash
# Día 1: Trabajar con base de datos actual
make dev
# ... hacer cambios ...
make down-dev  # Backup automático

# Día 2: Crear nueva migración
echo "CREATE TABLE logs (...)" > database/migrations/003_add_logs_table.sql

# Probar migración
make dev
# init-db.sh detecta nueva migración y la aplica automáticamente
# Verifica que se aplicó:
make db-migrations

# Día 3: Continuar desarrollo
make dev
# La migración NO se vuelve a aplicar (ya está en schema_migrations)
```

### Caso 3: Recuperación de Errores

```bash
# Algo salió mal y la base de datos está corrupta
make db-status  # Ver estado actual

# Opción A: Restaurar desde backup (no destructivo)
make db-restore

# Opción B: Reset completo (⚠️ borra todo)
make db-reset  # Espera 5 segundos para cancelar

# Opción C: Volver a backup específico
docker exec personas_db psql -U admin -d personas_db < database/backups/backup_20240115_100000.sql
```

### Caso 4: Testing de Migraciones

```bash
# Método seguro para probar migraciones sin afectar datos reales

# 1. Crear backup de seguridad
make db-backup

# 2. Hacer cambios y probar
# ... editar código, agregar migraciones ...
make down
make up

# 3. Verificar que todo funciona
make db-status
make db-migrations

# Si algo salió mal:
make db-reset  # Volver al backup anterior
```

## ⚠️ Consideraciones Importantes

### 1. Backups NO están en Git
Los archivos `.sql` en `database/backups/` están excluidos de git (ver `.gitignore`). Esto es intencional porque:
- Los backups pueden ser muy grandes
- Contienen datos sensibles (contraseñas hasheadas, información personal)
- Deben transferirse manualmente entre máquinas (scp, cloud storage, etc.)

### 2. Migraciones SÍ están en Git
Los archivos en `database/migrations/` **SÍ se suben a git**. Son código fuente que define la estructura de la base de datos.

### 3. Idempotencia de Migraciones
Siempre usa `IF NOT EXISTS` y `IF EXISTS` en tus migraciones:

```sql
-- ✅ BIEN: Idempotente, se puede ejecutar múltiples veces
CREATE TABLE IF NOT EXISTS mi_tabla (...);
ALTER TABLE mi_tabla ADD COLUMN IF NOT EXISTS mi_columna TEXT;
DROP TABLE IF EXISTS tabla_temporal;

-- ❌ MAL: Falla si ya existe
CREATE TABLE mi_tabla (...);
ALTER TABLE mi_tabla ADD COLUMN mi_columna TEXT;
DROP TABLE tabla_temporal;
```

### 4. Orden de Migraciones
Usa prefijos numéricos para controlar el orden:

```
001_initial_schema.sql
002_add_users.sql
003_add_relations.sql
```

### 5. Backups Automáticos
Los backups se crean automáticamente en `make down`, pero también puedes crear manualmente:

```bash
make db-backup  # Backup manual adicional
```

### 6. Límite de Backups
Solo se mantienen los últimos **5 backups**. Los más antiguos se eliminan automáticamente para ahorrar espacio.

## 🐛 Troubleshooting

### Error: "latest_backup.sql not found"
```bash
# Normal en primera ejecución, solo significa que no hay backup previo
# La base de datos se creará desde init.sql + migraciones
```

### Error: "Database already initialized"
```bash
# El restore se saltó porque ya hay datos
# Si quieres forzar restore:
make db-reset  # ⚠️ BORRA TODO y restaura
```

### Error: "Migration already applied"
```bash
# Normal, significa que la migración ya se ejecutó
# schema_migrations previene ejecución duplicada
```

### Error: Permisos de backup.sh
```bash
# Si los scripts no tienen permisos de ejecución:
docker exec personas_db chmod +x /backups/backup.sh
docker exec personas_db chmod +x /backups/restore.sh
docker exec personas_db chmod +x /docker-entrypoint-initdb.d/init-db.sh
```

### Ver logs de inicialización
```bash
# Ver qué pasó durante la inicialización
docker logs personas_db

# Ver logs en tiempo real
docker logs -f personas_db
```

## 📊 Estadísticas y Monitoreo

```bash
# Estado completo de la base de datos
make db-status

# Ver todas las migraciones aplicadas
make db-migrations

# Verificar salud del contenedor
docker ps | grep personas_db

# Ver espacio usado por backups
du -h database/backups/

# Listar todos los backups disponibles
ls -lh database/backups/
```

## 🎯 Mejores Prácticas

1. **Siempre hacer backup antes de cambios grandes**
   ```bash
   make db-backup  # Backup manual de seguridad
   ```

2. **Probar migraciones en desarrollo primero**
   ```bash
   make dev  # Probar en desarrollo
   make db-status  # Verificar
   ```

3. **Documentar tus migraciones**
   ```sql
   -- Migration: Add notification system
   -- Author: Flavio
   -- Date: 2024-01-16
   -- Description: Adds notifications table for real-time alerts
   ```

4. **Usar transacciones en migraciones complejas**
   ```sql
   BEGIN;
   
   CREATE TABLE ...;
   ALTER TABLE ...;
   INSERT INTO ...;
   
   COMMIT;
   ```

5. **Verificar después de cada migración**
   ```bash
   make db-migrations  # Ver migraciones aplicadas
   make db-status      # Ver estado general
   ```

## 📝 Resumen Rápido

| Comando | Cuándo Usar |
|---------|-------------|
| `make up` | Iniciar aplicación (restaura backup automáticamente) |
| `make down` | Detener aplicación (crea backup automáticamente) |
| `make db-backup` | Crear backup manual de seguridad |
| `make db-restore` | Restaurar desde último backup (no destructivo) |
| `make db-reset` | ⚠️ BORRAR TODO y restaurar desde backup |
| `make db-status` | Ver estado actual (usuarios, tablas, migraciones) |
| `make db-migrations` | Ver lista de migraciones aplicadas |

---

**Desarrollado con ❤️ para mantener consistencia entre entornos**
