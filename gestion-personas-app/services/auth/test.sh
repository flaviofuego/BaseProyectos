#!/bin/bash
# Script para ejecutar tests del Auth Service en Docker
# Uso: ./test.sh [opciones]
#
# Opciones:
#   --save-coverage  : Guarda reportes de cobertura en el host
#   --watch          : Modo watch (desarrollo continuo)
#   <archivo>        : Ejecuta un test específico

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="auth_service"
SERVICE_NAME="Auth Service"

# Procesar argumentos
SAVE_COVERAGE=false
WATCH_MODE=false
TEST_FILE=""

for arg in "$@"; do
    case $arg in
        --save-coverage)
            SAVE_COVERAGE=true
            ;;
        --watch)
            WATCH_MODE=true
            ;;
        *.test.js)
            TEST_FILE=$arg
            ;;
        *)
            echo -e "${RED}Opción desconocida: $arg${NC}"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Tests - $SERVICE_NAME${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Verificar que el contenedor esté corriendo
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ El contenedor $CONTAINER_NAME no está corriendo${NC}"
    echo ""
    echo "Inicia los servicios con:"
    echo "  cd ../.. && make dev"
    exit 1
fi

# Instalar dependencias
echo -e "${CYAN}📦 Verificando dependencias...${NC}"
docker exec $CONTAINER_NAME npm install --include=dev --silent 2>&1 | grep -v "up to date" || true

echo ""

# Ejecutar tests según el modo
if [ "$WATCH_MODE" = true ]; then
    echo -e "${GREEN}🔄 Modo Watch activado${NC}"
    echo -e "${YELLOW}💡 Los tests se ejecutarán automáticamente al guardar${NC}"
    echo -e "${YELLOW}💡 Presiona Ctrl+C para salir${NC}"
    echo ""
    docker exec -it $CONTAINER_NAME npm run test:watch
    
elif [ -n "$TEST_FILE" ]; then
    echo -e "${CYAN}🧪 Ejecutando: $TEST_FILE${NC}"
    echo ""
    docker exec $CONTAINER_NAME npm test $TEST_FILE
    
else
    echo -e "${CYAN}🧪 Ejecutando todos los tests...${NC}"
    echo ""
    docker exec $CONTAINER_NAME npm test
fi

exit_code=$?

echo ""

# Guardar cobertura si se solicita
if [ "$SAVE_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
    echo -e "${CYAN}📊 Guardando reportes de cobertura...${NC}"
    docker cp $CONTAINER_NAME:/app/coverage ./coverage 2>/dev/null || true
    if [ -f "./coverage/lcov-report/index.html" ]; then
        echo -e "${GREEN}✅ Reportes guardados en: ./coverage/lcov-report/index.html${NC}"
    fi
fi

# Mostrar resultado
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ $SERVICE_NAME - Tests PASSED${NC}"
else
    echo -e "${RED}❌ $SERVICE_NAME - Tests FAILED${NC}"
fi

exit $exit_code
