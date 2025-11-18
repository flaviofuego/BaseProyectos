#!/bin/bash

# Script para ejecutar tests de integración del Service Registry
# Uso: ./test-integration.sh [--watch] [filename]

echo "========================================"
echo "  Tests de Integración - Service Registry"
echo "========================================"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

########################################################
# Modo de ejecución
# - Por defecto usa Docker Compose (no ensucia tu host)
# - Para forzar local: export USE_DOCKER=0
########################################################

USE_DOCKER=${USE_DOCKER:=1}

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

echo ""
echo "🧪 Ejecutando tests de integración..."

if [ -n "$TEST_FILE" ]; then
  echo "📝 Archivo: $TEST_FILE"
fi

if [ -n "$WATCH_MODE" ]; then
  echo "👀 Modo watch activado"
fi

echo ""

if [ "$USE_DOCKER" = "1" ]; then
  echo -e "${YELLOW}🐳 Ejecutando dentro de Docker Compose${NC}"
  # Obtener directorio actual y convertir a WSL path si es necesario
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
  TEST_CMD="npm run test:integration ${WATCH_MODE} ${TEST_FILE}"
  # Ejecutar en contenedor del service-registry con node_modules aislados
  docker compose -f "$COMPOSE_FILE" run --rm service-registry sh -lc "$TEST_CMD"
else
  echo -e "${YELLOW}💻 Ejecutando localmente (requiere node_modules en host)${NC}"
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
