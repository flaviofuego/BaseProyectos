#!/bin/bash

# Script para probar el servicio NLP localmente
# Asegúrate de tener el servicio corriendo antes de ejecutar este script

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NLP_URL="${NLP_SERVICE_URL:-http://localhost:3004}"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pruebas del Servicio NLP v2.0                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "URL del servicio: ${YELLOW}$NLP_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}1. Health Check${NC}"
HEALTH=$(curl -s "$NLP_URL/health")
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" == "healthy" ]; then
    echo -e "${GREEN}✅ Servicio saludable${NC}"
    echo $HEALTH | jq '.dependencies'
else
    echo -e "${RED}❌ Servicio no saludable${NC}"
    echo $HEALTH | jq '.'
fi

echo ""

# Test 2: Stats
echo -e "${BLUE}2. Estadísticas${NC}"
STATS=$(curl -s "$NLP_URL/stats")
echo $STATS | jq '{
    total_personas: .stats.database.total_personas,
    total_embeddings: .stats.embeddings.total_embeddings,
    version: .stats.service.version
}'

echo ""

# Test 3: Query básica
echo -e "${BLUE}3. Query Básica${NC}"
echo -e "Enviando: '¿Cuántas personas hay registradas?'"

QUERY_RESULT=$(curl -s -X POST "$NLP_URL/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cuántas personas hay registradas?"}')

SUCCESS=$(echo $QUERY_RESULT | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
    echo -e "${GREEN}✅ Query procesada exitosamente${NC}"
    echo $QUERY_RESULT | jq '{
        intent: .metadata.intent,
        results_count: .metadata.results_count,
        processing_time_ms: .metadata.processing_time_ms
    }'
    echo ""
    echo -e "${YELLOW}Respuesta Markdown (primeras líneas):${NC}"
    echo $QUERY_RESULT | jq -r '.data.markdown' | head -n 5
else
    echo -e "${RED}❌ Query falló${NC}"
    echo $QUERY_RESULT | jq '.error'
fi

echo ""
echo -e "${GREEN}Pruebas completadas${NC}"
