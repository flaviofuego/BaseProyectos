# 🧪 Testing - Guía Rápida

## ✨ Nueva Estructura Limpia y Modular

Los tests ahora están **dentro de cada servicio** - sin archivos extra en la raíz del proyecto:

```
gestion-personas-app/
├── TESTING-GUIDE.md         📖 Esta guía (único archivo en raíz)
├── Makefile                 🔧 Comandos make test-*
│
└── services/
    ├── auth/
    │   ├── test.sh          ⭐ Script de tests
    │   ├── TESTS.md         📖 Documentación específica
    │   ├── *.test.js        🧪 4 archivos de tests (124 tests)
    │   ├── .gitignore       🚫 Ignora coverage/
    │   └── coverage/        📊 Reportes (solo si --save-coverage)
    │
    └── personas/
        ├── test.sh          ⭐ Script de tests
        ├── TESTS.md         📖 Documentación específica
        ├── *.test.js        🧪 1 archivo de tests (55+ tests)
        ├── .gitignore       🚫 Ignora coverage/
        └── coverage/        📊 Reportes (solo si --save-coverage)
```

**✅ Ventajas:**

- Sin archivos de tests en la raíz
- Cada servicio es independiente
- Los reportes NO se crean por defecto
- Git limpio (coverage/ ignorado)
- Desarrollo modular y rápido

---

## 🚀 Uso Rápido

### **1. Auth Service**

```bash
cd services/auth

# Solo ver logs
./test.sh

# Test específico
./test.sh jwt.token.test.js

# Con reportes HTML
./test.sh --save-coverage

# Modo desarrollo
./test.sh --watch
```

### **2. Personas Service**

```bash
cd services/personas

# Solo ver logs
./test.sh

# Test específico
./test.sh image.processing.test.js

# Con reportes HTML
./test.sh --save-coverage

# Modo desarrollo
./test.sh --watch
```

---

## ⚡ Comandos Rápidos

```bash
# Desde WSL/Ubuntu
cd /mnt/c/Users/jhona/Documentos/SoftwareDesignProject/BaseProyectos/gestion-personas-app

# Opción 1: Usando Makefile (recomendado)
make test-auth        # Solo Auth Service
make test-personas    # Solo Personas Service
make test-all         # Todos los servicios

# Opción 2: Directamente en cada servicio
cd services/auth && ./test.sh
cd services/personas && ./test.sh
```

---

## 🎯 Ventajas de esta Estructura

✅ **Modular**: Cada servicio tiene sus propios tests
✅ **Sin archivos extra**: Por defecto solo muestra logs
✅ **Desarrollo rápido**: `./test.sh --watch` en cada servicio
✅ **Reportes opcionales**: Solo si los necesitas con `--save-coverage`
✅ **Git limpio**: Los reportes están en `.gitignore`
✅ **Independiente**: Prueba cada servicio por separado

---

## 📋 Prerequisitos

1. **Servicios corriendo**:

   ```bash
   make dev  # o make up
   ```

2. **Verificar contenedores**:
   ```bash
   docker ps | grep -E "auth_service|personas_service"
   ```

---

## 🎨 Opciones de test.sh

| Opción              | Descripción              | Ejemplo                       |
| ------------------- | ------------------------ | ----------------------------- |
| _(ninguna)_         | Solo logs, sin archivos  | `./test.sh`                   |
| `--save-coverage`   | Guarda reportes HTML     | `./test.sh --save-coverage`   |
| `--watch`           | Modo desarrollo continuo | `./test.sh --watch`           |
| `<archivo>.test.js` | Test específico          | `./test.sh jwt.token.test.js` |

---

## 📊 Ver Reportes

Si ejecutaste con `--save-coverage`:

```bash
# Auth Service
cd services/auth
wslview coverage/lcov-report/index.html

# Personas Service
cd services/personas
wslview coverage/lcov-report/index.html
```

---

## 🐛 Debugging

```bash
# Ver logs en tiempo real
docker logs -f auth_service
docker logs -f personas_service

# Entrar al contenedor
docker exec -it auth_service sh
docker exec -it personas_service sh

# Dentro del contenedor:
npm test
npm run test:watch
exit
```

---

## 📚 Documentación Completa

- **Auth Service**: `services/auth/TESTS.md`
- **Personas Service**: `services/personas/TESTS.md`

---

## 🔥 Ejemplos de Uso

### **Desarrollo Activo**

```bash
# Abre dos terminales

# Terminal 1: Auth Service en modo watch
cd services/auth
./test.sh --watch

# Terminal 2: Personas Service en modo watch
cd services/personas
./test.sh --watch
```

### **Pre-Commit**

```bash
# Ejecutar tests rápidos antes de commit
cd services/auth && ./test.sh && cd ../personas && ./test.sh
```

### **Generar Reportes**

```bash
# Solo cuando necesites reportes HTML detallados
cd services/auth && ./test.sh --save-coverage
cd services/personas && ./test.sh --save-coverage
```

### **Test Específico**

```bash
# Solo un archivo de tests
cd services/auth
./test.sh auth.middleware.test.js
```

---

## ✨ Tips

1. **Desarrollo diario**: Usa `./test.sh --watch`
2. **Pre-commit**: Solo `./test.sh` (sin guardar reportes)
3. **Revisión profunda**: `./test.sh --save-coverage`
4. **Los reportes NO se suben** a Git (están en `.gitignore`)

---

## 🎉 ¡Listo!

```bash
# Navega a un servicio y ejecuta
cd services/auth
./test.sh
```

**Resultado**: Solo ves los logs, sin archivos extra. Simple y limpio! ✨
