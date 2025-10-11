#!/bin/bash

echo "🧪 Probando respuesta del NLP Service..."
echo ""

# Hacer una consulta simple al NLP service
RESPONSE=$(curl -s -X POST http://localhost:3004/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"query": "¿Cuántas personas hay?"}')

echo "📊 Respuesta completa:"
echo "$RESPONSE" | jq '.'

echo ""
echo "📝 Campo 'markdown' específicamente:"
echo "$RESPONSE" | jq -r '.data.markdown'

echo ""
echo "✅ Estructura de la respuesta:"
echo "$RESPONSE" | jq 'keys'
echo ""
echo "📦 Estructura de 'data':"
echo "$RESPONSE" | jq '.data | keys'
