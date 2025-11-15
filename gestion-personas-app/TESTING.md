# Testing

## Cómo ejecutar

```bash
# Backend (unit + integración)
cd services/registry && npm test
cd gateway && npm test
cd services/auth && npm test
cd services/personas && npm test
cd services/log && npm test

# E2E (requiere Docker)
cd tests/e2e && npm test
```

## Estado actual (Nov 2025)

### ✅ Backend: 176/176 (100%)
- Registry: 1/1
- Gateway: 5/5
- Auth: 124/124
- Personas: 40/40
- Log: 6/6
- Consulta: sin tests
- NLP: omitido

### ❓ E2E: pendiente verificación
- 8 specs implementados (NLP excluido)

## Notas
- Gateway: añadido caso específico sin instancias de consulta-service.
- Usa Docker levantado para integración y E2E.
