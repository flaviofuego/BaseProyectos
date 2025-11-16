# 🧪 Testing - Gestión de Personas

> **Guía completa de testing:** Unit, Integration, E2E y Performance

## 📋 Tabla de Contenidos

- [Inicio Rápido](#-inicio-rápido)
- [Tipos de Tests](#-tipos-de-tests)
- [Arquitectura](#-arquitectura)
- [Comandos](#-comandos)
- [Resultados](#-resultados)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Inicio Rápido

### Prerequisitos

**IMPORTANTE:** Los servicios deben estar corriendo:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Ejecutar Tests

```bash
# Todos los tests (unit + integration + frontend + e2e + performance)
make test

# Por categoría
make test-unit         # Backend unit tests (~3s)
make test-integration  # DB/Redis integration (~10s)
make test-frontend     # Python + Jest (~5s)
make test-e2e         # Playwright E2E (~4min)
make test-performance  # Load tests (~2min)
```

---

## 🧪 Tipos de Tests

### 1️⃣ Unit Tests

- **Qué:** Funciones aisladas con mocks
- **Ubicación:** `services/*/tests/unit/`
- **Ejecución:** `make test-unit`
- **Cobertura:** Auth (124), Personas (36)

### 2️⃣ Integration Tests

- **Qué:** Conectividad con DB/Redis real
- **Ubicación:** `services/*/tests/integration/`
- **Ejecución:** `make test-integration`
- **Arquitectura:** Conecta a `personas_db` y `personas_redis` (NO Testcontainers)
- **Tests:** Auth (11), Personas (4), Consulta (12), Registry (22)

### 3️⃣ Frontend Tests

- **Python:** Pytest para rutas Flask
- **JavaScript:** Jest para utilidades frontend
- **Ejecución:** `make test-frontend`

### 4️⃣ E2E Tests

- **Framework:** Playwright
- **Specs:** 4 archivos (Login, Crear Persona, Consulta NLP, Auditoría)
- **Ejecución:** `make test-e2e`
- **Documentación:** [tests/e2e/README.md](./e2e/README.md)
- **Nota:** NLP temporalmente excluido en playwright.config.js

### 5️⃣ Performance Tests

- **Framework:** Jest + Axios
- **Tests:** Response time, Throughput, Cache ratio
- **Ejecución:** `make test-performance`
- **Documentación:** [tests/performance/README.md](./performance/README.md)

---

## 🏗️ Arquitectura

### Cambio Importante (Nov 2025)

Los **integration tests** ya NO usan Testcontainers:

#### ❌ Antes (Testcontainers)

```javascript
const pgContainer = await new GenericContainer("postgres:15").start();
// Problemas: lento (3min), errores de Reaper, alto consumo
```

#### ✅ Ahora (Docker existente)

```javascript
const pgPool = new Pool({
  host: "localhost",
  port: 5432,
  database: "personas_db",
});
// Beneficios: rápido (3s), sin errores, reutiliza infraestructura
```

**Ver detalles:** [MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md)

---

## 📦 Comandos Make

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

### Resultados y Reportes

```bash
make test-results              # Resumen de resultados
make test-coverage             # Generar cobertura detallada
```

**Reportes HTML:**

- Consolidado: `tests/results/index.html`
- Coverage Python: `tests/results/coverage-python/index.html`
- Coverage Backend: `tests/results/coverage/*/index.html`
- E2E Report: `tests/e2e/playwright-report/index.html`

---

## 🔍 Estado Actual (Nov 2025)

### Backend

- **Unit Tests:** 160/160 ✅ (Auth: 124, Personas: 36)
- **Integration Tests:** 27/27 ✅ (Auth: 11, Personas: 4, Consulta: 12)
- **Velocidad:** ~13s total

### Frontend

- **Python (Pytest):** 10/15 ⚠️
- **JavaScript (Jest):** 126/136 ⚠️

### E2E (Playwright)

- **Total:** 4 specs disponibles (01-login, 02-crear-persona, 03-consulta-nlp, 04-auditoria)
- **Estado:** No ejecutados recientemente. Backend 100% OK
- **Nota:** Spec 03-consulta-nlp excluido temporalmente en config

### Total General

**Último run:** 207/238 tests (87%) ✅  
**Nota:** Basado en ejecución previa. Backend mantiene 100% cobertura (187/187)

---

## 🐛 Troubleshooting

### Error: "Port already in use"

```bash
make test-down
docker-compose down
```

### Tests muy lentos

```bash
# Ejecutar en paralelo (solo unit tests)
make test-unit
```

### Limpiar todo

```bash
make test-clean                 # Limpia artefactos
docker system prune -af         # Limpieza profunda (cuidado!)
```

### Integration tests fallan

1. Verificar servicios corriendo: `docker ps`
2. Verificar puertos: PostgreSQL (5432), Redis (6379)
3. Reiniciar servicios: `docker-compose restart postgres redis`

---

## 📁 Estructura de Archivos

```
tests/
├── README.md                      # 👈 Esta guía
├── e2e/                           # Tests End-to-End (Playwright)
│   ├── README.md                  # Guía específica E2E
│   ├── specs/                     # 4 specs: Login, CRUD, NLP, Auditoría
│   └── fixtures/                  # Archivos de prueba
├── performance/                   # Tests de carga
│   ├── README.md                  # Guía de performance
│   └── performance.test.js        # TC-PERF-001 a 004
├── docs/                          # Documentación adicional
│   └── MIGRATION-GUIDE.md         # Historia de cambios
├── config/                        # Configuraciones
├── scripts/                       # Scripts auxiliares
└── results/                       # Reportes generados (git-ignored)
```

**Backend tests** están en cada servicio:

```
services/auth/tests/
  ├── unit/                        # Mocks, funciones aisladas
  └── integration/                 # DB/Redis real
```

---

## 📚 Documentación Adicional

- **Migration Guide:** [docs/MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md) - Historia de cambios de Testcontainers
- **E2E Testing:** [e2e/README.md](./e2e/README.md) - Playwright specs detallados
- **Performance:** [performance/README.md](./performance/README.md) - Load testing
- **Main README:** [../TESTS.md](../TESTS.md) - Documentación principal del proyecto

---

## 💡 Tips y Best Practices

### TDD (Test-Driven Development)

1. Escribe el test primero (rojo) ❌
2. Implementa lo mínimo para pasar (verde) ✅
3. Refactoriza manteniendo tests verdes 🔄

### Cobertura

- **Unit tests:** > 80% por servicio
- **Integration tests:** Rutas críticas
- **E2E tests:** User journeys principales

### CI/CD

```yaml
# .github/workflows/tests.yml (ejemplo)
- name: Run tests
  run: |
    docker-compose up -d
    make test
    make test-results
```

---

## 🤝 Contribuir

Al agregar features:

1. ✅ Escribe tests primero (TDD)
2. ✅ Ejecuta `make test` antes de commit
3. ✅ Mantén cobertura > 70%
4. ✅ Documenta casos edge

---

**¿Preguntas?** Consulta [docs/MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md) o abre un issue.
