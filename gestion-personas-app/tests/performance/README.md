# Tests de Performance

Este directorio contiene los tests de performance y carga del sistema (TC-PERF).

## Estructura

```
performance/
├── performance.test.js  # 4 tests de performance críticos
├── package.json         # Dependencias de Jest y Axios
└── README.md           # Este archivo
```

## Tests Implementados

### TC-PERF-001: Response Time < 200ms

- Mide el tiempo de respuesta promedio en consultas simples
- Ejecuta 50 peticiones consecutivas
- Valida: avg < 200ms, P95 < 300ms

### TC-PERF-002: Throughput > 1000 req/min

- Simula 100 usuarios concurrentes durante 1 minuto
- Valida: > 1000 requests procesados
- Error rate < 5%

### TC-PERF-003: Cache Hit Ratio > 80%

- Precalienta cache con consultas comunes
- Ejecuta 100 peticiones repetidas
- Valida: > 80% de hits (respuestas < 50ms)

### TC-PERF-004: Connection Pooling Eficiente

- Ejecuta 50 peticiones simultáneas
- Valida: > 95% exitosas, sin timeouts
- Duración total < 10s

## Requisitos

- Sistema levantado con `docker-compose up` o `make dev`
- Usuario de prueba: `admin` / `admin123` (configurable vía ENV)
- Base de datos con datos de prueba

## Ejecución

### Desde la raíz del proyecto:

```bash
# Via Makefile (recomendado)
make test-performance

# Manual
cd tests/performance
npm install
npm test
```

### Variables de entorno (opcionales):

```bash
API_BASE_URL=http://localhost:8001
TEST_USER=admin
TEST_PASSWORD=admin123
```

## Métricas Esperadas

| Test     | Métrica           | Objetivo       |
| -------- | ----------------- | -------------- |
| PERF-001 | Response Time Avg | < 200ms        |
| PERF-001 | Response Time P95 | < 300ms        |
| PERF-002 | Throughput        | > 1000 req/min |
| PERF-002 | Error Rate        | < 5%           |
| PERF-003 | Cache Hit Ratio   | > 80%          |
| PERF-004 | Success Rate      | > 95%          |
| PERF-004 | Total Duration    | < 10s          |

## Notas

- Los tests de performance son más lentos (hasta 2 minutos cada uno)
- Se recomienda ejecutarlos en un entorno estable sin carga adicional
- Los timeouts están ajustados a 120 segundos
- Se ejecutan secuencialmente (`--runInBand`) para evitar interferencias
