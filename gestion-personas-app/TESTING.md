# 🧪 Guía de Testing - Proyecto Gestión de Personas

## 📋 Resumen

Este proyecto cuenta con una suite completa de tests que cubren:

- **Tests Unitarios** (~230 tests): Funciones individuales y componentes aislados
- **Tests de Integración** (~85 tests): Interacción entre servicios y bases de datos

**Total: ~315 tests implementados**

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

---

## 🔧 Tecnologías Usadas

- **Jest**: Framework de testing para JavaScript/Node.js
- **Supertest**: Testing HTTP para APIs REST
- **Testcontainers**: Contenedores Docker efímeros para tests
- **Pytest**: Framework de testing para Python
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

---

## 📁 Estructura de Archivos

```
gestion-personas-app/
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

---

## 📚 Documentación Adicional

- Para detalles de implementación específicos, ver archivos `TESTS.md` en cada servicio
- Para configuración de Jest, ver `jest.config.js` o `jest.integration.config.js`
- Para ver tests específicos, explorar los archivos `*.test.js`

---

## ✅ Próximos Pasos

1. **Arreglar 10 tests unitarios que fallan** (issues menores)
2. **Mejorar cobertura** donde sea necesario (objetivo 85%+)
3. **Completar tests de integración** (Escenarios 4 y 5)
4. **Implementar CI/CD** con GitHub Actions para ejecutar tests automáticamente
