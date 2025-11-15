# Tests: Resumen y Cobertura

## Cómo correrlos (preferir Makefile)

```bash
# Backend por servicio
make test-auth
make test-personas
cd gateway && npm test
cd services/registry && npm test
cd services/log && npm test

# E2E (opcional, requiere Docker)
cd tests/e2e && npm test
```

## Estado actual (Nov 2025)

- Registry: 1/1 ✅
- Gateway: 5/5 ✅
- Auth: 124/124 ✅
- Personas: 40/40 ✅
- Log: 6/6 ✅
- Consulta: sin tests
- NLP: omitido por alcance actual

Total backend: 176/176 ✅

E2E: implementados (8 specs). No ejecutados en esta corrida. `07-consulta-nlp.spec.js` está excluido.

## Notas

- Usa `make` cuando sea posible (ver Makefile).
- Los tests de Auth usan Testcontainers (requiere Docker).
- Para E2E, asegúrate de que el stack Docker esté levantado.
