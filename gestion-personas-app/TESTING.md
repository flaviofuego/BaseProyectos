# Testing

## Estructura

- **E2E**: `tests/e2e/` (Playwright, 7 specs)
- **Unit/Integration**: por módulo en `services/*/tests/`, `gateway/tests/`, `frontend/tests/`

## Ejecución rápida

### E2E (requiere stack Docker corriendo)

```bash
cd tests/e2e
npm test
```

### Por módulo

```bash
# Gateway
cd gateway && npm test

# Auth
cd services/auth && npm test

# NLP
cd services/nlp && npm test

# Log
cd services/log && npm test

# Personas
cd services/personas && npm test

# Consulta
cd services/consulta && npm test

# Registry
cd services/registry && npm test

# Frontend JS
cd frontend/tests && npm test

# Frontend Python
cd frontend/tests && pytest
```

## Notas

- CU-012 (NLP E2E) temporalmente excluido en `playwright.config.js`
- Tests de integración corren contra Docker (stack debe estar levantado)
- Ver README.md en cada módulo para detalles específicos
