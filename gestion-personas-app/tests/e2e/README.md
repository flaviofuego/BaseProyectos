# Tests E2E

## Specs implementados (4)

- `01-login.spec.js` — CU-002 Login
- `02-crear-persona.spec.js` — CU-006 Crear Persona
- `03-consulta-nlp.spec.js` — CU-012 Consulta NLP (temporalmente excluido en config)
- `04-auditoria.spec.js` — Auditoría de sistema

## Ejecución

```bash
# Requisitos
npm install && npx playwright install

# Ejecutar
npm test               # Todos
npm run test:ui        # Con interfaz
npm run test:report    # Reporte

# Desde la raíz (opcional)
cd ../..
./run-e2e-tests.ps1
```

## Estado (Nov 2025)

- Specs: 4 archivos en `specs/` (NLP excluido temporalmente en playwright.config.js)
- Tests totales: Ver cada archivo para conteo específico
- Última corrida: No ejecutados recientemente (backend 100% OK)

Requisitos: stack Docker corriendo; Frontend en http://localhost:5000
