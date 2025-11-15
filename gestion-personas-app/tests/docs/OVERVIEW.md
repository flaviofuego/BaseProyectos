# Testing

## Estructura

- **E2E**: `tests/e2e/` (Playwright, 8 specs incluyendo full journey)
- **Unit/Integration**: por módulo en `services/*/tests/`, `gateway/tests/`, `frontend/tests/`

## Ejecución rápida

### E2E (requiere stack Docker corriendo)

```bash
# Todos los E2E
cd tests/e2e
npm test

# O usando el runner PowerShell desde raíz
.\run-e2e-tests.ps1

# Un spec específico (ej. full journey)
cd tests/e2e
npx playwright test specs/08-full-journey.spec.js
```

### Por módulo

```bash
# Gateway (integración contra Docker)
cd gateway && npm test

# Auth (unit + integración con Testcontainers)
cd services/auth && npm test

# NLP (unit + integración vía Gateway)
cd services/nlp && npm test

# Log (unit + integración vía Gateway)
cd services/log && npm test

# Personas (unit imagen + integración vía Gateway)
cd services/personas && npm test

# Consulta (pendiente implementar)
cd services/consulta && npm test

# Registry (unit + integración)
cd services/registry && npm test        # unit tests
cd services/registry && npm run test:integration
cd services/registry && npm run test:all  # ambos

# Frontend JS
cd frontend/tests && npm test

# Frontend Python
cd frontend/tests && pytest
```

## Cobertura según guía

### Módulo 1: Service Registry ✅

- **Integración**: registro, heartbeat, descubrimiento, deregistro, múltiples instancias
- **Unit**: cleanup job automático (fake timers para simular timeout)

### Módulo 2: API Gateway ✅

- Rechazo sin autenticación (401)
- Enrutamiento a servicio saludable
- Manejo de servicio no disponible (404)
- Rate limiting (429)

### Módulo 3: Auth Service ✅

- Login exitoso y fallido (CU-001)
- Registro con validaciones
- Actualización de preferencias (CU-010) con mock de Docker
- Sesiones Redis

### Módulo 4: Personas Service ✅

- **Unit**: procesamiento de imágenes (Sharp)
- **Integración vía Gateway**: crear (201), duplicado (409), existe por doc, delete

### Módulo 5: NLP Service ✅

- Intent: Database Query, Semantic Search, Security Risk
- Unit + integración vía Gateway

### Módulo 6: Log Service ✅

- Ingesta (CREATE)
- Consulta por user_id y numero_documento (paginado)

### Módulo 7: E2E Full Journey ✅

- `08-full-journey.spec.js`: login → crear persona → consultar → verificar logs (CU-003 + CU-004 + CU-009)
- CU-001 (Registro), CU-002 (Login), CU-006 (Crear), CU-007 (Consultar), CU-008 (Actualizar), CU-009 (Eliminar)

## Notas

- **CU-012 (NLP E2E)** temporalmente excluido en `playwright.config.js`
- Tests de integración corren contra Docker (stack debe estar levantado)
- Testcontainers usado en Auth para PostgreSQL + Redis (requiere Docker)
- Ver `README.md` en cada módulo para detalles específicos
- E2E actual: 47 specs ejecutados, 34 pasando (13 con fallos por estabilizar)
