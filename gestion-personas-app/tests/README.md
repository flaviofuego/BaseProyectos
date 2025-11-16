# 🧪 Quick Start - Entorno de Pruebas

## 🚀 Inicio Rápido

### Prerequisitos

**IMPORTANTE:** Los servicios deben estar corriendo antes de ejecutar tests:

```bash
docker-compose up -d
```

### Comandos Make

```bash
# Ejecutar TODOS los tests
make test

# Solo tests unitarios (rápido) - ~160 tests
make test-unit

# Solo tests de integración - 27 tests (Auth: 11, Personas: 4, Consulta: 12)
make test-integration

# Tests del frontend Python + Jest
make test-frontend

# Tests end-to-end (4 specs: Auth, CRUD, NLP, Auditoría)
make test-e2e

# Tests de performance (TC-PERF-001 a 004)
make test-performance

# Generar reporte de cobertura
make test-coverage

# Ver resultados
make test-results
```

## 🔄 Cambios Recientes (Noviembre 2025)

### Integration Tests - Nueva Arquitectura

Los tests de integración fueron **rediseñados** para usar servicios Docker existentes:

- ❌ **Antes:** Usaban Testcontainers (spawneaban containers separados)
- ✅ **Ahora:** Conectan a servicios corriendo (`personas_db`, `personas_redis`)

**Ventajas:**

- ✅ Más rápidos (no levantan containers)
- ✅ Prueban infraestructura real
- ✅ Sin conflictos de puertos
- ✅ Mejor aislamiento de concerns (DB/cache vs HTTP)

**Qué prueban:**

- **Auth (11 tests):** Esquema PostgreSQL (users, logs, preferences) + Redis (sesiones)
- **Personas (4 tests):** CRUD vía API Gateway
- **Consulta (12 tests):** Queries PostgreSQL (agregación, transacciones, JSONB) + Redis (cache TTL)

## 📊 Ver Resultados

```bash
# Script interactivo
./tests/scripts/view-test-results.sh

# O manualmente
open tests/results/index.html                      # Reporte consolidado
open tests/results/coverage-python/index.html      # Cobertura Python
open tests/results/coverage/auth/index.html        # Cobertura Auth Service
```

## 🏗️ Arquitectura de Tests

### Unit Tests

- **Ubicación:** `services/*/tests/unit/`
- **Ejecución:** Dentro de cada container de servicio
- **Usan:** Mocks para DB/Redis/servicios externos
- **Objetivo:** Funciones aisladas

### Integration Tests

- **Ubicación:** `services/*/tests/integration/`
- **Ejecución:** `docker exec <service>_dev npm run test:integration`
- **Conectan a:** `personas_db` (PostgreSQL 15), `personas_redis` (Redis 7)
- **NO usan:** Testcontainers ni containers aislados
- **Objetivo:** Verificar integración con BD/cache, NO lógica HTTP (eso va en E2E)

### E2E Tests

- **Ubicación:** `tests/e2e/specs/`
- **Ejecución:** Playwright contra sistema completo
- **Objetivo:** Flujos de usuario completos

### Performance Tests

- **Ubicación:** `tests/performance/`
- **Objetivo:** Validar SLAs (response time, throughput, cache efficiency)

## 📁 Estructura de Archivos Creados

```plant
gestion-personas-app/
├── tests/
│   ├── config/
│   │   ├── docker-compose.test.yml   # Entorno Docker de testing
│   │   └── jest.config.js            # Configuración Jest global
│   ├── docker/
│   │   ├── Dockerfile.test.node      # Tests Node.js
│   │   └── Dockerfile.test.e2e       # Tests E2E
│   ├── scripts/
│   │   ├── test-runner.sh            # Script ejecutor de tests
│   │   ├── test-quickstart.sh        # Script de inicio rápido
│   │   └── view-test-results.sh      # Visor de resultados
│   ├── docs/
│   │   └── GUIDE.md                  # Guía completa de testing
│   ├── e2e/
│   │   ├── package.json              # Dependencias E2E
│   │   ├── playwright.config.js      # Configuración Playwright
│   │   ├── specs/                    # Tests E2E
│   │   ├── fixtures/
│   │   └── helpers/
│   └── results/                      # Resultados (generado)
│       ├── index.html
│       ├── coverage/
│       ├── coverage-python/
│       └── playwright-report/
│
├── frontend/
│   └── Dockerfile.test               # Tests Python
│
└── services/auth/tests/
    ├── setup.js                      # Setup de tests
    └── unit/
        └── jwt.token.test.js         # Ejemplo de test
```

## 🎯 Ejemplos de Uso

### Desarrollo Activo

```bash
# Watch mode - Re-ejecuta tests al modificar archivos
make test-watch
```

### CI/CD

```bash
# Ejecutar todos los tests y generar reportes
make test

# Verificar códigos de salida
echo $?  # 0 = éxito, 1 = fallos
```

### Debugging

```bash
# Iniciar entorno manualmente
make test-up

# Ver logs en tiempo real
docker-compose -f docker-compose.test.yml logs -f

# Ejecutar tests específicos
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  sh -c "cd /app/services/auth && npm test"

# Conectarse a la base de datos de test
docker exec -it postgres_test psql -U test_user -d test_db
```

## 🐛 Troubleshooting

### Error: "Port already in use"

```bash
make test-down
# Si persiste:
docker-compose -f docker-compose.test.yml down -v
```

### Tests muy lentos

```bash
# Ejecutar tests en paralelo
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test -- --maxWorkers=4
```

### Limpiar todo y empezar de cero

```bash
make test-clean
make test-build
make test
```

## 📚 Documentación Completa

Para guía detallada de testing, ver: [`TESTING-GUIDE.md`](./TESTING-GUIDE.md)

## 🎓 Próximos Pasos

1. ✅ Ejecutar tests para verificar que todo funciona
2. ✅ Escribir tests para tu código existente
3. ✅ Configurar CI/CD (GitHub Actions, GitLab CI, etc.)
4. ✅ Establecer políticas de cobertura mínima

## 🤝 Contribuir

Cuando agregues nuevas funcionalidades:

1. Escribe tests primero (TDD)
2. Ejecuta `make test` antes de commit
3. Mantén cobertura > 70%
4. Documenta tests complejos

---

**¿Problemas?** Abre un issue o consulta [`TESTING-GUIDE.md`](./TESTING-GUIDE.md)
