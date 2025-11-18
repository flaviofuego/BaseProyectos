#!/bin/bash

# Quick start script para el entorno de testing

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 GESTION PERSONAS - TEST QUICK START"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    exit 1
fi

echo -e "${BLUE}✅ Docker y Docker Compose detectados${NC}"
echo ""

# Menú de opciones
echo "Selecciona una opción:"
echo ""
echo "1) 🚀 Ejecutar TODOS los tests (recomendado)"
echo "2) 🏗️  Solo construir el entorno de testing"
echo "3) ⚡ Tests unitarios (rápido)"
echo "4) 🔗 Tests de integración"
echo "5) 🎭 Tests end-to-end"
echo "6) 🐍 Tests de frontend (Python)"
echo "7) 📊 Generar reporte de cobertura"
echo "8) 👀 Watch mode (desarrollo)"
echo "9) 🧹 Limpiar todo y empezar de cero"
echo "10) 📋 Ver resultados de tests anteriores"
echo "11) 🚪 Salir"
echo ""
read -p "Opción [1-11]: " option

case $option in
    1)
        echo ""
        echo -e "${GREEN}🧪 Ejecutando TODOS los tests...${NC}"
        echo ""
        make test
        echo ""
        echo -e "${GREEN}✅ Tests completados!${NC}"
        echo ""
        echo "📊 Para ver los resultados, ejecuta:"
        echo "   ./view-tests/results.sh"
        echo "   o"
        echo "   make tests/results"
        ;;
    2)
        echo ""
        echo -e "${BLUE}🏗️  Construyendo entorno de testing...${NC}"
        echo ""
        make test-build
        echo ""
        echo -e "${GREEN}✅ Entorno construido!${NC}"
        echo ""
        echo "Para ejecutar tests, usa:"
        echo "   make test"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}⚡ Ejecutando tests unitarios...${NC}"
        echo ""
        make test-unit
        ;;
    4)
        echo ""
        echo -e "${YELLOW}🔗 Ejecutando tests de integración...${NC}"
        echo ""
        make test-integration
        ;;
    5)
        echo ""
        echo -e "${YELLOW}🎭 Ejecutando tests E2E...${NC}"
        echo ""
        make test-e2e
        ;;
    6)
        echo ""
        echo -e "${YELLOW}🐍 Ejecutando tests de frontend...${NC}"
        echo ""
        make test-frontend
        ;;
    7)
        echo ""
        echo -e "${BLUE}📊 Generando reporte de cobertura...${NC}"
        echo ""
        make test-coverage
        echo ""
        echo -e "${GREEN}✅ Reporte generado!${NC}"
        echo "Abre: tests/results/coverage/index.html"
        ;;
    8)
        echo ""
        echo -e "${BLUE}👀 Modo watch activado${NC}"
        echo -e "${YELLOW}Los tests se re-ejecutarán automáticamente al modificar archivos${NC}"
        echo -e "${YELLOW}Presiona Ctrl+C para detener${NC}"
        echo ""
        make test-watch
        ;;
    9)
        echo ""
        echo -e "${RED}🧹 Limpiando todo...${NC}"
        read -p "¿Estás seguro? Esto eliminará todos los contenedores y volúmenes de test [y/N]: " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            make test-clean
            echo ""
            echo -e "${GREEN}✅ Limpieza completada!${NC}"
        else
            echo "Operación cancelada"
        fi
        ;;
    10)
        echo ""
        if [ -d "tests/results" ]; then
            ./view-tests/results.sh
        else
            echo -e "${YELLOW}❌ No hay resultados previos${NC}"
            echo "Ejecuta 'make test' primero"
        fi
        ;;
    11)
        echo "👋 Adiós!"
        exit 0
        ;;
    *)
        echo -e "${RED}Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
