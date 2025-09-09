# PowerShell script para gestionar el sistema de personas con React
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("help", "dev", "prod", "build", "down", "logs", "clean", "test", "legacy")]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "🚀 Sistema de Gestión de Personas - React Frontend" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  📦 DESARROLLO:" -ForegroundColor Green
    Write-Host "    .\start.ps1 dev     - Iniciar en modo desarrollo (React + Hot Reload)"
    Write-Host "    .\start.ps1 legacy  - Iniciar con frontend Flask (modo legacy)"
    Write-Host ""
    Write-Host "  🏭 PRODUCCIÓN:" -ForegroundColor Blue
    Write-Host "    .\start.ps1 prod    - Iniciar en modo producción (React optimizado)"
    Write-Host "    .\start.ps1 build   - Construir todas las imágenes Docker"
    Write-Host ""
    Write-Host "  🔧 MANTENIMIENTO:" -ForegroundColor Magenta
    Write-Host "    .\start.ps1 down    - Detener todos los servicios"
    Write-Host "    .\start.ps1 logs    - Mostrar logs de todos los servicios"
    Write-Host "    .\start.ps1 clean   - Limpiar contenedores y volúmenes"
    Write-Host "    .\start.ps1 test    - Ejecutar tests"
    Write-Host ""
    Write-Host "  📋 ACCESO:" -ForegroundColor White
    Write-Host "    React App (dev):  http://localhost:5173" -ForegroundColor Gray
    Write-Host "    React App (prod): http://localhost" -ForegroundColor Gray
    Write-Host "    Flask App:        http://localhost:5000" -ForegroundColor Gray
    Write-Host "    API Gateway:      http://localhost:8001" -ForegroundColor Gray
    Write-Host ""
}

function Start-Development {
    Write-Host "🔧 Iniciando servicios en modo desarrollo..." -ForegroundColor Yellow
    Write-Host "   - React con Hot Reload en puerto 5173" -ForegroundColor Gray
    Write-Host "   - API Gateway en puerto 8001" -ForegroundColor Gray
    Write-Host ""
    
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Servicios iniciados correctamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Accede a la aplicación React en: http://localhost:5173" -ForegroundColor Cyan
        Write-Host "🔌 API Gateway disponible en: http://localhost:8001" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para ver los logs: .\start.ps1 logs" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    }
}

function Start-Production {
    Write-Host "🏭 Iniciando servicios en modo producción..." -ForegroundColor Blue
    Write-Host "   - React optimizado en puerto 80" -ForegroundColor Gray
    Write-Host ""
    
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Servicios iniciados correctamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Accede a la aplicación en: http://localhost" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para ver los logs: .\start.ps1 logs" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    }
}

function Start-Legacy {
    Write-Host "🔄 Iniciando con frontend Flask (modo legacy)..." -ForegroundColor Magenta
    
    # Temporary modification to enable Flask frontend
    $content = Get-Content docker-compose.yml -Raw
    $content = $content -replace '# frontend:', 'frontend:'
    $content = $content -replace 'frontend-react:', '# frontend-react:'
    Set-Content docker-compose.yml -Value $content
    
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Servicios iniciados en modo legacy" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Accede a la aplicación Flask en: http://localhost:5000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Para volver a React, ejecuta: .\start.ps1 prod" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    }
}

function Build-Images {
    Write-Host "📦 Construyendo imágenes Docker..." -ForegroundColor Yellow
    
    docker-compose build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Imágenes construidas correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al construir las imágenes" -ForegroundColor Red
    }
}

function Stop-Services {
    Write-Host "🛑 Deteniendo todos los servicios..." -ForegroundColor Yellow
    
    docker-compose down
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
    
    Write-Host "✅ Servicios detenidos" -ForegroundColor Green
}

function Show-Logs {
    Write-Host "📋 Mostrando logs de todos los servicios..." -ForegroundColor Yellow
    Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Gray
    Write-Host ""
    
    # Try development first, then production
    $containers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "_dev$" }
    if ($containers) {
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    } else {
        docker-compose logs -f
    }
}

function Clean-Everything {
    Write-Host "🧹 Limpiando contenedores y volúmenes..." -ForegroundColor Yellow
    
    docker-compose down -v
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
    
    # Remove dangling images
    $danglingImages = docker images -f "dangling=true" -q
    if ($danglingImages) {
        docker rmi $danglingImages
    }
    
    Write-Host "✅ Limpieza completada" -ForegroundColor Green
}

function Run-Tests {
    Write-Host "🧪 Ejecutando tests..." -ForegroundColor Yellow
    
    # Frontend React tests
    if (Test-Path "frontend-react\package.json") {
        Write-Host "   Ejecutando tests de React..." -ForegroundColor Gray
        Set-Location frontend-react
        npm test -- --watchAll=false
        Set-Location ..
    }
    
    # Backend tests would go here
    Write-Host "✅ Tests completados" -ForegroundColor Green
}

# Main execution
switch ($Command) {
    "help" { Show-Help }
    "dev" { Start-Development }
    "prod" { Start-Production }
    "legacy" { Start-Legacy }
    "build" { Build-Images }
    "down" { Stop-Services }
    "logs" { Show-Logs }
    "clean" { Clean-Everything }
    "test" { Run-Tests }
    default { Show-Help }
}
