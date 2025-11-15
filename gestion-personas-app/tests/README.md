# 🧪 Quick Start - Entorno de Pruebas

## 🚀 Inicio Rápido

### Opción 1: Script Interactivo (Recomendado)

```bash
./tests/scripts/test-quickstart.sh
```

Este script te guiará a través de todas las opciones disponibles.

### Opción 2: Comandos Make

```bash
# Ejecutar TODOS los tests
make test

# Solo tests unitarios (rápido)
make test-unit

# Solo tests de integración
make test-integration

# Tests del frontend Python
make test-frontend

# Tests end-to-end
make test-e2e

# Generar reporte de cobertura
make test-coverage

# Ver resultados
make test-results
```

## 📊 Ver Resultados

```bash
# Script interactivo
./tests/scripts/view-test-results.sh

# O manualmente
open tests/results/index.html                      # Reporte consolidado
open tests/results/coverage-python/index.html      # Cobertura Python
open tests/results/coverage/auth/index.html        # Cobertura Auth Service
```

## 🔧 Comandos de Gestión

```bash
# Construir entorno de testing
make test-build

# Iniciar servicios de test (sin ejecutar tests)
make test-up

# Detener servicios de test
make test-down

# Limpiar todo
make test-clean
```

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
