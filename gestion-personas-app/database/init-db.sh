#!/bin/bash

# Script de inicialización de la base de datos
# Se ejecuta cuando el contenedor PostgreSQL inicia por primera vez
# Este script está en /docker-entrypoint-initdb.d/init-db.sh
# NOTA: PostgreSQL ya está corriendo cuando este script se ejecuta

set -e

echo "🚀 Database initialization started..."

# Directorios
BACKUP_DIR="/backups"
INIT_SCRIPTS_DIR="/init-scripts"
MIGRATION_DIR="$INIT_SCRIPTS_DIR/migrations"

# PostgreSQL ya está listo en este punto (docker-entrypoint lo garantiza)
echo "✅ PostgreSQL is ready"

# Si existe un backup, usar el script de restore
if [ -f "$BACKUP_DIR/latest_backup.sql" ]; then
    echo "📦 Backup found - running restore script..."
    bash $BACKUP_DIR/restore.sh
else
    echo "🆕 No backup found - initializing fresh database..."
    
    # Ejecutar script de inicialización base
    if [ -f "$INIT_SCRIPTS_DIR/init.sql" ]; then
        echo "📝 Running init.sql..."
        psql -U $POSTGRES_USER -d $POSTGRES_DB -f $INIT_SCRIPTS_DIR/init.sql
        echo "✅ init.sql executed"
    fi
    
    # Ejecutar migraciones
    echo "🔄 Running migrations..."
    
    if [ -d "$MIGRATION_DIR" ]; then
        # Crear tabla de control de migraciones si no existe
        psql -U $POSTGRES_USER -d $POSTGRES_DB <<-EOSQL
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
EOSQL
        
        # Ejecutar cada migración en orden alfabético
        for migration_file in $(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | sort); do
            migration_name=$(basename "$migration_file")
            
            # Verificar si ya se aplicó esta migración
            ALREADY_APPLIED=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';" | xargs)
            
            if [ "$ALREADY_APPLIED" = "0" ]; then
                echo "  📝 Applying migration: $migration_name"
                psql -U $POSTGRES_USER -d $POSTGRES_DB -f "$migration_file"
                
                # Registrar migración aplicada
                psql -U $POSTGRES_USER -d $POSTGRES_DB -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');"
                
                echo "  ✅ Migration applied: $migration_name"
            else
                echo "  ⏭️  Migration already applied: $migration_name"
            fi
        done
    fi
fi

# Mostrar estadísticas finales
echo ""
echo "📊 Final Database Statistics:"
TABLE_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
USER_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
PERSONA_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM personas;" 2>/dev/null | xargs || echo "0")

echo "   - Tables: $TABLE_COUNT"
echo "   - Users: $USER_COUNT"
echo "   - Personas: $PERSONA_COUNT"

echo "   - Tables: $TABLE_COUNT"
echo "   - Users: $USER_COUNT"
echo "   - Personas: $PERSONA_COUNT"

echo ""
echo "🎉 Database initialization completed successfully!"

exit 0
