#!/bin/bash
set -e

echo "🧪 =========================================="
echo "🧪 INICIANDO TEST RUNNER NODE.JS"
echo "🧪 =========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para ejecutar tests de un servicio
run_service_tests() {
    local service=$1
    local path=$2
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Testing: $service"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$path"
    
    # Verificar si hay tests
    if [ ! -d "tests" ] && [ ! -d "__tests__" ]; then
        echo -e "${YELLOW}⚠️  No tests found for $service${NC}"
        return 0
    fi
    
    # Ejecutar tests
    if npm run test -- --coverage --json --outputFile=/app/tests/results/$service-results.json; then
        echo -e "${GREEN}✅ $service tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $service tests failed${NC}"
        return 1
    fi
}

# Crear directorio de resultados
mkdir -p /app/tests/results/coverage

# Variable para trackear failures
FAILED_SERVICES=""

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

# Test Service Registry (si existe)
if [ -d "/app/services/registry" ]; then
    run_service_tests "Service Registry" "/app/services/registry" || FAILED_SERVICES="$FAILED_SERVICES registry"
fi

# Test Auth Service
if [ -d "/app/services/auth" ]; then
    run_service_tests "Auth Service" "/app/services/auth" || FAILED_SERVICES="$FAILED_SERVICES auth"
fi

# Test Personas Service
if [ -d "/app/services/personas" ]; then
    run_service_tests "Personas Service" "/app/services/personas" || FAILED_SERVICES="$FAILED_SERVICES personas"
fi

# Test Consulta Service
if [ -d "/app/services/consulta" ]; then
    run_service_tests "Consulta Service" "/app/services/consulta" || FAILED_SERVICES="$FAILED_SERVICES consulta"
fi

# Test NLP Service
if [ -d "/app/services/nlp" ]; then
    run_service_tests "NLP Service" "/app/services/nlp" || FAILED_SERVICES="$FAILED_SERVICES nlp"
fi

# Test Log Service
if [ -d "/app/services/log" ]; then
    run_service_tests "Log Service" "/app/services/log" || FAILED_SERVICES="$FAILED_SERVICES log"
fi

# Test Gateway
if [ -d "/app/gateway" ]; then
    run_service_tests "API Gateway" "/app/gateway" || FAILED_SERVICES="$FAILED_SERVICES gateway"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 GENERANDO REPORTE CONSOLIDADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Generar reporte HTML consolidado
cat > /app/tests/results/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Test Results - Node.js Services</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        .success { color: #4CAF50; }
        .failed { color: #f44336; }
        .warning { color: #ff9800; }
        .service { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2196F3; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Results - Node.js Services</h1>
        <p class="timestamp">Generated: $(date)</p>
        
        <h2>Summary</h2>
        <div class="service">
            <p><strong>Failed Services:</strong> ${FAILED_SERVICES:-None}</p>
            <p><strong>Results Location:</strong> /app/tests/results/</p>
        </div>
        
        <h2>Individual Reports</h2>
        <ul>
            <li><a href="./registry-results.json">Service Registry</a></li>
            <li><a href="./auth-results.json">Auth Service</a></li>
            <li><a href="./personas-results.json">Personas Service</a></li>
            <li><a href="./consulta-results.json">Consulta Service</a></li>
            <li><a href="./nlp-results.json">NLP Service</a></li>
            <li><a href="./log-results.json">Log Service</a></li>
            <li><a href="./gateway-results.json">API Gateway</a></li>
        </ul>
    </div>
</body>
</html>
EOF

echo "✅ Reporte consolidado generado en /app/tests/results/index.html"

# Resultado final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -z "$FAILED_SERVICES" ]; then
    echo -e "${GREEN}✅ TODOS LOS TESTS PASARON${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
    echo -e "${RED}Failed services: $FAILED_SERVICES${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
