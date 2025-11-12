# 🧪 Personas Service - Tests

## 🚀 Ejecutar Tests

### **Tests Básicos (solo logs)**

```bash
# Ejecutar todos los tests
./test.sh

# Ejecutar un test específico
./test.sh image.processing.test.js
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

- **image.processing.test.js** - Procesamiento de imágenes con Sharp (55+ tests)

**Meta de cobertura:** 85%

## 🐛 Debugging

```bash
# Ver logs del contenedor
docker logs personas_service

# Entrar al contenedor
docker exec -it personas_service sh

# Limpiar caché de Jest
docker exec personas_service npm test -- --clearCache
```

## 📁 Estructura

```
services/personas/
├── test.sh                    # Script de tests
├── image.processing.test.js   # Tests de procesamiento
├── jest.config.js             # Configuración Jest
└── coverage/                  # Reportes (generados)
```
