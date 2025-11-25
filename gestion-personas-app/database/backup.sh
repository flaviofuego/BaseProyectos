#!/bin/bash

# Script para crear backup de la base de datos PostgreSQL
# Se ejecuta automáticamente cuando se detiene el contenedor

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
LATEST_BACKUP="$BACKUP_DIR/latest_backup.sql"

echo "🔄 Creating database backup..."

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Hacer backup usando pg_dump
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h localhost \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -f "$BACKUP_FILE"

# Copiar como latest backup
cp "$BACKUP_FILE" "$LATEST_BACKUP"

# Limpiar backups antiguos (mantener solo los últimos 5)
cd "$BACKUP_DIR"
ls -t backup_*.sql | tail -n +6 | xargs -r rm

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"

# Listar backups disponibles
echo ""
echo "📋 Available backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql 2>/dev/null || echo "No backups found"

exit 0
