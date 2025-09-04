# Iniciar en modo producción
Write-Host "🚀 Iniciando servicios en modo producción..." -ForegroundColor Green

docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Servicios iniciados en modo producción!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Acceso a la aplicación:" -ForegroundColor Cyan
    Write-Host "   Frontend:     http://localhost:5000" -ForegroundColor White
    Write-Host "   API Gateway:  http://localhost:8001" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  En modo producción no hay hot reload" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
}
