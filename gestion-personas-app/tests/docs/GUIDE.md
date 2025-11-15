# Gestión de Personas - Guía de Testing

## 🧪 Entorno de Pruebas Dockerizado

Este proyecto incluye un entorno de pruebas completamente dockerizado que permite ejecutar tests de forma aislada y reproducible sin afectar el entorno de desarrollo o producción.

## 📋 Requisitos Previos

- Docker Engine 20.10+
- Docker Compose 2.0+
- Make (opcional, pero recomendado)

## 🚀 Inicio Rápido

### Ejecutar todos los tests

```bash
make test
```

Este comando:
1. ✅ Construye el entorno de testing
2. ✅ Inicia PostgreSQL y Redis de prueba
3. ✅ Ejecuta tests de Node.js (todos los servicios)
4. ✅ Ejecuta tests de Python (frontend)
5. ✅ Genera reportes de cobertura
6. ✅ Detiene y limpia el entorno

### Ver resultados

```bash
make test-results
```

Abre los reportes en tu navegador:
- **Reporte consolidado**: `test-results/index.html`
- **Cobertura Python**: `test-results/coverage-python/index.html`
- **Cobertura Node.js**: `test-results/coverage/*/index.html`

## 📦 Comandos Disponibles

### Gestión del Entorno

```bash
# Construir entorno de testing
make test-build

# Iniciar servicios de test (sin ejecutar tests)
make test-up

# Detener servicios de test
make test-down

# Limpiar todo (volumenes, resultados, etc)
make test-clean
```

### Ejecutar Tests

```bash
# Todos los tests (unit + integration + frontend)
make test

# Solo tests unitarios
make test-unit

# Solo tests de integración
make test-integration

# Tests end-to-end
make test-e2e

# Tests del frontend Python
make test-frontend

# Tests de un servicio específico
make test-service
# Luego ingresa: auth, personas, consulta, nlp, log, o gateway
```

### Cobertura y Reportes

```bash
# Generar reporte de cobertura
make test-coverage

# Ver resumen de resultados
make test-results
```

### Desarrollo

```bash
# Watch mode (re-ejecuta tests al modificar código)
make test-watch

# Tests rápidos (solo archivos modificados)
make test-quick
```

## 📊 Estructura de Test Results

```
test-results/
├── index.html                    # Reporte consolidado
├── coverage/                     # Cobertura Node.js
│   ├── auth/
│   ├── personas/
│   ├── consulta/
│   ├── nlp/
│   ├── log/
│   └── gateway/
├── coverage-python/              # Cobertura Python
│   └── index.html
├── coverage-python.xml           # XML para CI/CD
├── report.html                   # Reporte pytest
└── *-results.json               # Resultados individuales
```

## 🔧 Configuración

### Variables de Entorno de Testing

Los tests usan las siguientes variables (configuradas en `docker-compose.test.yml`):

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_pass@postgres-test:5432/test_db
REDIS_URL=redis://redis-test:6379
JWT_SECRET=test-secret-key-12345
SESSION_SECRET=test-session-secret
```

### Bases de Datos de Test

- **PostgreSQL**: Puerto 5433 (host) → 5432 (container)
- **Redis**: Puerto 6380 (host) → 6379 (container)

Ambas usan `tmpfs` (almacenamiento en RAM) para velocidad y limpieza automática.

## 📝 Escribir Tests

### Tests Unitarios (Node.js)

Crear archivo: `services/[servicio]/tests/unit/[feature].test.js`

```javascript
const request = require('supertest');
const app = require('../../index');

