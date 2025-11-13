# Tests - Auth Service

## Tests implementados

### Unit

- `auth.middleware.test.js` — middleware de autenticación JWT
- `jwt.token.test.js` — generación y validación de tokens
- `joi.validation.test.js` — validaciones de schemas (password, email, username)
- `helpers.test.js` — funciones auxiliares (preferencias usuario, cache)

### Integration

- `integration/auth-flow.integration.test.js` — registro y login con PostgreSQL y Redis (Testcontainers)
- `integration/preferences.integration.test.js` — actualización de preferencias (CU-010), mock de Docker

## Ejecución

```bash
npm test
```

Requiere Docker para Testcontainers (PostgreSQL + Redis).
