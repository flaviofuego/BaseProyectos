# 🚀 Quick Start - Ejecutar Tests

## Comandos Rápidos (PowerShell)

### Instalar Dependencias

```powershell
# Auth Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\auth
npm install

# Personas Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\personas
npm install
```

### Ejecutar Todos los Tests

```powershell
# Auth Service - Todos los tests con cobertura
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\auth
npm test

# Personas Service - Todos los tests con cobertura
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\personas
npm test
```

### Ejecutar Tests Individuales

```powershell
# Auth Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\auth

# Solo middleware
npm test auth.middleware.test.js

# Solo validación Joi
npm test joi.validation.test.js

# Solo JWT tokens
npm test jwt.token.test.js

# Solo helpers
npm test helpers.test.js
```

```powershell
# Personas Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\personas

# Solo procesamiento de imágenes
npm test image.processing.test.js
```

### Ver Reportes de Cobertura

```powershell
# Auth Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\auth
npm test -- --coverage
start coverage\lcov-report\index.html

# Personas Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\personas
npm test -- --coverage
start coverage\lcov-report\index.html
```

### Modo Watch (Desarrollo)

```powershell
# Auth Service - Ejecuta tests automáticamente al guardar cambios
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\auth
npm run test:watch

# Personas Service
cd c:\Users\jhona\Documentos\SoftwareDesignProject\BaseProyectos\gestion-personas-app\services\personas
npm run test:watch
```

---

## 📋 Checklist de Verificación

Antes de ejecutar los tests, verifica:

- [ ] Node.js instalado (v16+)
- [ ] npm instalado
- [ ] Navegador web (para ver reportes HTML)

---

## 🎯 Tests Implementados

### Auth Service (4 archivos)

- ✅ `auth.middleware.test.js` - Middleware de autenticación JWT
- ✅ `joi.validation.test.js` - Validación de schemas
- ✅ `jwt.token.test.js` - Generación y verificación de tokens
- ✅ `helpers.test.js` - Funciones auxiliares

### Personas Service (1 archivo)

- ✅ `image.processing.test.js` - Procesamiento con Sharp

---

## 📊 Resultados Esperados

Al ejecutar `npm test`, deberías ver:

```
PASS  auth.middleware.test.js
PASS  joi.validation.test.js
PASS  jwt.token.test.js
PASS  helpers.test.js

Test Suites: 4 passed, 4 total
Tests:       150+ passed, 150+ total
Time:        ~5 segundos

Coverage:
- Statements: 90%+
- Branches: 85%+
- Functions: 90%+
- Lines: 90%+
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'jest'"

```powershell
npm install
```

### Tests fallan por timeouts

```powershell
npm test -- --testTimeout=30000
```

### Limpiar caché de Jest

```powershell
npm test -- --clearCache
```

### Ver logs detallados

```powershell
npm test -- --verbose
```

---

## 📚 Documentación

Para más detalles, ver:

- `TESTING.md` - Documentación completa
- `TESTS-SUMMARY.md` - Resumen de implementación
- `README-DEV.md` - Documentación del proyecto

---

## ✨ Tips

1. **Usar watch mode** durante desarrollo para feedback inmediato
2. **Ejecutar con cobertura** antes de hacer commit
3. **Revisar reportes HTML** para ver qué falta cubrir
4. **Tests específicos** para debugging rápido

---

**¡Listo para ejecutar! 🎉**
