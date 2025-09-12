# Inicialización del Frontend Next.js

# 1. Asegurar que estás en el directorio del frontend
Write-Host "🚀 Iniciando configuración del Frontend Next.js..." -ForegroundColor Green

# 2. Verificar si está en el directorio correcto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio frontend-react" -ForegroundColor Red
    exit 1
}

# 3. Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
} else {
    Write-Host "❌ Error: No se encontró npm o pnpm instalado" -ForegroundColor Red
    exit 1
}

# 4. Verificar archivo de entorno
if (!(Test-Path ".env.local")) {
    Write-Host "⚙️ Creando archivo .env.local..." -ForegroundColor Yellow
    Copy-Item "../.env.example" ".env.local"
    Write-Host "✅ Archivo .env.local creado. Por favor, configura tus variables de entorno." -ForegroundColor Green
}

# 5. Ejecutar desarrollo
Write-Host "🔄 Iniciando servidor de desarrollo..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm dev
} else {
    npm run dev
}
