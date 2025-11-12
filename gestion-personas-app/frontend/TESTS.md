# Tests - Frontend

Documentación de tests para el servicio Frontend (Flask + JavaScript).

## 📋 Contenido

- **Python Tests (Pytest)**: Tests de rutas Flask, integración API
- **JavaScript Tests (Jest)**: Tests de utilidades cliente y componentes UI

## 🚀 Ejecución Rápida

```bash
# Todos los tests (Python + JavaScript)
./test.sh

# Solo Python
./test.sh --python

# Solo JavaScript
./test.sh --javascript

# Con cobertura
./test.sh --save-coverage

# Modo watch (JavaScript)
./test.sh --watch

# Test específico
./test.sh test_routes.py
./test.sh theme-manager.test.js
```

## 🐍 Python Tests (Pytest)

### Estructura

```
frontend/
├── tests/
│   ├── __init__.py
│   ├── test_routes.py        # Tests de rutas Flask
│   └── js/                   # Tests JavaScript
├── conftest.py               # Fixtures compartidas
├── pytest.ini                # Configuración Pytest
└── requirements-test.txt     # Dependencias de test
```

### Cobertura de Tests

#### 1. test_routes.py

**Objetivo**: 80% de cobertura de rutas Flask

**Tests incluidos**:

- ✅ `TestLoginRoute`: Login, autenticación, redirecciones
- ✅ `TestRegisterRoute`: Registro de usuarios, validaciones
- ✅ `TestDashboardRoute`: Vista dashboard, datos agregados
- ✅ `TestConsultarPersonasRoute`: Consulta de personas, filtros
- ✅ `TestCrearPersonaRoute`: Creación de personas, validación
- ✅ `TestModificarPersonaRoute`: Modificación de personas
- ✅ `TestBorrarPersonaRoute`: Eliminación de personas
- ✅ `TestBulkUploadRoute`: Carga masiva, procesamiento CSV
- ✅ `TestErrorHandlers`: Manejo de errores 404, 500

**Ejemplo de uso**:

```bash
# Ejecutar todos los tests de rutas
pytest tests/test_routes.py -v

# Test específico
pytest tests/test_routes.py::TestLoginRoute::test_login_success -v

# Con cobertura
pytest tests/test_routes.py --cov=app --cov-report=html
```

### Fixtures Disponibles (conftest.py)

```python
@pytest.fixture
def app():
    """Aplicación Flask para testing"""

@pytest.fixture
def client(app):
    """Cliente de test"""

@pytest.fixture
def mock_requests(mocker):
    """Mock de requests para APIs"""
```

### Configuración (pytest.ini)

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    --disable-warnings
```

## 📜 JavaScript Tests (Jest)

### Estructura

```
frontend/
├── tests/
│   └── js/
│       ├── setup.js                    # Configuración Jest
│       ├── theme-manager.test.js       # Tests ThemeManager
│       ├── form-validator.test.js      # Tests validación
│       └── format-utils.test.js        # Tests formateo
├── static/
│   └── js/
│       ├── theme-manager.js            # Código fuente
│       ├── form-validator.js           # Utilidades validación
│       └── format-utils.js             # Utilidades formateo
└── package.json                        # Configuración Jest
```

### Cobertura de Tests

#### 1. theme-manager.test.js

**Objetivo**: 85% de cobertura

**Tests incluidos**:

- ✅ Inicialización y detección de tema
- ✅ Cambio de tema (light/dark)
- ✅ Persistencia en localStorage
- ✅ Manejo de loaders
- ✅ Atributos de accesibilidad (aria-labels)
- ✅ Event listeners y callbacks
- ✅ Transiciones y animaciones

**Cobertura**: ~85%

#### 2. form-validator.test.js

**Objetivo**: 90% de cobertura

**Tests incluidos**:

- ✅ Validación numérica (`isNumericOnly`)
- ✅ Validación de documento (`validateNumeroDocumento`)
- ✅ Validación de email
- ✅ Validación de contraseñas (seguridad y coincidencia)
- ✅ Validación de username
- ✅ Validación de nombres
- ✅ Validación de teléfonos
- ✅ Validación completa de formularios
- ✅ Display de errores

**Cobertura**: ~90%

#### 3. format-utils.test.js

**Objetivo**: 95% de cobertura

**Tests incluidos**:

- ✅ Formateo de fechas (`formatDate`)
- ✅ Transformaciones de texto (title case, capitalize)
- ✅ Formateo de números y moneda
- ✅ Formateo de teléfonos
- ✅ Truncado de texto
- ✅ Formateo de bytes
- ✅ Formateo de porcentajes
- ✅ Tiempo relativo (`formatRelativeTime`)
- ✅ Sanitización HTML
- ✅ Generación de slugs

**Cobertura**: ~95%

### Ejemplo de uso

```bash
# Ejecutar todos los tests
npm test

