# Iniciar servicios en modo desarrollo
Write-Host "🚀 Iniciando servicios en modo desarrollo..." -ForegroundColor Green
Write-Host "⚡ Con hot reload activado" -ForegroundColor Yellow

docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Servicios iniciados correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Acceso a la aplicación:" -ForegroundColor Cyan
    Write-Host "   Frontend:     http://localhost:5000" -ForegroundColor White
    Write-Host "   API Gateway:  http://localhost:8001" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Servicios de desarrollo:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL:   localhost:5432" -ForegroundColor White
    Write-Host "   Redis:        localhost:6379" -ForegroundColor White
    Write-Host "   Qdrant:       http://localhost:6333" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Comandos útiles:" -ForegroundColor Cyan
    Write-Host "   Ver logs:     .\logs.ps1" -ForegroundColor White
    Write-Host "   Detener:      .\stop.ps1" -ForegroundColor White
    Write-Host "   Estado:       .\status.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Los cambios en el código se reflejarán automáticamente!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    Write-Host "Revisa los logs para más detalles:" -ForegroundColor Yellow
    Write-Host "docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs" -ForegroundColor White
}
