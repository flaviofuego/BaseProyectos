# Tests - Gateway

## Tests implementados

- `tests/integration/gateway.integration.test.js` (4 tests contra Docker)
  - Rechaza peticiones sin autenticación
  - Enruta a servicio saludable (Service Registry)
  - Responde error cuando servicio no está disponible
  - Aplica rate limiting básico

## Ejecución

```bash
npm test
```

## Requisitos

- Stack Docker corriendo (Gateway + servicios en localhost:8001)
