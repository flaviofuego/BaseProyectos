# Tests E2E

## Specs implementados (8)

- `01-registro.spec.js` — CU-001 Registrarse (7 tests)
- `02-login.spec.js` — CU-002 Login (8 tests)
- `03-crear-persona.spec.js` — CU-006 Crear (9 tests)
- `04-consultar-personas.spec.js` — CU-007 Consultar (10 tests)
- `05-actualizar-persona.spec.js` — CU-008 Actualizar (8 tests)
- `06-eliminar-persona.spec.js` — CU-009 Eliminar (7 tests)
- `07-consulta-nlp.spec.js` — CU-012 NLP (12 tests, temporalmente excluido)
- `08-full-journey.spec.js` — CU-FULL: Full journey (login → crear → consultar → logs)

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

- Specs: 8 implementados (NLP excluido)
- Última corrida: no ejecutados (backend 100% OK)

Requisitos: stack Docker corriendo; Frontend en http://localhost:5000
