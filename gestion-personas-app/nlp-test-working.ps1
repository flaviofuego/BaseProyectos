# Script de pruebas simple para NLP
# Uso: .\nlp-test-working.ps1

Write-Host "🚀 Pruebas Rápidas del Sistema NLP" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

Write-Host "`n1. 🔍 Verificando estado de servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

Write-Host "`n2. 🧪 Probando consulta simple..." -ForegroundColor Yellow
docker exec nlp_service_dev node -e "const axios = require('axios'); (async () => { try { const r = await axios.post('http://localhost:3004/query', { pregunta: 'cuantas personas hay' }); console.log('Respuesta:', r.data.respuesta); } catch (e) { console.error('Error:', e.message); } })()"

Write-Host "`n3. 🔍 Probando búsqueda por nombre..." -ForegroundColor Yellow  
docker exec nlp_service_dev node -e "const axios = require('axios'); (async () => { try { const r = await axios.post('http://localhost:3004/query', { pregunta: 'personas que empiecen con F' }); console.log('Respuesta:', r.data.respuesta); } catch (e) { console.error('Error:', e.message); } })()"

Write-Host "`n4. 📊 Probando estadísticas..." -ForegroundColor Yellow
docker exec nlp_service_dev node -e "const axios = require('axios'); (async () => { try { const r = await axios.post('http://localhost:3004/query', { pregunta: 'dame estadisticas' }); console.log('Respuesta:', r.data.respuesta); } catch (e) { console.error('Error:', e.message); } })()"

Write-Host "`n5. 🔑 Verificando Gemini..." -ForegroundColor Yellow
docker exec nlp_service_dev node test-gemini.js

Write-Host "`n✅ Pruebas completadas!" -ForegroundColor Green
Write-Host "`n💡 Para pruebas manuales, usa estos comandos:" -ForegroundColor Cyan
Write-Host "docker exec nlp_service_dev node -e `"[TU_CODIGO_JS]`""
Write-Host "`nEjemplo:"
Write-Host "docker exec nlp_service_dev node -e `"const axios = require('axios'); (async () => { const r = await axios.post('http://localhost:3004/query', { pregunta: 'tu pregunta aqui' }); console.log(r.data.respuesta); })()`""