describe('Auth Service - Login', () => {
  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({ 
          username: 'admin', 
          password: 'admin123' 
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({ 
          username: 'admin', 
          password: 'wrong' 
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Tests de Integración (Node.js)

Crear archivo: `services/[servicio]/tests/integration/[feature].test.js`

```javascript
const axios = require('axios');
const { Client } = require('pg');

describe('Integration - Database Operations', () => {
  let dbClient;

  beforeAll(async () => {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await dbClient.connect();
  });

  afterAll(async () => {
    await dbClient.end();
  });

  it('should create and retrieve persona', async () => {
    // Crear persona
    const result = await dbClient.query(
      'INSERT INTO personas (numero_documento, primer_nombre) VALUES ($1, $2) RETURNING *',
      ['12345678', 'Test']
    );

    expect(result.rows[0]).toHaveProperty('id');
    
    // Verificar que se puede recuperar
    const check = await dbClient.query(
      'SELECT * FROM personas WHERE numero_documento = $1',
      ['12345678']
    );

    expect(check.rows[0].primer_nombre).toBe('Test');
  });
});
```

### Tests Frontend (Python)

Crear archivo: `frontend/tests/test_[feature].py`

```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    assert b'status' in response.data

def test_login_required(client):
    """Test protected routes require authentication"""
    response = client.get('/personas')
    assert response.status_code == 302  # Redirect to login

def test_login_success(client):
    """Test successful login"""
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'admin123'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    assert b'Dashboard' in response.data
```

## 🎯 Best Practices

### 1. Aislamiento de Tests
- ✅ Cada test debe ser independiente
- ✅ Usar `beforeEach` / `afterEach` para setup/cleanup
- ✅ No depender del orden de ejecución

### 2. Tests Descriptivos
```javascript
// ❌ Malo
it('test 1', () => { ... });

// ✅ Bueno
it('should return 401 when user provides invalid credentials', () => { ... });
```

### 3. Arrange-Act-Assert (AAA)
```javascript
it('should create a new persona', async () => {
  // Arrange
  const personaData = { numero_documento: '12345678', ... };
  
  // Act
  const response = await request(app)
    .post('/personas')
    .send(personaData);
  
  // Assert
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
});
```

### 4. Mocking de Dependencias Externas
```javascript
jest.mock('axios');

it('should handle external API failure', async () => {
  axios.post.mockRejectedValue(new Error('API Down'));
  
  // Test que el servicio maneja el error correctamente
});
```

## 🐛 Debugging Tests

### Ver logs en tiempo real

```bash
# Terminal 1: Iniciar servicios
make test-up

# Terminal 2: Ver logs
docker-compose -f docker-compose.test.yml logs -f

# Terminal 3: Ejecutar tests
docker-compose -f docker-compose.test.yml run --rm test-runner-node npm test
```

### Conectarse a la base de datos de test

```bash
docker exec -it postgres_test psql -U test_user -d test_db
```

### Inspeccionar Redis de test

```bash
docker exec -it redis_test redis-cli
```

## 🔄 CI/CD Integration

### GitHub Actions (ejemplo)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run tests
      run: |
        cd gestion-personas-app
        make test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./test-results/coverage-python.xml
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: test-results/
```

## 📈 Objetivos de Cobertura

| Componente | Target | Actual |
|------------|--------|--------|
| Auth Service | 70% | TBD |
| Personas Service | 70% | TBD |
| Consulta Service | 70% | TBD |
| NLP Service | 60% | TBD |
| Log Service | 70% | TBD |
| Frontend | 70% | TBD |
| Gateway | 70% | TBD |

## 🆘 Troubleshooting

### Error: "Port already in use"

```bash
# Detener servicios de test
make test-down

# Si persiste, verificar qué usa el puerto
lsof -i :5433
lsof -i :6380
```

### Error: "Database connection refused"

```bash
# Verificar que postgres esté listo
docker-compose -f docker-compose.test.yml ps

# Ver logs de postgres
docker-compose -f docker-compose.test.yml logs postgres-test
```

### Tests muy lentos

```bash
# Ejecutar tests en paralelo
docker-compose -f docker-compose.test.yml run --rm test-runner-node npm test -- --maxWorkers=4
```

## 📚 Referencias

- [Jest Documentation](https://jestjs.io/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**¿Necesitas ayuda?** Abre un issue en el repositorio o consulta la documentación adicional en `/docs`.
