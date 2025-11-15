# 🚀 Comandos de Testing - Cheat Sheet

## 📋 Comandos Más Usados

### Ejecución Básica

```bash
# Ejecutar TODOS los tests
make test

# Tests unitarios (rápido, ~1-2 min)
make test-unit

# Tests de integración (~3-5 min)
make test-integration

# Tests E2E (~5-10 min)
make test-e2e

# Tests de frontend Python
make test-frontend
```

### Gestión del Entorno

```bash
# Construir entorno
make test-build

# Iniciar servicios (sin tests)
make test-up

# Detener servicios
make test-down

# Limpiar TODO (volumenes, contenedores, resultados)
make test-clean
```

### Reportes y Cobertura

```bash
# Generar reporte de cobertura
make test-coverage

# Ver resumen de resultados
make test-results

# Abrir reportes en navegador
./view-test-results.sh
```

### Desarrollo

```bash
# Watch mode (re-ejecuta al modificar)
make test-watch

# Solo archivos modificados
make test-quick

# Test de servicio específico
make test-service
# → Luego ingresar: auth, personas, consulta, nlp, log, gateway
```

### Verificación

```bash
# Verificar configuración
./check-test-setup.sh

# Script interactivo con menú
./test-quickstart.sh
```

## 🐳 Docker Compose Directo

### Ejecución Manual

```bash
# Ejecutar todos los tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Solo construir
docker-compose -f docker-compose.test.yml build

# Iniciar servicios en background
docker-compose -f docker-compose.test.yml up -d postgres-test redis-test

# Ver logs
docker-compose -f docker-compose.test.yml logs -f

# Detener todo
docker-compose -f docker-compose.test.yml down -v
```

### Tests Individuales

```bash
# Solo tests de Node.js
docker-compose -f docker-compose.test.yml run --rm test-runner-node

# Solo tests de Python
docker-compose -f docker-compose.test.yml run --rm test-runner-python

# Solo tests E2E
docker-compose -f docker-compose.test.yml run --rm test-runner-e2e
```

### Debugging

```bash
# Ejecutar test con shell interactivo
docker-compose -f docker-compose.test.yml run --rm test-runner-node bash

# Conectarse a PostgreSQL de test
docker exec -it postgres_test psql -U test_user -d test_db

# Conectarse a Redis de test
docker exec -it redis_test redis-cli

# Ver logs de un servicio específico
docker-compose -f docker-compose.test.yml logs -f postgres-test
docker-compose -f docker-compose.test.yml logs -f test-runner-node
```

## 📊 Comandos de Análisis

### Ver Resultados

```bash
# Listar archivos de resultados
find test-results -name "*.html"
find test-results -name "*.xml"
find test-results -name "*.json"

# Ver cobertura en terminal
cat test-results/coverage/*/lcov-report/index.html

# Buscar tests fallidos
grep -r "FAILED" test-results/
```

### Métricas

```bash
# Contar tests ejecutados
find test-results -name "*.json" -exec jq '.numPassedTests + .numFailedTests' {} \;

# Ver porcentaje de cobertura
find test-results/coverage -name "coverage-summary.json" -exec jq '.total' {} \;
```

## 🔧 Comandos Avanzados

### Tests en Paralelo

```bash
# Ejecutar con múltiples workers
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test -- --maxWorkers=4
```

### Tests con Filtros

```bash
# Solo tests que coincidan con patrón
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test -- --testNamePattern="Auth"

# Solo un archivo específico
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test services/auth/tests/unit/jwt.token.test.js
```

### Watch Mode Avanzado

```bash
# Watch con notificaciones
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test -- --watch --notify

# Watch solo tests fallidos
docker-compose -f docker-compose.test.yml run --rm test-runner-node \
  npm test -- --watch --onlyFailures
```

## 🛠️ Utilidades

### Limpiar Solo Resultados

```bash
rm -rf test-results/*
```

### Reinstalar Dependencias

```bash
docker-compose -f docker-compose.test.yml build --no-cache test-runner-node
docker-compose -f docker-compose.test.yml build --no-cache test-runner-python
```

### Verificar Puertos

```bash
# Ver qué está usando los puertos de test
lsof -i :5433  # PostgreSQL test
lsof -i :6380  # Redis test
lsof -i :3011  # Service Registry test
lsof -i :8002  # Gateway test
```

### Ver Contenedores de Test

```bash
# Listar contenedores de test
docker ps -a | grep test

# Ver uso de recursos
docker stats postgres_test redis_test
```

## 📝 Aliases Útiles

Agregar a tu `.bashrc` o `.zshrc`:

```bash
# Aliases para testing
alias t='make test'
alias tu='make test-unit'
alias ti='make test-integration'
alias te='make test-e2e'
alias tc='make test-coverage'
alias tr='make test-results'
alias tq='./test-quickstart.sh'
alias tv='./view-test-results.sh'
alias tcheck='./check-test-setup.sh'

# Alias para docker-compose test
alias dct='docker-compose -f docker-compose.test.yml'
alias dct-up='dct up -d'
alias dct-down='dct down -v'
alias dct-logs='dct logs -f'
alias dct-ps='dct ps'
```

Después:

```bash
source ~/.bashrc  # o ~/.zshrc

# Ahora puedes usar:
t        # En vez de make test
tu       # En vez de make test-unit
tq       # En vez de ./test-quickstart.sh
```

## 🔍 Troubleshooting Rápido

```bash
# Error: "Port in use"
make test-down
docker-compose -f docker-compose.test.yml down -v

# Error: "Cannot connect to database"
docker-compose -f docker-compose.test.yml logs postgres-test

# Error: "Tests timing out"
# Aumentar timeout en jest.config.js: testTimeout: 30000

# Limpiar TODO y empezar de cero
make test-clean
docker system prune -af --volumes
make test-build
make test
```

## 📚 Más Información

- **Guía Completa**: `TESTING-GUIDE.md`
- **Quick Start**: `TESTING-README.md`
- **Setup Summary**: `TEST-SETUP-SUMMARY.md`
- **Makefile**: `make help` para ver todos los comandos

---

**Tip**: Guarda este archivo para referencia rápida. Imprime o mantenlo abierto durante desarrollo.
