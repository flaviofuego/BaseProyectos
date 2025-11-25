#!/bin/bash

# Script para restaurar la base de datos desde el backup más reciente
# Se ejecuta automáticamente cuando se inicia el contenedor
# NOTA: Este script se llama desde init-db.sh, PostgreSQL ya está corriendo

set -e

BACKUP_DIR="/backups"
LATEST_BACKUP="$BACKUP_DIR/latest_backup.sql"

echo "🔍 Checking for existing backup..."

# Si existe un backup, restaurarlo
if [ -f "$LATEST_BACKUP" ]; then
    echo "📦 Found backup: $LATEST_BACKUP"
    
    # PostgreSQL ya está listo (garantizado por docker-entrypoint)
    echo "✅ PostgreSQL is ready"
    
    # Verificar si la base de datos ya tiene datos
    TABLE_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
    
    if [ "$TABLE_COUNT" != "0" ] && [ "$TABLE_COUNT" -gt 5 ]; then
        echo "⚠️  Database already has $TABLE_COUNT tables - skipping restore"
        echo "   (Use 'make db-reset' to force a restore)"
    else
        echo "🔄 Restoring database from backup..."
        
        psql -U $POSTGRES_USER -d $POSTGRES_DB -f "$LATEST_BACKUP" --quiet
        
        echo "✅ Database restored successfully"
        
        # Mostrar estadísticas
        USER_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
        PERSONA_COUNT=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM personas;" 2>/dev/null | xargs || echo "0")
        TABLE_COUNT_AFTER=$(psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
        
        echo ""
        echo "📊 Database Statistics:"
        echo "   - Users: $USER_COUNT"
        echo "   - Personas: $PERSONA_COUNT"
        echo "   - Tables: $TABLE_COUNT_AFTER"
    fi
else
    echo "ℹ️  No backup found - database will be initialized from init.sql and migrations"
fi

exit 0
