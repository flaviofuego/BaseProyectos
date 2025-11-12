# 🧪 Guía de Testing - Proyecto Gestión de Personas

## 📋 Resumen

Este proyecto cuenta con una suite completa de tests que cubren:

- **Tests Unitarios** (~230 tests): Funciones individuales y componentes aislados
- **Tests de Integración** (~85 tests): Interacción entre servicios y bases de datos
- **Tests E2E** (~61 tests): Flujos completos de usuario en navegador real

**Total: ~376 tests implementados**

---

## 🎯 Tipos de Tests

### 1️⃣ Tests Unitarios (60% del esfuerzo)

**Objetivo**: Verificar funciones individuales de forma aislada usando mocks.

**Backend (Node.js + Jest)**:

- Middleware de autenticación JWT
- Validación de schemas (Joi)
- Generación de tokens JWT
- Procesamiento de imágenes (Sharp)
- Funciones auxiliares y helpers

**Frontend (JavaScript + Jest)**:

- ThemeManager
- Validación de formularios
- Utilidades de formateo

**Frontend (Python + Pytest)**:

- Rutas de Flask

### 2️⃣ Tests de Integración (15% del esfuerzo)

**Objetivo**: Verificar interacción entre servicios y bases de datos reales usando Testcontainers.

**Escenarios implementados**:

1. **Auth Flow**: Registro y login con PostgreSQL + Redis
2. **CRUD con JWT**: Operaciones de personas con autenticación
3. **NLP Queries**: Consultas en lenguaje natural
4. **Service Registry**: Registro y descubrimiento de servicios
5. **Cache Search**: Verificación de cache con Redis

### 3️⃣ Tests E2E (5% del esfuerzo)

**Objetivo**: Validar flujos completos de usuario desde un navegador real.

**Casos de uso implementados**:

**Prioridad Alta**:

- **CU-001**: Registrarse (7 tests)
- **CU-002**: Iniciar Sesión (8 tests)
- **CU-006**: Crear Persona con subida de imagen (9 tests)

**Prioridad Media**:

- **CU-007**: Consultar Personas (10 tests)
- **CU-008**: Actualizar Persona (8 tests)
- **CU-009**: Eliminar Persona (7 tests)

**Prioridad Baja**:

- **CU-012**: Consulta NLP (12 tests)

**Total: 7 Casos de Uso, ~61 tests**

---

## 🚀 Ejecutar Tests

### Tests Unitarios

```bash
# Backend - Auth Service
cd services/auth
npm test                    # Todos los tests
npm test -- --coverage      # Con reporte de cobertura
npm test -- --watch         # Modo watch (desarrollo)

# Backend - Personas Service
cd services/personas
npm test

# Frontend - JavaScript
cd frontend/static
npm test

# Frontend - Python
cd frontend
pytest tests/unit/
```

### Tests de Integración

```bash
# Escenarios 1-3 (Auth Flow, CRUD, NLP)
cd services/auth
./test-integration.sh

# Escenario 4 (Service Registry)
cd services/registry
./test-integration.sh

# Escenario 5 (Cache Search)
cd services/consulta
./test-integration.sh
```

### Tests E2E

**Requisito**: Docker Compose corriendo (`docker compose up -d`)

```bash
cd tests/e2e

# Instalar dependencias (solo primera vez)
npm install
npx playwright install chromium

# Ejecutar todos los tests
npm test

# Ejecutar un caso de uso específico
npm test specs/01-registro.spec.js
npm test specs/02-login.spec.js
npm test specs/03-crear-persona.spec.js

# Con interfaz visual
npm run test:ui

# En modo debug
npm run test:debug

# Ver reporte
npm run test:report
```

---

## 📊 Estado Actual

### Tests Unitarios Backend

- **Total**: 124 tests
- **Pasando**: 114 (91.9%)
- **Fallando**: 10 (issues menores de assertions)
- **Archivos**:
  - `auth.middleware.test.js`
  - `joi.validation.test.js`
  - `jwt.token.test.js`
  - `helpers.test.js`
  - `image.processing.test.js`

### Tests de Integración

- **Escenario 1**: 14/14 tests ✅
- **Escenario 2**: 15/15 tests ✅
- **Escenario 3**: 18/18 tests ✅
- **Escenario 4**: 14/22 tests (63.6%)
- **Escenario 5**: 14/16 tests (87.5%)

### Tests E2E

- **Total**: ~61 tests en 7 casos de uso
- **Estado**: Implementados, pendiente de ejecución inicial
- **Archivos**: Ver `tests/e2e/specs/`

---

## 🔧 Tecnologías Usadas

