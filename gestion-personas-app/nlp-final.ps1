# Script de pruebas mejorado para el sistema NLP
# Uso: .\nlp-final.ps1

Write-Host "🚀 Sistema de Pruebas NLP + RAG - Versión Final" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

function Show-Menu {
    Write-Host "`n📋 Opciones disponibles:" -ForegroundColor Cyan
    Write-Host "1. Ver estado de servicios"
    Write-Host "2. Ejecutar batería de pruebas automáticas"
    Write-Host "3. Consulta personalizada"
    Write-Host "4. Verificar Gemini API"
    Write-Host "5. Sincronizar embeddings"
    Write-Host "6. Ver logs NLP"
    Write-Host "7. Salir"
    Write-Host ""
}

do {
    Show-Menu
    $option = Read-Host "Selecciona una opción (1-7)"
    
    switch ($option) {
        "1" {
            Write-Host "`n🔍 Estado de servicios:" -ForegroundColor Yellow
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
        }
        
        "2" {
            Write-Host "`n🧪 Ejecutando batería de pruebas..." -ForegroundColor Yellow
            docker exec nlp_service_dev node test-queries.js
        }
        
        "3" {
            $pregunta = Read-Host "`nIngresa tu consulta"
            Write-Host "`n🔍 Procesando consulta..." -ForegroundColor Yellow
            docker exec nlp_service_dev node -e "const axios = require('axios'); (async () => { try { const r = await axios.post('http://localhost:3004/query', { pregunta: '$pregunta' }); console.log('Respuesta:', r.data.respuesta); console.log('Intent:', r.data.metadata.intent.intent); } catch (e) { console.error('Error:', e.message); } })()"
        }
        
        "4" {
            Write-Host "`n🔑 Verificando Gemini API..." -ForegroundColor Yellow
            docker exec nlp_service_dev node test-gemini.js
        }
        
        "5" {
            Write-Host "`n🔄 Sincronizando embeddings..." -ForegroundColor Yellow
            docker exec nlp_service_dev node -e "const axios = require('axios'); axios.post('http://localhost:3004/sync-embeddings').then(r => console.log('Completado:', r.data)).catch(e => console.error('Error:', e.message))"
        }
        
        "6" {
            Write-Host "`n📋 Logs del servicio NLP:" -ForegroundColor Yellow
            docker logs nlp_service_dev --tail 15
        }
        
        "7" {
            Write-Host "`n👋 ¡Hasta luego!" -ForegroundColor Green
            break
        }
        
        default {
            Write-Host "`n❌ Opción no válida. Selecciona 1-7." -ForegroundColor Red
        }
    }
    
    if ($option -ne "7") {
        Read-Host "`nPresiona Enter para continuar..."
    }
    
} while ($option -ne "7")

Write-Host "`n📚 Documentación disponible:" -ForegroundColor Cyan
Write-Host "  - DIAGNOSTICO-NLP.md" 
Write-Host "  - README-DEV.md"
