# Script SIMPLE de pruebas NLP
Write-Host "🚀 Pruebas del Sistema NLP" -ForegroundColor Green

Write-Host "`n1. Estado de servicios:" -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

Write-Host "`n2. Ejecutando pruebas automáticas:" -ForegroundColor Yellow
docker exec nlp_service_dev node test-queries.js

Write-Host "`n3. Verificando Gemini:" -ForegroundColor Yellow
docker exec nlp_service_dev node test-gemini.js

Write-Host "`n✅ Pruebas completadas!" -ForegroundColor Green
Write-Host "Para consultas manuales usa:" -ForegroundColor Cyan
Write-Host "docker exec nlp_service_dev node test-queries.js"
