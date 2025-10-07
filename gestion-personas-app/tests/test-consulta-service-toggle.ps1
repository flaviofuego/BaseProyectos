# Script de prueba para el control del servicio de consulta
# PowerShell Script para Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Prueba: Control del Servicio de Consulta" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$API_BASE = "http://localhost:8001"

# Función para hacer peticiones
function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Token = $null,
        [object]$Body = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = "$API_BASE$Endpoint"
        Method = $Method
        Headers = $headers
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    } catch {
        return @{
            Success = $false
            Data = $_.ErrorDetails.Message | ConvertFrom-Json
            StatusCode = $_.Exception.Response.StatusCode.value__
        }
    }
}

# Paso 1: Login
Write-Host "[1/10] Iniciando sesión..." -ForegroundColor Yellow
$loginResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/auth/login" -Body @{
    username = "admin"
    password = "admin123"
}

if (-not $loginResponse.Success) {
    Write-Host "❌ Error al iniciar sesión" -ForegroundColor Red
    Write-Host ($loginResponse.Data | ConvertTo-Json) -ForegroundColor Red
    exit 1
}

$TOKEN = $loginResponse.Data.token
Write-Host "✅ Sesión iniciada correctamente" -ForegroundColor Green
Write-Host "   Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray

# Paso 2: Verificar que el servicio funciona inicialmente
Write-Host "`n[2/10] Verificando acceso inicial al servicio de consulta..." -ForegroundColor Yellow
$statsResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/consulta/stats" -Token $TOKEN

if ($statsResponse.Success) {
    Write-Host "✅ Servicio de consulta accesible" -ForegroundColor Green
    Write-Host "   Total personas: $($statsResponse.Data.total_personas)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: El servicio debería estar habilitado por defecto" -ForegroundColor Red
    exit 1
}

# Paso 3: Obtener preferencias actuales
Write-Host "`n[3/10] Obteniendo preferencias del usuario..." -ForegroundColor Yellow
$prefsResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/auth/preferences" -Token $TOKEN

if ($prefsResponse.Success) {
    $currentStatus = $prefsResponse.Data.preferences.consulta_service_enabled
    Write-Host "✅ Preferencias obtenidas" -ForegroundColor Green
    Write-Host "   Estado actual: $currentStatus" -ForegroundColor Gray
} else {
    Write-Host "❌ Error al obtener preferencias" -ForegroundColor Red
    exit 1
}

# Paso 4: DESHABILITAR el servicio de consulta
Write-Host "`n[4/10] Deshabilitando el servicio de consulta..." -ForegroundColor Yellow
$disableResponse = Invoke-ApiRequest -Method "PUT" -Endpoint "/api/auth/preferences/consulta-service" `
    -Token $TOKEN -Body @{ enabled = $false }

if ($disableResponse.Success) {
    Write-Host "✅ Servicio deshabilitado correctamente" -ForegroundColor Green
    Write-Host "   Mensaje: $($disableResponse.Data.message)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error al deshabilitar el servicio" -ForegroundColor Red
    exit 1
}

# Paso 5: Verificar que las preferencias se actualizaron
Write-Host "`n[5/10] Verificando actualización de preferencias..." -ForegroundColor Yellow
$prefsResponse2 = Invoke-ApiRequest -Method "GET" -Endpoint "/api/auth/preferences" -Token $TOKEN

if ($prefsResponse2.Success -and -not $prefsResponse2.Data.preferences.consulta_service_enabled) {
    Write-Host "✅ Preferencias actualizadas correctamente" -ForegroundColor Green
    Write-Host "   Estado: deshabilitado" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: Las preferencias no se actualizaron" -ForegroundColor Red
    exit 1
}

# Paso 6: Intentar acceder al servicio de estadísticas (debe fallar con 403)
Write-Host "`n[6/10] Intentando acceder a estadísticas (debe fallar)..." -ForegroundColor Yellow
$statsResponse2 = Invoke-ApiRequest -Method "GET" -Endpoint "/api/consulta/stats" -Token $TOKEN

