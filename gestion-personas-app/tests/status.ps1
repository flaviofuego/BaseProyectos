# Ver estado de los servicios
Write-Host "Estado de los servicios:" -ForegroundColor Cyan
Write-Host ""

docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "Uso de recursos:" -ForegroundColor Cyan
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
