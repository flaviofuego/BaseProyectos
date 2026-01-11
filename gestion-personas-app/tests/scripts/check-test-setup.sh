#!/bin/bash

# Script para verificar que el entorno de testing está configurado correctamente

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICACIÓN DEL ENTORNO DE TESTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0

# Función para verificar
check() {
    local description=$1
    local command=$2
    
    echo -n "⏳ Verificando $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Función para verificar archivos
check_file() {
    local description=$1
    local file=$2
    
    echo -n "⏳ Verificando $description... "
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        echo "   Archivo no encontrado: $file"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Función para verificar directorios
check_dir() {
    local description=$1
    local dir=$2
    
    echo -n "⏳ Verificando $description... "
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC}"
        echo "   Directorio no encontrado: $dir (se creará automáticamente)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

echo "📦 Dependencias del Sistema:"
echo ""
check "Docker" "docker --version"
check "Docker Compose" "docker-compose --version"
check "Make" "make --version"

echo ""
echo "📁 Archivos de Configuración:"
echo ""
check_file "tests/config/docker-compose.test.yml" "tests/config/docker-compose.test.yml"
check_file "frontend/Dockerfile.test" "frontend/Dockerfile.test"
check_file "tests/config/jest.config.js" "tests/config/jest.config.js"
check_file "tests/e2e/playwright.config.js" "tests/e2e/playwright.config.js"
check_file "Makefile" "Makefile"

echo ""
echo "🔧 Scripts de Testing:"
echo ""
check_file "test-runner.sh" "test-runner.sh"
check_file "test-quickstart.sh" "test-quickstart.sh"
check_file "view-test-results.sh" "view-test-results.sh"
check "test-runner.sh es ejecutable" "test -x test-runner.sh"
check "test-quickstart.sh es ejecutable" "test -x test-quickstart.sh"
check "view-test-results.sh es ejecutable" "test -x view-test-results.sh"

echo ""
echo "📚 Documentación:"
echo ""
check_file "tests/docs/GUIDE.md" "tests/docs/GUIDE.md"
check_file "tests/README.md" "tests/README.md"

echo ""
echo "📂 Estructura de Directorios:"
echo ""
check_dir "tests/e2e" "tests/e2e"
check_dir "services/auth/tests" "services/auth/tests"

echo ""
echo "🐳 Imágenes Docker:"
echo ""
if docker images | grep -q "postgres"; then
    echo -e "⏳ PostgreSQL: ${GREEN}✅${NC}"
else
    echo -e "⏳ PostgreSQL: ${YELLOW}⚠️  (se descargará al ejecutar tests)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if docker images | grep -q "redis"; then
    echo -e "⏳ Redis: ${GREEN}✅${NC}"
else
    echo -e "⏳ Redis: ${YELLOW}⚠️  (se descargará al ejecutar tests)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "🔌 Puertos Disponibles:"
echo ""

# Verificar puertos de testing
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "⏳ Puerto $port ($service): ${RED}❌ En uso${NC}"
        echo "   Use: lsof -i :$port para ver qué lo usa"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "⏳ Puerto $port ($service): ${GREEN}✅ Disponible${NC}"
        return 0
    fi
}

check_port 5433 "PostgreSQL Test"
check_port 6380 "Redis Test"
check_port 3011 "Service Registry Test"
check_port 8002 "Gateway Test"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ¡TODO LISTO!${NC}"
    echo ""
    echo "Tu entorno de testing está completamente configurado."
    echo ""
    echo "Próximos pasos:"
    echo "  1. Ejecuta: ./test-quickstart.sh"
    echo "  2. O ejecuta: make test"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIAS: $WARNINGS${NC}"
    echo ""
    echo "El entorno está configurado pero hay algunas advertencias."
    echo "Puedes continuar, pero revisa los mensajes arriba."
    echo ""
    echo "Para ejecutar tests: ./test-quickstart.sh o make test"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ERRORES ENCONTRADOS: $ERRORS${NC}"
    echo -e "${YELLOW}⚠️  ADVERTENCIAS: $WARNINGS${NC}"
    echo ""
    echo "Por favor corrige los errores antes de ejecutar tests."
    echo ""
    
    if [ $ERRORS -gt 0 ]; then
        echo "Soluciones comunes:"
        echo "  - Instalar Docker: https://docs.docker.com/get-docker/"
        echo "  - Instalar Docker Compose: https://docs.docker.com/compose/install/"
        echo "  - Instalar Make: apt-get install make (Linux) o brew install make (Mac)"
        echo "  - Ejecutar chmod +x *.sh para dar permisos a los scripts"
    fi
    
    echo ""
    exit 1
fi
