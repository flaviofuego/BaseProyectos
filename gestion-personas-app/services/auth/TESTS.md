# 🧪 Auth Service - Tests

## 🚀 Ejecutar Tests

### **Tests Básicos (solo logs)**

```bash
# Ejecutar todos los tests
./test.sh

# Ejecutar un test específico
./test.sh auth.middleware.test.js
./test.sh joi.validation.test.js
./test.sh jwt.token.test.js
./test.sh helpers.test.js
```

### **Guardar Reportes HTML**

```bash
# Ejecutar tests y guardar reportes de cobertura
./test.sh --save-coverage

# Ver reportes
xdg-open coverage/lcov-report/index.html  # Linux
wslview coverage/lcov-report/index.html   # WSL
```

### **Modo Watch (Desarrollo)**

```bash
# Ejecuta tests automáticamente al guardar cambios
./test.sh --watch
```

## 📊 Cobertura de Tests

- **auth.middleware.test.js** - Middleware JWT (40+ tests)
- **joi.validation.test.js** - Validación de schemas (70+ tests)
- **jwt.token.test.js** - Tokens JWT (50+ tests)
- **helpers.test.js** - Funciones auxiliares (45+ tests)

**Meta de cobertura:** 85-95%

## 🐛 Debugging

```bash
# Ver logs del contenedor
docker logs auth_service

# Entrar al contenedor
docker exec -it auth_service sh

# Limpiar caché de Jest
docker exec auth_service npm test -- --clearCache
```

## 📁 Estructura

```
services/auth/
├── test.sh                    # Script de tests
├── auth.middleware.test.js    # Tests de middleware
├── joi.validation.test.js     # Tests de validación
├── jwt.token.test.js          # Tests de tokens
├── helpers.test.js            # Tests de helpers
├── jest.config.js             # Configuración Jest
└── coverage/                  # Reportes (generados)
```