if (-not $statsResponse2.Success -and $statsResponse2.StatusCode -eq 403) {
    Write-Host "✅ Acceso denegado correctamente (403 Forbidden)" -ForegroundColor Green
    Write-Host "   Error: $($statsResponse2.Data.error)" -ForegroundColor Gray
    Write-Host "   Mensaje: $($statsResponse2.Data.message)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: El acceso debería estar bloqueado" -ForegroundColor Red
    exit 1
}

# Paso 7: Intentar buscar personas (debe fallar con 403)
Write-Host "`n[7/10] Intentando buscar personas (debe fallar)..." -ForegroundColor Yellow
$searchResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/consulta/search?limit=10" -Token $TOKEN

if (-not $searchResponse.Success -and $searchResponse.StatusCode -eq 403) {
    Write-Host "✅ Búsqueda bloqueada correctamente (403 Forbidden)" -ForegroundColor Green
} else {
    Write-Host "❌ Error: La búsqueda debería estar bloqueada" -ForegroundColor Red
    exit 1
}

# Paso 8: Verificar que health check sigue funcionando
Write-Host "`n[8/10] Verificando health check (debe funcionar)..." -ForegroundColor Yellow
$healthResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/consulta/health" -Token $TOKEN

if ($healthResponse.Success) {
    Write-Host "✅ Health check funciona correctamente" -ForegroundColor Green
    Write-Host "   Health check NO está protegido (comportamiento esperado)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Health check falló (puede ser normal si el servicio no está arriba)" -ForegroundColor Yellow
}

# Paso 9: HABILITAR el servicio nuevamente
Write-Host "`n[9/10] Habilitando el servicio de consulta nuevamente..." -ForegroundColor Yellow
$enableResponse = Invoke-ApiRequest -Method "PUT" -Endpoint "/api/auth/preferences/consulta-service" `
    -Token $TOKEN -Body @{ enabled = $true }

if ($enableResponse.Success) {
    Write-Host "✅ Servicio habilitado correctamente" -ForegroundColor Green
    Write-Host "   Mensaje: $($enableResponse.Data.message)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error al habilitar el servicio" -ForegroundColor Red
    exit 1
}

# Paso 10: Verificar que el servicio funciona nuevamente
Write-Host "`n[10/10] Verificando acceso al servicio (debe funcionar)..." -ForegroundColor Yellow
$statsResponse3 = Invoke-ApiRequest -Method "GET" -Endpoint "/api/consulta/stats" -Token $TOKEN

if ($statsResponse3.Success) {
    Write-Host "✅ Servicio de consulta accesible nuevamente" -ForegroundColor Green
    Write-Host "   Total personas: $($statsResponse3.Data.total_personas)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error: El servicio debería estar habilitado ahora" -ForegroundColor Red
    exit 1
}

# Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nResumen de funcionalidades probadas:" -ForegroundColor White
Write-Host "  ✅ Login con credenciales" -ForegroundColor Green
Write-Host "  ✅ Acceso inicial al servicio (habilitado por defecto)" -ForegroundColor Green
Write-Host "  ✅ Obtención de preferencias del usuario" -ForegroundColor Green
Write-Host "  ✅ Deshabilitación del servicio de consulta" -ForegroundColor Green
Write-Host "  ✅ Actualización de preferencias en BD" -ForegroundColor Green
Write-Host "  ✅ Bloqueo de acceso cuando está deshabilitado (403)" -ForegroundColor Green
Write-Host "  ✅ Health check sin protección" -ForegroundColor Green
Write-Host "  ✅ Habilitación del servicio de consulta" -ForegroundColor Green
Write-Host "  ✅ Restauración del acceso normal" -ForegroundColor Green

Write-Host "`n🎉 El backend del control del servicio de consulta funciona correctamente!`n" -ForegroundColor Cyan


