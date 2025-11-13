# Tests - Log Service

## Tests implementados

### Unit

- `tests/unit/log.controller.test.js` (3 tests)
  - Valida payload correcto de log
  - Rechaza payload sin transaction_type
  - Rechaza payload con status inválido

### Integration

- `tests/integration/log.integration.test.js` (3 tests contra Docker)
  - Ingesta logs válidos
  - Consulta logs por filtro
  - Rechaza payload inválido

## Ejecución

```bash
npm test
```

## Requisitos

- Stack Docker corriendo (acceso vía Gateway en localhost:8001)
