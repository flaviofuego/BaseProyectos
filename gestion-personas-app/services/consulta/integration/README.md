# Tests de Integración - Consulta Service

## 🎯 Escenario 5: Búsqueda con Cache

Este test verifica el comportamiento completo del cache layer con PostgreSQL y Redis.

## 📋 Pre-requisitos

1. **Docker Desktop** debe estar corriendo
2. **Dependencias instaladas**: `npm install`

## 🚀 Ejecutar Tests

```bash
# Instalar dependencias (primera vez)
npm install

# Ejecutar todos los tests de integración
npm run test:integration

# O usar el script bash
chmod +x test-integration.sh
./test-integration.sh

# Ejecutar test específico
./test-integration.sh cache-search.integration.test.js

# Modo watch
./test-integration.sh --watch
```

## 🧪 Tests Incluidos

### Cache Behavior (5 tests)

- ✅ Cache miss → primera llamada desde PostgreSQL
- ✅ Cache hit → segunda llamada desde Redis
- ✅ TTL verification (300s para stats, 30s para dashboard)
- ✅ Cache expiration y actualización
- ✅ Estadísticas detalladas en respuesta

### Dashboard Stats (2 tests)

- ✅ TTL corto (30 segundos)
- ✅ Cache para llamadas subsiguientes

### Cache Invalidation (2 tests)

- ✅ Limpiar todo el cache
- ✅ Invalidación selectiva de stats

### Performance (2 tests)

- ✅ Comparación DB vs Cache
- ✅ Múltiples requests concurrentes (10x)

### Data Consistency (2 tests)

- ✅ Consistencia entre PostgreSQL y Redis
- ✅ Manejo graceful de cache miss

### Edge Cases (2 tests)

- ✅ Errores de Redis
- ✅ Base de datos vacía

**Total**: 15+ tests

## ⏱️ Tiempo de Ejecución

- Setup (Testcontainers): ~20-30 segundos
- Tests: ~30-40 segundos
- Cleanup: ~5-10 segundos
- **Total**: ~60 segundos

## 🐳 Contenedores Utilizados

- **PostgreSQL 15-alpine**: Base de datos con 5 personas de prueba
- **Redis 7-alpine**: Cache layer

Ambos contenedores se levantan automáticamente con **Testcontainers** y se destruyen al finalizar.

## 📊 Datos de Prueba

El test inserta 5 personas automáticamente:

| Documento | Nombre                 | Género | Edad | Tipo Doc |
| --------- | ---------------------- | ------ | ---- | -------- |
| 10001     | Juan Pérez García      | M      | 19   | CC       |
| 10002     | María López Martínez   | F      | 34   | CC       |
| 10003     | Carlos Rodríguez Silva | M      | 39   | CC       |
| 10004     | Ana González Torres    | F      | 14   | TI       |
| 10005     | Pedro Ramírez Costa    | M      | 47   | CE       |

## 🔍 Endpoints Testeados

- `GET /health` - Health check
- `GET /stats` - Estadísticas con cache (TTL: 300s)
- `GET /dashboard/stats` - Stats con cache corto (TTL: 30s)
- `DELETE /cache` - Limpiar todo el cache
- `POST /cache/invalidate-stats` - Invalidar solo stats

## 🎯 Verificaciones Clave

1. **Primera llamada** → `_cache: false` (desde PostgreSQL)
2. **Segunda llamada** → `_cache: true` (desde Redis)
3. **Performance** → Cache es significativamente más rápido
4. **TTL** → Redis tiene keys con expiration correcta
5. **Consistencia** → Datos iguales en DB y Cache

## 🐛 Troubleshooting

### "Docker is not running"

```bash
docker info
```

Si falla, inicia Docker Desktop.

### "Connection terminated unexpectedly"

Aumenta el timeout en el test o verifica tu conexión (Testcontainers descarga imágenes).

### Tests lentos

La primera ejecución es lenta (descarga imágenes Docker). Ejecuciones subsiguientes son más rápidas.

## 📖 Documentación Completa

Ver `services/auth/integration/README.md` para información sobre todos los escenarios de integración.

---

**Parte de**: Nivel Medio - Pruebas de Integración (15% del esfuerzo)  
**Escenario**: 5 de 5
