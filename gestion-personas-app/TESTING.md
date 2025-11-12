# Testing Documentation

## ⚠️ IMPORTANTE: Ejecutar Tests en Docker

**Los tests deben ejecutarse DENTRO de los contenedores Docker**, no localmente. Esto asegura que todas las dependencias y el entorno estén configurados correctamente.

```bash
# Ejecutar tests en Docker
docker-compose exec auth-service npm test
docker-compose exec personas-service npm test
```

## 📋 Resumen de Tests Implementados

Se han implementado tests completos con **Jest** y **Supertest** para los siguientes componentes:

### Auth Service

1. **auth.middleware.test.js** (Meta: 90% cobertura)

   - Tests para peticiones sin token (401)
   - Tests para tokens inválidos (401)
   - Tests para tokens expirados (401)
   - Tests para tokens válidos (popula req.user)
   - Tests para tokens en blacklist

2. **joi.validation.test.js** (Meta: 95% cobertura)

   - Validación de schema de password (complejidad, longitud)
   - Validación de schema de email (formato, normalización, TLDs)
   - Validación de schema de username (caracteres permitidos, normalización)
   - Validación de schema de login
   - Validación de schema de registro
   - Casos edge y sanitización (SQL injection, XSS)

3. **jwt.token.test.js** (Meta: 95% cobertura)

   - Generación de tokens con payload correcto
   - Verificación de tokens válidos
   - Manejo de tokens expirados
   - Verificación de firma
   - Validación de estructura del payload
   - Tests de seguridad (timing attacks, algoritmo none)

4. **helpers.test.js** (Meta: 90-100% cobertura)
   - Tests para getUserPreferences (cacheo y base de datos)
   - Tests para invalidateUserPreferencesCache
   - Tests para logTransaction
   - Integración entre helpers
   - Casos edge

### Personas Service

1. **image.processing.test.js** (Meta: 85% cobertura)
   - Redimensionamiento a 300x300 pixels
   - Conversión a formato JPEG
   - Compresión con calidad 80
   - Manejo de diferentes formatos de entrada (PNG, JPEG, WEBP)
   - Pipeline completo de procesamiento
   - Tests de rendimiento y optimización

## 🚀 Instalación de Dependencias

### Para Auth Service

```powershell
cd gestion-personas-app/services/auth
npm install
```

### Para Personas Service

```powershell
cd gestion-personas-app/services/personas
npm install
```

## ▶️ Ejecutar Tests

### Ejecutar todos los tests

```powershell
# En Auth Service
cd gestion-personas-app/services/auth
npm test

# En Personas Service
cd gestion-personas-app/services/personas
npm test
```

### Ejecutar tests con cobertura

```powershell
# En Auth Service
cd gestion-personas-app/services/auth
npm test -- --coverage

# En Personas Service
cd gestion-personas-app/services/personas
npm test -- --coverage
```

### Ejecutar tests en modo watch (desarrollo)

```powershell
# En Auth Service
cd gestion-personas-app/services/auth
npm run test:watch

# En Personas Service
cd gestion-personas-app/services/personas
npm run test:watch
```

### Ejecutar un archivo de test específico

```powershell
# Ejemplo: solo tests de JWT
npm test jwt.token.test.js

# Ejemplo: solo tests de validación Joi
npm test joi.validation.test.js
```

## 📊 Reportes de Cobertura

Después de ejecutar los tests con cobertura, se generará una carpeta `coverage/` con reportes detallados:

```
coverage/
├── lcov-report/
│   └── index.html        # Reporte visual en HTML
├── coverage-final.json   # Datos de cobertura en JSON
└── lcov.info            # Formato LCOV
```

Para ver el reporte en el navegador:

```powershell
# Windows
start coverage/lcov-report/index.html

# O abrir manualmente el archivo en tu navegador
```

## 🎯 Metas de Cobertura

| Componente                  | Meta de Cobertura | Tests                    |
| --------------------------- | ----------------- | ------------------------ |
| Middleware de Autenticación | 90%               | auth.middleware.test.js  |
| Validación de Schemas (Joi) | 95%               | joi.validation.test.js   |
| Generación de Tokens JWT    | 95%               | jwt.token.test.js        |
| Procesamiento de Imágenes   | 85%               | image.processing.test.js |
| Utilidades y Helpers        | 90-100%           | helpers.test.js          |

## 📝 Estructura de Tests

Cada archivo de test sigue esta estructura:

```javascript
describe("Componente Principal", () => {
  describe("Funcionalidad Específica", () => {
    it("debe hacer X cuando Y", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## 🔧 Configuración de Jest

La configuración está en `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!jest.config.js",
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

## 🧪 Tipos de Tests Implementados

### Tests Unitarios

- Validación de schemas Joi
- Generación de tokens JWT
- Procesamiento de imágenes con Sharp
- Funciones helper individuales

### Tests de Integración

- Middleware de autenticación con JWT
- Pipeline completo de procesamiento de imágenes
- Interacción entre helpers (caché + DB)

### Tests de Seguridad

- Prevención de timing attacks
- Validación de algoritmos JWT
- Sanitización de inputs (SQL injection, XSS)
- Tokens en blacklist

## 🐛 Debugging Tests

### Ejecutar en modo verbose

```powershell
npm test -- --verbose
```

### Ver solo tests que fallan

```powershell
npm test -- --onlyFailures
```

### Ejecutar con timeout extendido

```powershell
npm test -- --testTimeout=30000
```

## 💡 Tips para Desarrollo

1. **Usar watch mode durante desarrollo**:

   ```powershell
   npm run test:watch
   ```

2. **Ejecutar solo tests modificados**:

   ```powershell
   npm test -- --onlyChanged
   ```

3. **Generar reporte de cobertura detallado**:

   ```powershell
   npm test -- --coverage --coverageReporters=html text
   ```

4. **Limpiar caché de Jest si hay problemas**:
   ```powershell
   npm test -- --clearCache
   ```

## 📚 Recursos Adicionales

- [Documentación de Jest](https://jestjs.io/docs/getting-started)
- [Documentación de Supertest](https://github.com/ladjs/supertest)
- [Best Practices de Testing](https://testingjavascript.com/)

## ✅ Checklist de Tests

- [x] Middleware de autenticación JWT
- [x] Validación de schemas con Joi
- [x] Generación y verificación de tokens JWT
- [x] Procesamiento de imágenes con Sharp
- [x] Funciones auxiliares y helpers
- [x] Casos edge y manejo de errores
- [x] Tests de seguridad
- [x] Configuración de Jest y scripts

## 🎉 Resultados Esperados

Al ejecutar todos los tests, deberías ver algo como:

```
PASS  auth.middleware.test.js
PASS  joi.validation.test.js
PASS  jwt.token.test.js
PASS  helpers.test.js

Test Suites: 4 passed, 4 total
Tests:       120+ passed, 120+ total
Snapshots:   0 total
Time:        5.234 s

Coverage summary:
Statements   : 92% ( 450/489 )
Branches     : 89% ( 123/138 )
Functions    : 94% ( 67/71 )
Lines        : 92% ( 445/483 )
```

## 🔄 Integración Continua

Los tests pueden integrarse en pipelines CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Run Tests
  run: |
    cd gestion-personas-app/services/auth
    npm test -- --coverage
    cd ../personas
    npm test -- --coverage
```

---

**Nota**: Asegúrate de que las variables de entorno necesarias estén configuradas antes de ejecutar los tests. Algunos tests utilizan mocks, pero otros pueden requerir configuración específica.
