# 📁 Estructura de Testing - Gestión de Personas

```
tests/
├── 📖 README.md                    # Guía de inicio rápido
├── 📂 config/                      # Configuraciones
│   ├── jest.config.js              # Configuración de Jest
│   └── docker-compose.test.yml     # Docker Compose para testing
├── 🐳 docker/                      # Dockerfiles de testing
│   ├── Dockerfile.test.node        # Imagen para tests de Node.js
│   └── Dockerfile.test.e2e         # Imagen para tests E2E
├── 📜 scripts/                     # Scripts de ejecución
│   ├── test-runner.sh              # Runner principal de tests
│   ├── test-quickstart.sh          # Script interactivo de inicio
│   ├── check-test-setup.sh         # Verificar configuración
│   └── view-test-results.sh        # Visualizador de resultados
├── 📚 docs/                        # Documentación
│   ├── GUIDE.md                    # Guía completa de testing
│   ├── CHEATSHEET.md               # Hoja de referencia rápida
│   ├── COVERAGE.md                 # Información de cobertura
│   └── OVERVIEW.md                 # Visión general
├── 🎭 e2e/                         # Tests end-to-end (Playwright)
│   ├── package.json                # Dependencias y scripts de Playwright
│   ├── playwright.config.js        # Configuración de Playwright
│   ├── auth.spec.js
│   ├── specs/
│   │   ├── 01-registro.spec.js
│   │   ├── 02-login.spec.js
│   │   ├── 03-crear-persona.spec.js
│   │   ├── 04-consultar-personas.spec.js
│   │   ├── 05-actualizar-persona.spec.js
│   │   ├── 06-eliminar-persona.spec.js
│   │   ├── 07-consulta-nlp.spec.js
│   │   └── 08-full-journey.spec.js
│   ├── fixtures/
│   └── helpers/
└── 📊 results/                     # Resultados (generado automáticamente)
    ├── index.html                  # Reporte consolidado
    ├── coverage/                   # Cobertura Node.js por servicio
    ├── coverage-python/            # Cobertura Python
    └── playwright-report/          # Reportes E2E
```

## 🚀 Uso Rápido

Desde la raíz del proyecto:

```bash
# Script interactivo (recomendado)
./test

# O con make
make test           # Todos los tests
make test-unit      # Solo unitarios
make test-e2e       # Solo E2E
```

## 📖 Documentación

- **Guía Completa**: `tests/docs/GUIDE.md`
- **Referencia Rápida**: `tests/docs/CHEATSHEET.md`
- **Cobertura**: `tests/docs/COVERAGE.md`

## 🎯 Tests por Ubicación

### Tests de Servicios (Backend)
```
services/
├── auth/tests/
├── personas/tests/
├── consulta/tests/
├── nlp/tests/
└── log/tests/
```

### Tests de Frontend
```
frontend/tests/
├── test_routes.py
└── js/
    ├── format-utils.test.js
    └── theme-manager.test.js
```

### Tests de Gateway
```
gateway/tests/
└── integration/
```

## 🔧 Configuración

La configuración de testing está organizada así:
- **Jest**: `tests/config/jest.config.js` - Para tests unitarios e integración de Node.js
- **Playwright**: `tests/e2e/playwright.config.js` - Para tests E2E (co-ubicado con los tests)
- **Docker Compose**: `tests/config/docker-compose.test.yml` - Para el entorno de testing aislado

## 📊 Resultados

Los resultados se generan automáticamente en `tests/results/`:
- Reportes HTML navegables
- XML para CI/CD
- JSON para análisis programático
- Cobertura de código por servicio

## 🛠️ Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `test-quickstart.sh` | Menú interactivo con todas las opciones |
| `test-runner.sh` | Ejecuta todos los tests |
| `check-test-setup.sh` | Verifica la configuración |
| `view-test-results.sh` | Visualiza resultados en el navegador |

## 💡 Tips

1. **Desarrollo**: Usa `make test-watch` para re-ejecutar tests automáticamente
2. **Debug**: Usa `make test-up` para iniciar el entorno sin ejecutar tests
3. **Limpieza**: Usa `make test-clean` para limpiar todo el entorno de testing
4. **Resultados**: Usa `./test` y selecciona la opción 10 para ver resultados

## 🔗 Enlaces Útiles

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
