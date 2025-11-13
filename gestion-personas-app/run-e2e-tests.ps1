# Script para ejecutar tests E2E
# Uso: .\run-e2e-tests.ps1 [opciones]

param(
    [string]$Suite = "all",     # all, registro, login, crear, consultar, actualizar, eliminar, nlp
    [switch]$UI,                # Abrir interfaz visual
    [switch]$Debug,             # Modo debug
    [switch]$Headed,            # Ver navegador
    [switch]$Report             # Ver reporte
)

$ErrorActionPreference = "Stop"
$E2EDir = "tests\e2e"

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "Error: Ejecutar desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar que Docker Compose está corriendo
Write-Host "`nVerificando que Docker Compose está corriendo..." -ForegroundColor Cyan
$containers = docker compose ps --services --filter "status=running" 2>$null
if (-not $containers -or $containers.Count -eq 0) {
    Write-Host "ADVERTENCIA: Docker Compose no está corriendo. Iniciando..." -ForegroundColor Yellow
    docker compose up -d
    Start-Sleep -Seconds 5
}

# Verificar que la app responde
Write-Host "Verificando que la app está disponible..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001" -TimeoutSec 5 -UseBasicParsing
    Write-Host "OK: App disponible en http://localhost:5001" -ForegroundColor Green
} catch {
    Write-Host "ERROR: App no responde en http://localhost:5001" -ForegroundColor Red
    Write-Host "   Verificar que Docker Compose está corriendo correctamente" -ForegroundColor Yellow
    exit 1
}

# Cambiar a directorio E2E
Set-Location $E2EDir

# Verificar instalación
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Cyan
    npm install
    npx playwright install chromium
}

Write-Host "`nEjecutando tests E2E..." -ForegroundColor Green

# Determinar comando según opciones
$cmd = "npx playwright test"

# Seleccionar suite
switch ($Suite) {
    "registro" { $cmd += " specs/01-registro.spec.js" }
    "login" { $cmd += " specs/02-login.spec.js" }
    "crear" { $cmd += " specs/03-crear-persona.spec.js" }
    "consultar" { $cmd += " specs/04-consultar-personas.spec.js" }
    "actualizar" { $cmd += " specs/05-actualizar-persona.spec.js" }
    "eliminar" { $cmd += " specs/06-eliminar-persona.spec.js" }
    "nlp" { $cmd += " specs/07-consulta-nlp.spec.js" }
    "all" { }  # Sin filtro, ejecuta todos
    default {
        Write-Host "Suite desconocida: $Suite" -ForegroundColor Red
        Write-Host "Opciones: all, registro, login, crear, consultar, actualizar, eliminar, nlp" -ForegroundColor Yellow
        exit 1
    }
}

# Opciones adicionales
if ($UI) {
    $cmd = "npx playwright test --ui"
}
elseif ($Debug) {
    $cmd += " --debug"
}
elseif ($Headed) {
    $cmd += " --headed"
}
elseif ($Report) {
    $cmd = "npx playwright show-report"
}

Write-Host "Ejecutando: $cmd`n" -ForegroundColor Gray

# Ejecutar
Invoke-Expression $cmd

# Volver a raíz
Set-Location ..\..

Write-Host "`nTests E2E completados" -ForegroundColor Green
Write-Host "Ver reporte HTML: cd tests\\e2e; npm run test:report" -ForegroundColor Cyan