# Test específico
npm test -- theme-manager.test.js

# Con cobertura
npm run test:coverage

# Modo watch
npm run test:watch
```

### Configuración (package.json)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "testMatch": ["**/tests/js/**/*.test.js"],
    "collectCoverageFrom": ["static/js/**/*.js"],
    "coverageDirectory": "coverage_js",
    "setupFilesAfterEnv": ["<rootDir>/tests/js/setup.js"]
  }
}
```

## 📊 Reportes de Cobertura

### Python (htmlcov)

```bash
./test.sh --python --save-coverage

# Abrir reporte
open coverage_html/index.html  # Mac/Linux
start coverage_html/index.html # Windows
```

### JavaScript (coverage_js)

```bash
./test.sh --javascript --save-coverage

# Abrir reporte
open coverage_js/lcov-report/index.html  # Mac/Linux
start coverage_js/lcov-report/index.html # Windows
```

## 🎯 Objetivos de Cobertura

| Componente    | Framework | Objetivo | Estado |
| ------------- | --------- | -------- | ------ |
| Flask Routes  | Pytest    | 80%      | ✅     |
| ThemeManager  | Jest      | 85%      | ✅     |
| FormValidator | Jest      | 90%      | ✅     |
| FormatUtils   | Jest      | 95%      | ✅     |

## 🔧 Instalación de Dependencias

### Python

```bash
# Dentro del contenedor
pip install -r requirements-test.txt

# Paquetes incluidos:
# - pytest
# - pytest-flask
# - pytest-cov
# - pytest-mock
# - coverage
```

### JavaScript

```bash
# Dentro del contenedor
npm install

# Paquetes incluidos:
# - jest
# - @testing-library/dom
# - @testing-library/jest-dom
# - jest-environment-jsdom
```

## 🐛 Troubleshooting

### "Contenedor no está corriendo"

```bash
cd ../.. && make dev
```

### "ModuleNotFoundError: No module named 'pytest'"

```bash
docker exec flask_app pip install -r requirements-test.txt
```

### "npm: command not found"

```bash
# Instalar Node.js en el contenedor
docker exec flask_app apt-get update && apt-get install -y nodejs npm
```

### Tests de Python fallan

```bash
# Ver logs detallados
./test.sh --python

# Test individual con verbose
docker exec flask_app pytest tests/test_routes.py::TestLoginRoute -vv
```

### Tests de JavaScript fallan

```bash
# Ver logs detallados
docker exec flask_app npm test -- --verbose

# Limpiar cache de Jest
docker exec flask_app npm test -- --clearCache
```

## 📝 Escribiendo Nuevos Tests

### Python (Pytest)

```python
# tests/test_nueva_funcionalidad.py
import pytest

class TestNuevaFuncionalidad:
    """Tests para nueva funcionalidad"""

    def test_caso_exitoso(self, client, mock_requests):
        """Test caso exitoso"""
        # Arrange
        mock_requests.post.return_value.status_code = 200
        mock_requests.post.return_value.json.return_value = {'status': 'success'}

        # Act
        response = client.post('/nueva-ruta', data={'campo': 'valor'})

        # Assert
        assert response.status_code == 200
        assert b'success' in response.data
```

### JavaScript (Jest)

```javascript
// tests/js/nueva-utilidad.test.js
import { nuevaFuncion } from "../../static/js/nueva-utilidad.js";

describe("nuevaFuncion", () => {
  test("debe procesar correctamente", () => {
    // Arrange
    const input = "test";

    // Act
    const result = nuevaFuncion(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

## 🚀 CI/CD Integration

```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          cd frontend
          ./test.sh --save-coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## 📚 Recursos

- [Pytest Documentation](https://docs.pytest.org/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Flask Testing](https://flask.palletsprojects.com/en/2.3.x/testing/)

---

**Última actualización**: 2024
**Mantenedor**: Equipo de Desarrollo
