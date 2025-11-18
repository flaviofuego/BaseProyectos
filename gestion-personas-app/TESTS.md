# Tests - Guía Central

**265+ tests totales** | ✅ 264 passing | ❌ 1 failing

## Ejecutar Tests

```bash
# Todos los tests (sin performance)
make test

# Performance
make test-performance    # Tests de performance (TC-PERF)
make test-all            # Todo incluyendo performance
make test-warmup         # Opcional: precalentar cache/pools

# Por categoría
make test-unit           # Unit tests backend
make test-integration    # Integration tests backend
make test-frontend       # Frontend tests
make test-e2e            # End-to-end tests
```

## Requisitos

- Docker y Docker Compose corriendo: `docker-compose -f docker-compose.dev.yml up -d`
- Para E2E: App disponible en `http://localhost:5000`
- WSL/Git Bash en Windows para ejecutar `make`

## Tests Disponibles

### Unit Tests Backend (160 tests) ✅

**Auth Service (124 tests)**

- JWT: Generación y verificación de tokens (35 tests)
- Middleware: Autenticación en rutas (17 tests)
- Joi Validation: Passwords, emails, usernames (50 tests)
- Helpers: Preferencias, cache, logging (29 tests)

**Personas Service (36 tests)**

- Image Processing: Sharp para redimensionar/comprimir imágenes

### Integration Tests Backend (49 tests) ✅

**Auth (11 tests):** PostgreSQL + Redis (sesiones, usuarios, logs)
**Personas (4 tests):** CRUD vía Gateway
**Consulta (12 tests):** PostgreSQL + Redis (cache, TTL, queries)
**Registry (22 tests):** Service discovery, heartbeat, load balancing

### Frontend Tests (163 tests) ✅

**Python/Flask (27 tests)**

- Autenticación: login, register, logout
- CRUD Personas: crear, consultar, modificar, borrar
- Módulos: NLP, bulk upload, logs, reportes

**JavaScript/Jest (136 tests)**

- FormValidator (42 tests): Validación de 10+ tipos de campos
- FormatUtils (50 tests): Fechas, moneda, teléfonos, slugs
- ThemeManager (38 tests): Temas, transiciones, loaders
- NotificationManager (6 tests): Sistema de notificaciones

### E2E Tests (30 tests) ⚠️

**Login Flow (8 tests):** Autenticación completa
**Crear Persona (22 tests):** Formulario, validaciones, imágenes

**1 test failing**: Validación de campos requeridos en crear persona

## Estructura de Archivos

```
services/
├── auth/tests/
│   ├── unit/ (124 tests)
│   └── integration/ (11 tests)
├── personas/tests/
│   ├── unit/ (36 tests)
│   └── integration/ (4 tests)
├── consulta/tests/integration/ (12 tests)
└── registry/tests/integration/ (22 tests)

frontend/tests/
├── test_routes.py (27 tests Python)
└── unit/ (136 tests JavaScript)

tests/e2e/specs/
├── 01-login.spec.js (8 tests)
└── 02-crear-persona.spec.js (22 tests)
```

## Características Importantes

### ✅ Sin Mocks en Integration Tests

Los tests de integración usan servicios reales de Docker (PostgreSQL, Redis)

### ✅ Sin Coverage Reporting

Pytest configurado para mostrar solo pass/fail (sin porcentajes de cobertura)

### ✅ Tests Rápidos

- Unit tests: ~10 segundos
- Integration tests: ~20 segundos
- Frontend tests: ~40 segundos
- E2E tests: ~2 minutos
- **Total: ~3 minutos**

## Comandos Útiles

```bash
# Ver solo resumen de resultados
make test 2>&1 | grep -E "(passed|failed|Test Suites)"

# Tests de un servicio específico
cd services/auth && npm test
cd services/personas && npm test

# Frontend Python verbose
cd frontend && pytest -vv

# E2E con UI (debug)
cd tests/e2e && npx playwright test --ui

# Ver último reporte E2E
cd tests/e2e && npx playwright show-report
```

## Notas

- **Docker debe estar corriendo** antes de ejecutar tests
- **NO usar mocks** en integration tests
- Tests E2E generan screenshots en `tests/e2e/test-results/` si fallan
- Coverage de JavaScript deshabilitado en CI (solo para desarrollo local)
