# Tests - NLP Service

## Tests implementados

### Unit

- `tests/unit/nlp.controller.test.js` (2 tests)
  - Validación de pregunta no vacía
  - Normalización de preguntas

### Integration

- `tests/integration/nlp.integration.test.js` (3 tests contra Docker)
  - Responde OK con pregunta válida
  - Retorna 400 si pregunta vacía
  - Retorna 400 si falta pregunta

## Ejecución

```bash
npm test
```

## Requisitos

- Stack Docker corriendo (acceso vía Gateway en localhost:8001)
