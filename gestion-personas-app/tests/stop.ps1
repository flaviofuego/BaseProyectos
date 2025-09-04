# Detener servicios de desarrollo
Write-Host "🛑 Deteniendo servicios de desarrollo..." -ForegroundColor Red

docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Servicios detenidos correctamente." -ForegroundColor Green
} else {
    Write-Host "❌ Error al detener los servicios." -ForegroundColor Red
}

Write-Host ""
Write-Host "Para volver a iniciar en modo desarrollo:" -ForegroundColor Yellow
Write-Host ".\dev.ps1" -ForegroundColor White
