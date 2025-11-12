# Tests E2E - Gestión de Personas

Tests End-to-End con Playwright para validar flujos completos de usuario.

## 📋 Casos de Uso Implementados

### ✅ Prioridad Alta (3 CU)

- **CU-001**: Registrarse (7 tests)
- **CU-002**: Iniciar Sesión (8 tests)
- **CU-006**: Crear Persona con imagen (9 tests)

### ✅ Prioridad Media (3 CU)

- **CU-007**: Consultar Personas (10 tests)
- **CU-008**: Actualizar Persona (8 tests)
- **CU-009**: Eliminar Persona (7 tests)

### ✅ Prioridad Baja (1 CU)

- **CU-012**: Consulta NLP (12 tests)

**Total: 7 Casos de Uso, ~61 tests**

---

## 🚀 Instalación

```bash
cd tests/e2e
npm install
npx playwright install  # Instalar navegadores
```

---

## ▶️ Ejecutar Tests

### Todos los tests

```bash
npm test
```

### Solo un archivo

```bash
npm test specs/01-registro.spec.js
```

### Con interfaz UI

```bash
npm run test:ui
```

### En modo debug

```bash
npm run test:debug
```

### Solo Chrome

```bash
npm run test:chrome
```

---

## 📊 Ver Reportes

```bash
npm run test:report
```

Abre el reporte HTML con screenshots y videos de fallos.

---

## ⚙️ Configuración

### Variables de entorno

Crear archivo `.env`:

```bash
BASE_URL=http://localhost:5001
```

### Ajustar timeout

Editar `playwright.config.js`:

```javascript
timeout: 60 * 1000; // 60 segundos
```

---

## 📁 Estructura

```
tests/e2e/
├── specs/                    # Tests organizados por CU
│   ├── 01-registro.spec.js
│   ├── 02-login.spec.js
│   ├── 03-crear-persona.spec.js
│   ├── 04-consultar-personas.spec.js
│   ├── 05-actualizar-persona.spec.js
│   ├── 06-eliminar-persona.spec.js
│   └── 07-consulta-nlp.spec.js
├── fixtures/                 # Archivos de prueba (imágenes, etc)
│   └── README.md
├── helpers/                  # Funciones reutilizables
│   └── test-helpers.js
├── playwright.config.js      # Configuración Playwright
└── package.json
```

---

## 🖼️ Fixtures (Archivos de Prueba)

Los tests de subida de imágenes requieren fixtures. Ver `fixtures/README.md` para instrucciones.

**Opción rápida**: Descargar imágenes de prueba:

```powershell
cd fixtures
Invoke-WebRequest -Uri "https://via.placeholder.com/300" -OutFile "test-photo.jpg"
```

---

## 🛠️ Helpers Disponibles

```javascript
const {
  login,
  crearPersonaPrueba,
  buscarPersonaPorDocumento,
} = require("../helpers/test-helpers");

test("mi test", async ({ page }) => {
  await login(page);
  const persona = await crearPersonaPrueba(page, { nombre: "Juan" });
  await buscarPersonaPorDocumento(page, persona.numero_documento);
});
```

Ver `helpers/test-helpers.js` para todas las funciones disponibles.

---

## 📝 Requisitos Previos

1. **Docker Compose corriendo**:

   ```bash
   cd ../..
   docker compose up -d
   ```

2. **Aplicación accesible en http://localhost:5001**

3. **Datos de prueba**:
   - Usuario admin: `admin@example.com` / `admin123`
   - Base de datos poblada con algunas personas

---

## ❗ Troubleshooting

### "Timeout waiting for navigation"

- Verificar que Docker Compose está corriendo
- Aumentar timeout en `playwright.config.js`

### "Element not found"

- Los selectores pueden variar según tu HTML
- Ajustar selectores en los specs
- Usar Playwright Inspector: `npm run test:debug`

### Imágenes de fixtures no encontradas

- Los tests continuarán sin imágenes
- Ver `fixtures/README.md` para crearlas

### Tests fallan por datos existentes

- Limpiar BD de prueba
- Los tests generan datos únicos con timestamps

---

## 🎯 Próximos Pasos

- [ ] Ajustar selectores según HTML real
- [ ] Crear fixtures de imágenes
- [ ] Configurar CI/CD para ejecutar E2E
- [ ] Agregar tests de performance
- [ ] Agregar tests de accesibilidad

---

## 📖 Documentación

- [Playwright Docs](https://playwright.dev)
- [Guía de Tests del Proyecto](../../TESTING.md)
