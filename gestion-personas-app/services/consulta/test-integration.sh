#!/bin/bash

# Script para ejecutar tests de integración del Consulta Service
# Uso: ./test-integration.sh [--watch] [filename]

echo "========================================"
echo "  Tests de Integración - Consulta Service"
echo "========================================"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
  echo "Por favor inicia Docker Desktop e intenta de nuevo"
  exit 1
fi

echo -e "${GREEN}✅ Docker está corriendo${NC}"
echo ""

# Parsear argumentos
WATCH_MODE=""
TEST_FILE=""

for arg in "$@"; do
  case $arg in
    --watch)
      WATCH_MODE="--watch"
      shift
      ;;
    *)
      TEST_FILE="$arg"
      shift
      ;;
  esac
done

# Ejecutar tests
echo "🧪 Ejecutando tests de integración..."
echo "⏰ Esto puede tomar varios minutos (levantando contenedores)"

if [ -n "$TEST_FILE" ]; then
  echo -e "${YELLOW}📝 Archivo: $TEST_FILE${NC}"
fi

if [ -n "$WATCH_MODE" ]; then
  echo -e "${YELLOW}👀 Modo watch activado${NC}"
fi

echo ""

########################################################
# Modo de ejecución
# - Por defecto ejecuta LOCALMENTE (Testcontainers necesita acceso directo a Docker)
# - Para forzar Docker: export USE_DOCKER=1 (puede fallar con Reaper)
# - NOTA: Testcontainers desde contenedor requiere Docker-in-Docker complejo
########################################################

USE_DOCKER=${USE_DOCKER:=0}

if [ "$USE_DOCKER" = "1" ]; then
  echo -e "${YELLOW}🐳 Ejecutando dentro de Docker Compose${NC}"
  # Obtener directorio actual y convertir a WSL path si es necesario
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
  TEST_CMD="npm run test:integration ${WATCH_MODE} ${TEST_FILE}"
  docker compose -f "$COMPOSE_FILE" run --rm consulta-service sh -lc "$TEST_CMD"
else
  # Ejecutar Jest con configuración de integración local
  if [ -n "$TEST_FILE" ]; then
    npm run test:integration -- $WATCH_MODE "$TEST_FILE"
  else
    npm run test:integration $WATCH_MODE
  fi
fi

# Verificar resultado
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Tests de Integración - PASSED${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}❌ Tests de Integración - FAILED${NC}"
  echo ""
  exit 1
fi
