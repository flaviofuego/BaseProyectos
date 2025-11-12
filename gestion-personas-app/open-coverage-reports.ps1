# Script PowerShell para abrir reportes de cobertura
# Uso: .\open-coverage-reports.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Abriendo Reportes de Cobertura" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = $PSScriptRoot

$authCoverageReport = "$baseDir\services\auth\coverage\lcov-report\index.html"
$personasCoverageReport = "$baseDir\services\personas\coverage\lcov-report\index.html"

# Verificar y abrir reporte de Auth Service
if (Test-Path $authCoverageReport) {
    Write-Host "✅ Abriendo reporte de Auth Service..." -ForegroundColor Green
    Start-Process $authCoverageReport
} else {
    Write-Host "❌ Reporte de Auth Service no encontrado." -ForegroundColor Red
    Write-Host "   Ejecuta primero: cd services\auth && npm test" -ForegroundColor Yellow
}

Write-Host ""

# Verificar y abrir reporte de Personas Service
if (Test-Path $personasCoverageReport) {
    Write-Host "✅ Abriendo reporte de Personas Service..." -ForegroundColor Green
    Start-Process $personasCoverageReport
} else {
    Write-Host "❌ Reporte de Personas Service no encontrado." -ForegroundColor Red
    Write-Host "   Ejecuta primero: cd services\personas && npm test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "ℹ️  Los reportes se abrirán en tu navegador predeterminado." -ForegroundColor Cyan
Write-Host ""
