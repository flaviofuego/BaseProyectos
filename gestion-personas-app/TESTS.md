# Tests

Este documento unifica cómo ejecutar todas las pruebas del proyecto.
Siguiendo las reglas del repositorio, usa siempre `make` (Makefile). Si no tienes `make`, ejecuta los comandos Docker Compose equivalentes desde los targets del Makefile.

## Requisitos

- Docker y Docker Compose activos con servicios corriendo (`docker-compose up -d`)
- Archivo `.env` configurado con las variables de entorno necesarias
- `make` disponible (en Windows puedes usar Git Bash o WSL)

## Ejecutar todo

- Todos los tests (unit + integration + frontend):
  - `make test`

## Unit tests (Backend)

- Ejecutar únicamente unit tests de Node.js:
  - `make test-unit`
- **Servicios probados:**
  - Auth: Validación, normalización, hashing (124 tests)
  - Personas: CRUD, validación, upload CSV (36 tests)
  - Consulta: Búsqueda, stats, cache (tests unitarios)
  - Registry: Registro de servicios, heartbeat, health checks

## Integration tests (Backend)

- Ejecutar únicamente integration tests de Node.js:
  - `make test-integration`
- **Arquitectura:** Los tests corren dentro de containers Docker existentes y conectan a servicios reales (PostgreSQL, Redis)
- **Servicios probados:**
  - **Auth (11 tests):** Integración con PostgreSQL (esquema users, logs) y Redis (sesiones)
  - **Personas (4 tests):** Integración vía API Gateway (crear, duplicado, existe, eliminar)
  - **Consulta (12 tests):** Integración con PostgreSQL (queries, transacciones) y Redis (cache TTL)
  - **Registry:** Registro y descubrimiento de servicios
- **Nota:** Los endpoints HTTP se prueban en E2E. Integration tests verifican solo conectividad BD/cache

## Frontend tests (Python + JS)

- Ejecutar pruebas del frontend (Pytest para rutas Flask y Jest para JS):
  - `make test-frontend`

## Frontend tests (Python + JS)

- Ejecutar pruebas del frontend (Pytest para rutas Flask y Jest para JS):
  - `make test-frontend`
- **Cobertura actual:**
  - FormValidator: 42/42 tests (100%)
  - FormatUtils: 39/46 tests (85%)
  - ThemeManager: 38/39 tests (97%)
  - NotificationManager: 0/6 tests (requiere DOM init)

## End-to-End (Playwright)

- Ejecutar E2E en modo headless:
  - `make test-e2e`
- UI interactiva (útil para depurar):
  - `make test-e2e-ui`
- Reporte HTML de E2E:
  - `make test-e2e-report`
- **Tests E2E (4 specs):**
  - 01-auth.spec.ts: Login, registro, logout
  - 02-personas-crud.spec.ts: CRUD completo de personas
  - 03-nlp-query.spec.ts: Consultas en lenguaje natural
  - 04-auditoria.spec.ts: Visualización de logs y auditoría

## Performance tests

- Ejecutar tests de performance y carga (TC-PERF):
  - `make test-performance`
- **Tests incluidos:**
  - TC-PERF-001: Response time < 2s
  - TC-PERF-002: Throughput > 10 req/s
  - TC-PERF-003: Cache hit ratio > 70%
  - TC-PERF-004: Connection pooling < 100ms

## Cobertura y resultados

- Generar reportes de cobertura (Node):
  - `make test-coverage`
- Ver resumen de resultados disponibles:
  - `make test-results`

## Arquitectura de Tests

### Unit Tests

- Corren dentro del container de cada servicio
- Prueban funciones aisladas sin dependencias externas
- Usan mocks para DB/Redis/servicios externos

### Integration Tests

- Corren dentro de containers Docker (`docker exec <service>_dev npm run test:integration`)
- Conectan a servicios reales: `personas_db`, `personas_redis`
- **NO usan Testcontainers** - conectan a infraestructura existente
- Verifican integración con BD y cache, no lógica HTTP

### E2E Tests

- Corren con Playwright contra sistema completo
- Prueban flujos de usuario end-to-end
- Validan integración entre frontend, gateway y microservicios

### Performance Tests

- Miden rendimiento bajo carga
- Validan SLAs de tiempo de respuesta
- Verifican eficiencia de cache

## Notas importantes

- **Prerequisito:** Servicios deben estar corriendo (`docker-compose up -d`)
- Los tests de integración ahora usan servicios Docker existentes (no Testcontainers)
- Rate limiting deshabilitado en tests (NODE_ENV=test)
- Los targets del Makefile aplican configuración automáticamente
