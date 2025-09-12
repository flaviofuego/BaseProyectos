# Deployment Script para Frontend Next.js

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod", "build", "clean")]
    [string]$Mode = "dev"
)

Write-Host "🚀 Frontend Next.js Deployment Script" -ForegroundColor Green
Write-Host "Modo: $Mode" -ForegroundColor Yellow

switch ($Mode) {
    "dev" {
        Write-Host "🔄 Iniciando desarrollo..." -ForegroundColor Yellow
        
        # Verificar dependencias
        if (!(Test-Path "node_modules")) {
            Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                pnpm install
            } else {
                npm install
            }
        }
        
        # Verificar variables de entorno
        if (!(Test-Path ".env.local")) {
            Write-Host "⚙️ Creando .env.local..." -ForegroundColor Yellow
            Copy-Item "../.env.example" ".env.local"
            Write-Host "✅ Configurar variables en .env.local" -ForegroundColor Green
        }
        
        # Iniciar desarrollo
        Write-Host "🌐 Iniciando servidor en http://localhost:3000" -ForegroundColor Green
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm dev
        } else {
            npm run dev
        }
    }
    
    "prod" {
        Write-Host "🏗️ Construyendo para producción..." -ForegroundColor Yellow
        
        # Build
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm build
            Write-Host "🌐 Iniciando servidor de producción..." -ForegroundColor Green
            pnpm start
        } else {
            npm run build
            Write-Host "🌐 Iniciando servidor de producción..." -ForegroundColor Green
            npm start
        }
    }
    
    "build" {
        Write-Host "🏗️ Solo construyendo..." -ForegroundColor Yellow
        
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm build
        } else {
            npm run build
        }
        
        Write-Host "✅ Build completado" -ForegroundColor Green
    }
    
    "clean" {
        Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Yellow
        
        # Eliminar directorios temporales
        $directories = @(".next", "node_modules", ".pnpm-store")
        foreach ($dir in $directories) {
            if (Test-Path $dir) {
                Write-Host "🗑️ Eliminando $dir..." -ForegroundColor Red
                Remove-Item $dir -Recurse -Force
            }
        }
        
        # Eliminar archivos temporales
        $files = @("*.log", ".env.local")
        foreach ($file in $files) {
            if (Test-Path $file) {
                Write-Host "🗑️ Eliminando $file..." -ForegroundColor Red
                Remove-Item $file -Force
            }
        }
        
        Write-Host "✅ Limpieza completada" -ForegroundColor Green
    }
}

Write-Host "`n🎉 Proceso completado!" -ForegroundColor Green
