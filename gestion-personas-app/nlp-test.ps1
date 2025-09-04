# Script de pruebas para el sistema NLP y RAG
# Uso: .\nlp-test.ps1

Write-Host "🚀 Sistema de Pruebas NLP + RAG" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Función para mostrar menú
function Show-Menu {
    Write-Host "`n📋 Opciones disponibles:" -ForegroundColor Cyan
    Write-Host "1. Verificar estado de todos los servicios"
    Write-Host "2. Probar consulta NLP simple"
    Write-Host "3. Probar búsqueda semántica"
    Write-Host "4. Sincronizar embeddings"
    Write-Host "5. Ver logs del servicio NLP"
    Write-Host "6. Prueba completa del sistema"
    Write-Host "7. Verificar conectividad con Gemini"
    Write-Host "8. Salir"
    Write-Host ""
}

# Función para probar consulta NLP
function Test-NLPQuery {
    param([string]$pregunta)
    
    Write-Host "🧪 Probando consulta: '$pregunta'" -ForegroundColor Yellow
    
    try {
        # Crear archivo temporal JavaScript
        $tempJs = @"
const axios = require('axios');
(async () => {
  try {
    const response = await axios.post('http://localhost:3004/query', {
      pregunta: '$pregunta'
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();
"@
        
        $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
        $tempJs | Out-File -FilePath $tempFile -Encoding UTF8
        
        $response = docker exec nlp_service_dev node /tmp/test-query.js 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Resultado:" -ForegroundColor Green
            Write-Host $response
        } else {
            Write-Host "❌ Error en la consulta" -ForegroundColor Red
            Write-Host $response
        }
        
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "❌ Error ejecutando consulta: $_" -ForegroundColor Red
    }
}

# Bucle principal
do {
    Show-Menu
    $option = Read-Host "Selecciona una opción (1-8)"
    
    switch ($option) {
        "1" {
            Write-Host "`n🔍 Verificando estado de servicios..." -ForegroundColor Yellow
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
        }
        
        "2" {
            $pregunta = Read-Host "`nIngresa tu pregunta"
            Test-NLPQuery $pregunta
        }
        
        "3" {
            Write-Host "`n🔍 Probando búsqueda semántica..." -ForegroundColor Yellow
            Test-NLPQuery "busca personas jóvenes"
        }
        
        "4" {
            Write-Host "`n🔄 Sincronizando embeddings..." -ForegroundColor Yellow
            $syncCode = @"
const axios = require('axios');
axios.post('http://localhost:3004/sync-embeddings')
  .then(r => console.log('✅ Sincronización exitosa:', r.data))
  .catch(e => console.error('❌ Error:', e.response?.data || e.message));
"@
            docker exec nlp_service_dev node -e $syncCode
        }
        
        "5" {
            Write-Host "`n📋 Logs del servicio NLP:" -ForegroundColor Yellow
            docker logs nlp_service_dev --tail 20
        }
        
        "6" {
            Write-Host "`n🧪 Ejecutando prueba completa..." -ForegroundColor Yellow
            Write-Host "`n1. Verificando personas más joven:"
            Test-NLPQuery "quien es la persona más joven"
            
            Write-Host "`n2. Contando personas:"
            Test-NLPQuery "cuántas personas hay registradas"
            
            Write-Host "`n3. Búsqueda por nombre:"
            Test-NLPQuery "personas que empiecen con F"
            
            Write-Host "`n4. Estadísticas generales:"
            Test-NLPQuery "dame estadísticas del sistema"
        }
        
        "7" {
            Write-Host "`n🔑 Verificando conectividad con Gemini..." -ForegroundColor Yellow
            docker exec nlp_service_dev node test-gemini.js
        }
        
        "8" {
            Write-Host "`n👋 ¡Hasta luego!" -ForegroundColor Green
            break
        }
        
        default {
            Write-Host "`n❌ Opción no válida. Por favor selecciona 1-8." -ForegroundColor Red
        }
    }
    
    if ($option -ne "8") {
        Read-Host "`nPresiona Enter para continuar..."
    }
    
} while ($option -ne "8")

Write-Host "`n📚 Para más información, revisa:" -ForegroundColor Cyan
Write-Host "  - DIAGNOSTICO-NLP.md"
Write-Host "  - README-DEV.md"
