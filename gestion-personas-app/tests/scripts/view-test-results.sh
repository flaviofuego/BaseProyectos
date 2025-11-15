#!/bin/bash

# Script para abrir los reportes de tests en el navegador

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST RESULTS VIEWER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si existe el directorio de resultados
if [ ! -d "tests/results" ]; then
    echo -e "${YELLOW}❌ No test results found.${NC}"
    echo -e "${YELLOW}Run 'make test' first to generate test results.${NC}"
    exit 1
fi

# Función para abrir en navegador
open_in_browser() {
    local file=$1
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Opening: $file${NC}"
        
        # Detectar sistema operativo y abrir
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            open "$file"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if [ -n "$BROWSER" ]; then
                "$BROWSER" "$file"
            elif command -v xdg-open > /dev/null; then
                xdg-open "$file"
            else
                echo -e "${YELLOW}⚠️  Cannot detect browser. Please open manually: $file${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Unsupported OS. Please open manually: $file${NC}"
        fi
    else
        echo -e "${YELLOW}❌ File not found: $file${NC}"
    fi
}

# Menú interactivo
echo "Available Reports:"
echo ""
echo "1) 📋 Consolidated Report (All Services)"
echo "2) 📊 Python Coverage Report"
echo "3) 📊 Auth Service Coverage"
echo "4) 📊 Personas Service Coverage"
echo "5) 📊 All Coverage Reports"
echo "6) 🎭 Playwright E2E Report"
echo "7) 📁 Show all available files"
echo "8) 🚪 Exit"
echo ""
read -p "Select option [1-8]: " option

case $option in
    1)
        open_in_browser "tests/results/index.html"
        ;;
    2)
        open_in_browser "tests/results/coverage-python/index.html"
        ;;
    3)
        open_in_browser "tests/results/coverage/auth/index.html"
        ;;
    4)
        open_in_browser "tests/results/coverage/personas/index.html"
        ;;
    5)
        echo -e "${BLUE}Opening all coverage reports...${NC}"
        for coverage in tests/results/coverage/*/index.html; do
            if [ -f "$coverage" ]; then
                open_in_browser "$coverage"
                sleep 1
            fi
        done
        open_in_browser "tests/results/coverage-python/index.html"
        ;;
    6)
        open_in_browser "tests/results/playwright-report/index.html"
        ;;
    7)
        echo ""
        echo "📁 Available files in tests/results/:"
        echo ""
        find tests/results -type f \( -name "*.html" -o -name "*.xml" -o -name "*.json" \) | sort
        echo ""
        ;;
    8)
        echo "Bye! 👋"
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done! ✨${NC}"
echo ""
