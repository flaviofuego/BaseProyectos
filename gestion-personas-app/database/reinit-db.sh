#!/bin/bash

# Script para reinicializar la base de datos sin eliminar el volumen
# Útil cuando se quiere forzar la ejecución de init.sql

set -e

echo "🔄 Reinicializando base de datos..."

# Variables
DB_CONTAINER="personas_db"
DB_USER="admin"
DB_NAME="personas_db"
INIT_SQL_PATH="/init-scripts/init.sql"
MIGRATIONS_DIR="/init-scripts/migrations"

# Verificar si el contenedor está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ Error: El contenedor $DB_CONTAINER no está corriendo"
    echo "   Ejecuta: docker-compose up -d postgres"
    exit 1
fi

echo "✅ Contenedor encontrado: $DB_CONTAINER"

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
until docker exec $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL está listo"

# Ejecutar script de inicialización
echo "📝 Ejecutando init.sql..."
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f $INIT_SQL_PATH

if [ $? -eq 0 ]; then
    echo "✅ init.sql ejecutado correctamente"
else
    echo "❌ Error ejecutando init.sql"
    exit 1
fi

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."

# Crear tabla de control de migraciones si no existe
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<-EOSQL
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
EOSQL

# Listar archivos de migración
MIGRATIONS=$(docker exec $DB_CONTAINER sh -c "ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort" || echo "")

if [ -z "$MIGRATIONS" ]; then
    echo "ℹ️  No hay migraciones para aplicar"
else
    for migration_file in $MIGRATIONS; do
        migration_name=$(basename "$migration_file")
        
        # Verificar si ya se aplicó esta migración
        ALREADY_APPLIED=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';" | xargs)
        
        if [ "$ALREADY_APPLIED" = "0" ]; then
            echo "  📝 Aplicando migración: $migration_name"
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f "$migration_file"
            
            # Registrar migración aplicada
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');"
            
            echo "  ✅ Migración aplicada: $migration_name"
        else
            echo "  ⏭️  Migración ya aplicada: $migration_name"
        fi
    done
fi

# Mostrar estadísticas
echo ""
echo "📊 Estadísticas de la base de datos:"
TABLE_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo "   - Tablas: $TABLE_COUNT"

# Contar registros en tablas principales
USERS_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | xargs)
PERSONAS_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM personas;" | xargs)
LOGS_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM transaction_logs;" | xargs)

echo "   - Usuarios: $USERS_COUNT"
echo "   - Personas: $PERSONAS_COUNT"
echo "   - Logs: $LOGS_COUNT"

echo ""
echo "🎉 Reinicialización completada!"
