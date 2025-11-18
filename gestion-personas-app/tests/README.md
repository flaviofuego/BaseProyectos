# Tests - Guía Detallada

**Ver guía principal:** [../TESTS.md](../TESTS.md)

## Inicio Rápido

```bash
# 1. Levantar servicios
docker-compose -f docker-compose.dev.yml up -d

# 2. Ejecutar todos los tests
make test
```

## Estructura

```
tests/
├── e2e/                    # Playwright tests (30 tests)
├── performance/            # Load tests (4 tests)
├── config/                 # Configuraciones
└── scripts/                # Scripts auxiliares

services/*/tests/
├── unit/                   # Tests unitarios (160 tests)
└── integration/            # Tests con DB/Redis (49 tests)

frontend/tests/
├── test_routes.py          # Python/Flask (27 tests)
└── unit/                   # JavaScript/Jest (136 tests)
```

## Comandos

```bash
make test                # Todos los tests
make test-unit           # Unit tests (160 tests)
make test-integration    # Integration tests (49 tests)
make test-frontend       # Frontend tests (163 tests)
make test-e2e           # E2E tests (30 tests)
```

## Troubleshooting

**Servicios no corriendo:**

```bash
docker ps  # Verificar servicios activos
docker-compose -f docker-compose.dev.yml up -d
```

**Tests fallan por puertos:**

```bash
docker-compose down
docker-compose -f docker-compose.dev.yml up -d
```

**Ver logs de un test:**

```bash
cd services/auth && npm test -- --verbose
cd frontend && pytest -vv
cd tests/e2e && npx playwright test --debug
```

## Documentación Específica

- **E2E:** [e2e/README.md](./e2e/README.md)
- **Performance:** [performance/README.md](./performance/README.md)
