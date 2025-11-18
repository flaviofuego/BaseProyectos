#!/bin/bash
# Script para ejecutar tests del Frontend
# Uso: ./test.sh [opciones]
#
# Opciones:
#   --python             : Solo tests de Python (Pytest)
#   --javascript         : Solo tests de JavaScript (Jest)
#   --save-coverage      : Guardar reportes de cobertura
#   --watch              : Modo watch para JavaScript
#   <archivo>            : Ejecutar un test específico

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Procesar argumentos
SAVE_COVERAGE=false
WATCH_MODE=false
PYTHON_ONLY=false
JAVASCRIPT_ONLY=false
TEST_FILE=""

for arg in "$@"; do
    case $arg in
        --save-coverage)
            SAVE_COVERAGE=true
            ;;
        --watch)
            WATCH_MODE=true
            ;;
        --python)
            PYTHON_ONLY=true
            ;;
        --javascript)
            JAVASCRIPT_ONLY=true
            ;;
        *.py|*.test.js)
            TEST_FILE=$arg
            ;;
    esac
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Tests - Frontend${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Verificar que el contenedor esté corriendo
CONTAINER_NAME="flask_app_dev"

# Try dev container first, fallback to production
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    CONTAINER_NAME="flask_app"
    if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${RED}❌ El contenedor flask_app_dev o flask_app no está corriendo${NC}"
        echo ""
        echo "Inicia los servicios con:"
        echo "  cd ../.. && make dev"
        exit 1
    fi
fi

echo -e "${CYAN}📦 Usando contenedor: $CONTAINER_NAME${NC}"
echo ""

# Variables para tracking de resultados
python_exit_code=0
js_exit_code=0

# ====================
# Python Tests (Pytest)
# ====================
if [ "$JAVASCRIPT_ONLY" = false ]; then
    echo -e "${YELLOW}🐍 Ejecutando tests de Python (Pytest)...${NC}"
    echo ""
    
    # Instalar dependencias
    echo -e "${CYAN}📦 Verificando dependencias de Python...${NC}"
    docker exec $CONTAINER_NAME pip install -q -r requirements-test.txt 2>&1 | grep -v "already satisfied" || true
    
    echo ""
    
    if [ "$WATCH_MODE" = true ]; then
        echo -e "${GREEN}🔄 Modo Watch activado para Pytest${NC}"
        echo -e "${YELLOW}💡 Presiona Ctrl+C para salir${NC}"
        echo ""
        docker exec -it $CONTAINER_NAME pytest-watch tests/
    elif [ -n "$TEST_FILE" ] && [[ "$TEST_FILE" == *.py ]]; then
        echo -e "${CYAN}🧪 Ejecutando: $TEST_FILE${NC}"
        echo ""
        if [ "$SAVE_COVERAGE" = true ]; then
            docker exec $CONTAINER_NAME pytest tests/$TEST_FILE --cov=. --cov-report=html
        else
            docker exec $CONTAINER_NAME pytest tests/$TEST_FILE -v
        fi
        python_exit_code=$?
    else
        echo -e "${CYAN}🧪 Ejecutando todos los tests de Python...${NC}"
        echo ""
        if [ "$SAVE_COVERAGE" = true ]; then
            docker exec $CONTAINER_NAME pytest --cov=. --cov-report=html --cov-report=term
        else
            docker exec $CONTAINER_NAME pytest -v
        fi
        python_exit_code=$?
    fi
    
    echo ""
    if [ $python_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Python Tests - PASSED${NC}"
    else
        echo -e "${RED}❌ Python Tests - FAILED${NC}"
    fi
    echo ""
fi

# ====================
# JavaScript Tests (Jest)
# ====================
if [ "$PYTHON_ONLY" = false ] && [ "$WATCH_MODE" = false ]; then
    echo -e "${YELLOW}📜 Ejecutando tests de JavaScript (Jest)...${NC}"
    echo ""
    
    # Instalar dependencias
    echo -e "${CYAN}📦 Verificando dependencias de Node...${NC}"
    docker exec $CONTAINER_NAME npm install --silent 2>&1 | grep -v "up to date" || true
    
    echo ""
    
    if [ -n "$TEST_FILE" ] && [[ "$TEST_FILE" == *.test.js ]]; then
        echo -e "${CYAN}🧪 Ejecutando: $TEST_FILE${NC}"
        echo ""
        docker exec $CONTAINER_NAME npm test -- tests/js/$TEST_FILE
        js_exit_code=$?
    else
        echo -e "${CYAN}🧪 Ejecutando todos los tests de JavaScript...${NC}"
        echo ""
        docker exec $CONTAINER_NAME npm test
        js_exit_code=$?
    fi
    
    echo ""
    if [ $js_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ JavaScript Tests - PASSED${NC}"
    else
        echo -e "${RED}❌ JavaScript Tests - FAILED${NC}"
    fi
    echo ""
fi

# ====================
# Modo Watch para JavaScript
# ====================
if [ "$WATCH_MODE" = true ] && [ "$PYTHON_ONLY" = false ]; then
    echo -e "${YELLOW}📜 Modo Watch para JavaScript (Jest)...${NC}"
    echo ""
    echo -e "${GREEN}🔄 Modo Watch activado${NC}"
    echo -e "${YELLOW}💡 Los tests se ejecutarán automáticamente al guardar${NC}"
    echo -e "${YELLOW}💡 Presiona Ctrl+C para salir${NC}"
    echo ""
    docker exec -it $CONTAINER_NAME npm run test:watch
    exit 0
fi

# ====================
# Guardar cobertura
# ====================
if [ "$SAVE_COVERAGE" = true ]; then
    echo -e "${CYAN}📊 Guardando reportes de cobertura...${NC}"
    
    # Python coverage
    if [ "$JAVASCRIPT_ONLY" = false ]; then
        docker cp $CONTAINER_NAME:/app/coverage_html ./coverage_html 2>/dev/null || true
        if [ -d "./coverage_html" ]; then
            echo -e "${GREEN}✅ Cobertura Python guardada en: ./coverage_html/index.html${NC}"
        fi
    fi
    
    # JavaScript coverage
    if [ "$PYTHON_ONLY" = false ]; then
        docker cp $CONTAINER_NAME:/app/coverage_js ./coverage_js 2>/dev/null || true
        if [ -d "./coverage_js" ]; then
            echo -e "${GREEN}✅ Cobertura JavaScript guardada en: ./coverage_js/lcov-report/index.html${NC}"
        fi
    fi
    
    echo ""
fi

# ====================
# Resultado Final
# ====================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}           RESUMEN DE TESTS${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

if [ "$JAVASCRIPT_ONLY" = false ]; then
    if [ $python_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Python Tests - PASSED${NC}"
    else
        echo -e "${RED}❌ Python Tests - FAILED${NC}"
    fi
fi

if [ "$PYTHON_ONLY" = false ] && [ "$WATCH_MODE" = false ]; then
    if [ $js_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ JavaScript Tests - PASSED${NC}"
    else
        echo -e "${RED}❌ JavaScript Tests - FAILED${NC}"
    fi
fi

echo ""

# Exit code
if [ $python_exit_code -ne 0 ] || [ $js_exit_code -ne 0 ]; then
    exit 1
fi

exit 0
