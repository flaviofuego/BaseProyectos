# Script PowerShell para ejecutar todos los tests
# Uso: .\run-all-tests.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ejecutando Tests - Sistema Gestión" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$baseDir = $PSScriptRoot

# Función para mostrar resultados
function Show-TestResult {
    param (
        [string]$ServiceName,
        [int]$ExitCode
    )
    
    if ($ExitCode -eq 0) {
        Write-Host "✅ $ServiceName - PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ $ServiceName - FAILED" -ForegroundColor Red
    }
}

# ====================
# Auth Service Tests
# ====================
Write-Host "🔐 Ejecutando tests de Auth Service..." -ForegroundColor Yellow
Write-Host ""

Push-Location "$baseDir\services\auth"

# Verificar si existen node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias de Auth Service..." -ForegroundColor Cyan
    npm install
}

# Ejecutar tests
Write-Host "🧪 Corriendo tests..." -ForegroundColor Cyan
npm test -- --coverage --verbose
$authExitCode = $LASTEXITCODE

Pop-Location

Write-Host ""
Show-TestResult "Auth Service" $authExitCode
Write-Host ""

# ====================
# Personas Service Tests
# ====================
Write-Host "👥 Ejecutando tests de Personas Service..." -ForegroundColor Yellow
Write-Host ""

Push-Location "$baseDir\services\personas"

# Verificar si existen node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias de Personas Service..." -ForegroundColor Cyan
    npm install
}

# Ejecutar tests
Write-Host "🧪 Corriendo tests..." -ForegroundColor Cyan
npm test -- --coverage --verbose
$personasExitCode = $LASTEXITCODE

Pop-Location

Write-Host ""
Show-TestResult "Personas Service" $personasExitCode
Write-Host ""

# ====================
# Resumen Final
# ====================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Show-TestResult "Auth Service" $authExitCode
Show-TestResult "Personas Service" $personasExitCode

Write-Host ""

# Calcular resultado global
if ($authExitCode -eq 0 -and $personasExitCode -eq 0) {
    Write-Host "🎉 ¡Todos los tests pasaron exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Para ver reportes de cobertura:" -ForegroundColor Cyan
    Write-Host "   - Auth: services\auth\coverage\lcov-report\index.html" -ForegroundColor White
    Write-Host "   - Personas: services\personas\coverage\lcov-report\index.html" -ForegroundColor White
    exit 0
} else {
    Write-Host "⚠️  Algunos tests fallaron. Revisa los logs arriba." -ForegroundColor Red
    exit 1
}
