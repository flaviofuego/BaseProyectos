# Solución de Errores - Frontend Next.js

## 🐛 Problemas Identificados y Solucionados

### 1. **Error de Referencias en Button Component** ✅

**Problema:**
```
Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?
```

**Causa:** El componente `Button` no estaba usando `React.forwardRef` para pasar referencias correctamente.

**Solución:** Actualizado el componente Button en `/components/ui/button.tsx`:

```tsx
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'
```

### 2. **URLs Incorrectas de API** ✅

**Problema:**
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
:5000/api/auth/register:1
```

**Causa:** Todas las páginas estaban usando `http://localhost:5000` (frontend Flask) en lugar de `http://localhost:8001` (API Gateway).

**Archivos Corregidos:**
- ✅ `app/register/page.tsx`
- ✅ `app/login/page.tsx` 
- ✅ `app/dashboard/page.tsx`
- ✅ `app/personas/page.tsx`
- ✅ `app/personas/crear/page.tsx`
- ✅ `app/personas/[id]/editar/page.tsx`
- ✅ `app/nlp/page.tsx`
- ✅ `app/logs/page.tsx`
- ✅ `app/auth/callback/page.tsx`

**Cambio realizado:** `localhost:5000` → `localhost:8001`

### 3. **Configuración de Variables de Entorno** ✅

**Problema:** Faltaba archivo `.env.local` con configuración correcta.

**Solución:** Creado `.env.local`:

```bash
# Next.js Configuration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=dev-zg58kn127grr7sf6.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=eKRUA6UlzZX8DKuCi247gryxqPc8r293
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/auth/callback

# App Configuration
NEXT_PUBLIC_APP_NAME=Sistema de Gestión de Personas - Dev
NEXT_PUBLIC_APP_VERSION=1.0.0-dev

# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1
```

## 🔧 Archivos de Configuración Creados

### 1. **API Configuration** (`lib/api-config.ts`)
```typescript
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api',
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      auth0Login: '/auth/login/auth0',
      verifyToken: '/auth/verify-token'
    },
    // ... más endpoints
  }
} as const;

export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};
```

## 🚀 Pasos para Probar la Corrección

### 1. **Iniciar Servicios Backend**
```powershell
# En el directorio raíz del proyecto
cd C:\Users\flavi\OneDrive\Escritorio\nuevo\BaseProyectos\gestion-personas-app

# Opción 1: Con Makefile
make dev

# Opción 2: Con Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verificar que los servicios estén corriendo
docker ps
```

**Servicios esperados:**
- 🗄️ **PostgreSQL** - Puerto 5432
- 🔴 **Redis** - Puerto 6379
- 🔗 **API Gateway** - Puerto 8001
- 🔐 **Auth Service** - Puerto 3001
- 👥 **Personas Service** - Puerto 3002
- 🔍 **Consulta Service** - Puerto 3003
- 🤖 **NLP Service** - Puerto 3004
- 📝 **Log Service** - Puerto 3005

### 2. **Iniciar Frontend Next.js**
```powershell
# En el directorio del frontend
cd frontend-react

# Instalar dependencias (si no están instaladas)
npm install
# o
pnpm install

# Iniciar servidor de desarrollo
npm run dev
# o
pnpm dev

# También puedes usar el script personalizado
.\start-dev.ps1
```

### 3. **Verificar Conectividad**

#### 3.1 Test API Gateway
```powershell
# Test básico del gateway
curl http://localhost:8001/health

# Test con navegador
# Ir a: http://localhost:8001/health
```

#### 3.2 Test Frontend
```
# Abrir navegador en:
http://localhost:3000

# Verificar que no hay errores CORS en la consola
```

### 4. **Test de Registro (El Problema Original)**

1. **Abrir el frontend**: http://localhost:3000
2. **Ir a Registro**: Click en "¿No tienes cuenta? Regístrate"
3. **Llenar formulario**:
   - Usuario: `testuser`
   - Email: `test@example.com`
   - Contraseña: `password123`
   - Confirmar contraseña: `password123`
4. **Enviar formulario**
5. **Verificar**:
   - ✅ Sin errores de CORS en consola
   - ✅ Sin errores de referencia del Button
   - ✅ Conecta a puerto 8001 en lugar de 5000

## 🔍 Debugging

### Problemas Comunes

#### 1. **Error "Connection Refused"**
```bash
# Verificar que el gateway esté corriendo
docker logs api_gateway

# Verificar puertos
netstat -an | findstr :8001
```

#### 2. **Error de CORS**
```bash
# Los servicios ya están configurados para puerto 3000
# Verificar que el frontend esté en puerto 3000
```

#### 3. **Error de Button Refs**
```bash
# Ya está corregido con React.forwardRef
# Si persiste, reinstalar dependencias:
npm install --force
```

### Verificación de Estado

#### Servicios Backend
```powershell
# Ver logs del gateway
docker logs api_gateway

# Ver logs de un servicio específico
docker logs auth_service
docker logs personas_service
```

#### Frontend
```powershell
# En el directorio frontend-react
npm run build  # Verificar que compila sin errores
npm run lint   # Verificar linting
```

## 📊 URLs de Desarrollo

| Servicio | URL | Estado |
|----------|-----|--------|
| **Frontend Next.js** | http://localhost:3000 | ✅ |
| **API Gateway** | http://localhost:8001 | ✅ |
| **Auth Service** | http://localhost:3001 | ✅ |
| **Personas Service** | http://localhost:3002 | ✅ |
| **Health Check** | http://localhost:8001/health | ✅ |

## ⚡ Scripts Útiles

```powershell
# Restart completo
make stop && make dev

# Solo backend
docker-compose -f docker-compose.dev.yml restart

# Solo frontend
cd frontend-react && npm run dev

# Logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f

# Test rápido de conectividad
curl http://localhost:8001/health && curl http://localhost:3000
```

## 🎯 Resultado Esperado

Después de aplicar todas las correcciones:

1. ✅ **Registro funciona** sin errores de conexión
2. ✅ **No hay warnings** de React.forwardRef
3. ✅ **CORS configurado** correctamente
4. ✅ **Frontend conecta** al gateway (puerto 8001)
5. ✅ **Auth0 funciona** con URLs correctas

El sistema ahora debería permitir el registro de usuarios sin problemas técnicos.
