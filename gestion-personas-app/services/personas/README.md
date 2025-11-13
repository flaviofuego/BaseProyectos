# Tests - Personas Service

## Tests implementados

- **Unit**: `image.processing.test.js` — procesamiento y validación de imágenes (Sharp)
- **Integration**: `tests/integration/personas.integration.test.js` — CRUD vía Gateway
  - Crear persona (201)
  - Duplicado documento (409)
  - Existe por documento
  - Delete persona

## Ejecución

```bash
npm test
```

Los tests de integración requieren Gateway corriendo (Docker stack).
