# 🧪 Testing - Guía Rápida

## ✨ Nueva Estructura Limpia y Modular

Los tests ahora están **dentro de cada servicio** - sin archivos extra en la raíz del proyecto:

```
gestion-personas-app/
├── TESTING-GUIDE.md         📖 Esta guía (único archivo en raíz)
├── Makefile                 🔧 Comandos make test-*
│
├── frontend/
│   ├── test.sh              ⭐ Script de tests
│   ├── TESTS.md             📖 Documentación específica
│   ├── tests/
│   │   ├── test_*.py        🐍 Tests Pytest (Flask)
│   │   └── js/*.test.js     📜 Tests Jest (JavaScript)
│   ├── .gitignore           🚫 Ignora coverage*/
│   └── coverage_*/          📊 Reportes (solo si --save-coverage)
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

### **1. Frontend (Flask + JavaScript)**

```bash
cd frontend

# Todos los tests (Python + JavaScript)
./test.sh

# Solo Python (Pytest)
./test.sh --python

# Solo JavaScript (Jest)
./test.sh --javascript

# Test específico
./test.sh test_routes.py
./test.sh theme-manager.test.js

# Con reportes HTML
./test.sh --save-coverage

# Modo desarrollo (JavaScript)
./test.sh --watch
```

### **2. Auth Service**

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

### **3. Personas Service**

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
make test-frontend    # Solo Frontend (Python + JavaScript)
make test-auth        # Solo Auth Service
make test-personas    # Solo Personas Service
make test-all         # Todos los servicios

# Opción 2: Directamente en cada servicio
cd frontend && ./test.sh
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

| Opción              | Descripción               | Ejemplo                          |
| ------------------- | ------------------------- | -------------------------------- |
| _(ninguna)_         | Solo logs, sin archivos   | `./test.sh`                      |
| `--save-coverage`   | Guarda reportes HTML      | `./test.sh --save-coverage`      |
| `--watch`           | Modo desarrollo continuo  | `./test.sh --watch`              |
| `--python`          | Solo tests Python (Flask) | `./test.sh --python` (Frontend)  |
| `--javascript`      | Solo tests JS (Jest)      | `./test.sh --javascript` (Front) |
| `<archivo>.test.js` | Test específico           | `./test.sh jwt.token.test.js`    |

---

## 📊 Ver Reportes

Si ejecutaste con `--save-coverage`:

```bash
# Frontend
cd frontend
wslview coverage_html/index.html      # Python coverage
wslview coverage_js/lcov-report/index.html  # JavaScript coverage

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
docker logs -f flask_app
docker logs -f auth_service
docker logs -f personas_service

# Entrar al contenedor
docker exec -it flask_app sh
docker exec -it auth_service sh
docker exec -it personas_service sh

# Dentro del contenedor Frontend:
pytest -v                    # Python tests
npm test                     # JavaScript tests
exit

# Dentro de contenedores backend:
npm test
npm run test:watch
exit
```

---

## 📚 Documentación Completa

- **Frontend**: `frontend/TESTS.md` (Python + JavaScript)
- **Auth Service**: `services/auth/TESTS.md`
- **Personas Service**: `services/personas/TESTS.md`

---

## 🔥 Ejemplos de Uso

### **Desarrollo Activo**

```bash
# Abre tres terminales

# Terminal 1: Frontend en modo watch (JavaScript)
cd frontend
./test.sh --watch

# Terminal 2: Auth Service en modo watch
cd services/auth
./test.sh --watch

# Terminal 3: Personas Service en modo watch
cd services/personas
./test.sh --watch
```

### **Pre-Commit**

```bash
# Ejecutar tests rápidos antes de commit
cd frontend && ./test.sh && cd ../services/auth && ./test.sh && cd ../personas && ./test.sh

# O usando Makefile
make test-all
```

### **Generar Reportes**

```bash
# Solo cuando necesites reportes HTML detallados
cd frontend && ./test.sh --save-coverage
cd services/auth && ./test.sh --save-coverage
cd services/personas && ./test.sh --save-coverage
```

### **Test Específico**

```bash
# Solo un archivo de tests
cd services/auth
./test.sh auth.middleware.test.js

# Tests específicos en Frontend
cd frontend
./test.sh test_routes.py           # Solo Python
./test.sh theme-manager.test.js    # Solo JavaScript
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
cd frontend
./test.sh

# O
cd services/auth
./test.sh
```

**Resultado**: Solo ves los logs, sin archivos extra. Simple y limpio! ✨