- **Jest**: Framework de testing para JavaScript/Node.js
- **Supertest**: Testing HTTP para APIs REST
- **Testcontainers**: Contenedores Docker efímeros para tests
- **Pytest**: Framework de testing para Python
- **Playwright**: Automatización de navegadores para tests E2E
- **Mocks**: `jest.fn()`, `jest.mock()` para aislar dependencias

---

## 💡 Conceptos Clave

### Tests Unitarios

- Se ejecutan **localmente** (en tu máquina)
- Usan **mocks** en lugar de servicios reales
- **Rápidos** (< 1 segundo)
- NO requieren Docker

### Tests de Integración

- Se ejecutan **localmente** (en tu máquina)
- Usan **Testcontainers** para levantar PostgreSQL y Redis automáticamente
- **Moderadamente rápidos** (10-15 segundos)
- NO requieren `docker compose up` manual
- Los contenedores se crean y destruyen automáticamente

### Tests E2E

- Se ejecutan **localmente** con Playwright
- Usan **navegador real** (Chromium, Firefox, Webkit)
- **Lentos** (30-60 segundos por suite)
- SÍ requieren `docker compose up` (app debe estar corriendo)
- Simulan acciones reales de usuario (clicks, tipeo, navegación)

---

## 📁 Estructura de Archivos

```
gestion-personas-app/
├── tests/
│   └── e2e/                       # Tests E2E con Playwright
│       ├── specs/                 # Tests organizados por CU
│       │   ├── 01-registro.spec.js
│       │   ├── 02-login.spec.js
│       │   ├── 03-crear-persona.spec.js
│       │   ├── 04-consultar-personas.spec.js
│       │   ├── 05-actualizar-persona.spec.js
│       │   ├── 06-eliminar-persona.spec.js
│       │   └── 07-consulta-nlp.spec.js
│       ├── helpers/               # Funciones reutilizables
│       ├── fixtures/              # Imágenes de prueba
│       └── playwright.config.js
│
├── services/
│   ├── auth/
│   │   ├── *.test.js              # Tests unitarios
│   │   ├── integration/           # Tests de integración
│   │   │   ├── auth-flow.integration.test.js
│   │   │   ├── personas-crud.integration.test.js
│   │   │   └── nlp-query.integration.test.js
│   │   └── test-integration.sh    # Script para ejecutar
│   │
│   ├── personas/
│   │   └── image.processing.test.js
│   │
│   ├── registry/
│   │   └── integration/
│   │       └── service-registry.integration.test.js
│   │
│   └── consulta/
│       └── integration/
│           └── cache-search.integration.test.js
│
└── frontend/
    ├── tests/
    │   ├── js/                    # Tests JavaScript
    │   │   ├── theme-manager.test.js
    │   │   ├── form-validator.test.js
    │   │   └── format-utils.test.js
    │   └── unit/                  # Tests Python
    └── pytest.ini
```

---

## 🐛 Troubleshooting

### Error: Tests unitarios fallan

```bash
# Limpiar cache de Jest
cd services/auth
npm test -- --clearCache
```

### Error: Testcontainers no puede conectarse

```bash
# Verificar que Docker está corriendo
docker ps

# Los tests de integración deben ejecutarse localmente (no dentro de Docker)
```

### Ver reportes de cobertura

```bash
cd services/auth
npm test -- --coverage
# Abre: coverage/lcov-report/index.html
```

### Error: Tests E2E no encuentran elementos

```bash
# Los selectores dependen del HTML real de tu app
# Usa Playwright Inspector para encontrar selectores correctos
cd tests/e2e
npm run test:debug

# Ajusta los selectores en los archivos specs/
```

### Crear fixtures de imágenes para E2E

```powershell
cd tests/e2e/fixtures
Invoke-WebRequest -Uri "https://via.placeholder.com/300" -OutFile "test-photo.jpg"
```

---

## 📚 Documentación Adicional

- **Tests E2E**: Ver `tests/e2e/README.md` para guía completa
- **Tests por servicio**: Ver archivos `TESTS.md` en cada servicio
- **Configuración Jest**: Ver `jest.config.js` o `jest.integration.config.js`
- **Configuración Playwright**: Ver `tests/e2e/playwright.config.js`

---

## ✅ Próximos Pasos

1. **Ejecutar tests E2E** por primera vez y ajustar selectores según HTML real
2. **Crear fixtures de imágenes** para tests de subida de archivos
3. **Arreglar 10 tests unitarios que fallan** (issues menores)
4. **Completar tests de integración** (Escenarios 4 y 5)
5. **Implementar CI/CD** con GitHub Actions para ejecutar tests automáticamente
