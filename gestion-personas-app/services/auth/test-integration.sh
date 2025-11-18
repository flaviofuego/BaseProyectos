#!/bin/bash
# Script para ejecutar tests de integración del Auth Service
# Uso: ./test-integration.sh [opciones]
#
# Opciones:
#   --watch              : Modo watch
#   <archivo>            : Ejecutar test específico

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Tests de Integración - Auth Service${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    echo ""
    echo "Por favor, inicia Docker Desktop y vuelve a intentar."
    exit 1
fi

echo -e "${GREEN}✅ Docker está corriendo${NC}"
echo ""

# Procesar argumentos
WATCH_MODE=false
TEST_FILE=""

for arg in "$@"; do
    case $arg in
        --watch)
            WATCH_MODE=true
            ;;
        *.test.js)
            TEST_FILE=$arg
            ;;
    esac
done

# Instalar dependencias si no existen
if [ ! -d "node_modules" ] || [ ! -d "node_modules/testcontainers" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
    npm install
    echo ""
fi

# Ejecutar tests
echo -e "${CYAN}🧪 Ejecutando tests de integración...${NC}"
echo -e "${YELLOW}⏰ Esto puede tomar varios minutos (levantando contenedores)${NC}"
echo ""

if [ "$WATCH_MODE" = true ]; then
    npm run test:integration:watch
elif [ -n "$TEST_FILE" ]; then
    npm run test:integration -- $TEST_FILE
else
    npm run test:integration
fi

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ Tests de Integración - PASSED${NC}"
else
    echo -e "${RED}❌ Tests de Integración - FAILED${NC}"
fi

echo ""
exit $exit_code
