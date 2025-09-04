# Ver logs de desarrollo
param(
    [string]$Service = ""
)

Write-Host "📋 Mostrando logs de desarrollo..." -ForegroundColor Green

if ($Service -eq "") {
    Write-Host "Ver logs de todos los servicios..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
} else {
    Write-Host "Ver logs del servicio: $Service" -ForegroundColor Yellow
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f $Service
}

# Uso:
# .\logs.ps1              # Ver todos los logs
# .\logs.ps1 gateway      # Ver solo logs del gateway
# .\logs.ps1 frontend     # Ver solo logs del frontend
