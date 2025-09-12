# Frontend React (Next.js) - Sistema de Gestión de Personas

## 📋 Descripción

Frontend moderno construido con Next.js 14, TypeScript y TailwindCSS v4 para el Sistema de Gestión de Personas. Incluye autenticación con Auth0 y diseño responsivo con soporte para tema oscuro/claro.

## 🛠️ Tecnologías

- **Next.js 14**: Framework React con App Router
- **TypeScript**: Tipado estático
- **TailwindCSS v4**: Framework de estilos utilitarios
- **Auth0**: Autenticación OAuth
- **Lucide React**: Iconos
- **React Hook Form**: Manejo de formularios
- **Zod**: Validación de esquemas

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# 1. Navegar al directorio
cd frontend-react

# 2. Instalar dependencias
pnpm install
# o
npm install

# 3. Configurar variables de entorno
cp ../.env.example .env.local

# 4. Iniciar servidor de desarrollo
pnpm dev
# o
npm run dev
```

### Desarrollo con Docker

```bash
# Desde el directorio raíz del proyecto
docker-compose -f docker-compose.dev.yml up frontend-react

# O usar el script de PowerShell
cd tests
./dev.ps1
```

### Producción con Docker

```bash
# Desde el directorio raíz del proyecto
docker-compose up frontend-react

# O usar el script de PowerShell
cd tests
./prod.ps1
```

## 📁 Estructura del Proyecto

```
frontend-react/
├── src/
│   ├── app/                 # App Router de Next.js
│   │   ├── auth/           # Páginas de autenticación
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── personas/       # Gestión de personas
│   │   ├── consultas/      # Consultas NLP
│   │   └── layout.tsx      # Layout principal
│   ├── components/         # Componentes reutilizables
│   │   ├── ui/            # Componentes de UI base
│   │   ├── forms/         # Componentes de formularios
│   │   └── layout/        # Componentes de layout
│   ├── lib/               # Utilidades y configuración
│   │   ├── auth.ts        # Configuración Auth0
│   │   ├── api.ts         # Cliente API
│   │   └── utils.ts       # Funciones utilitarias
│   ├── types/             # Definiciones de tipos TypeScript
│   └── styles/            # Estilos globales
├── public/                # Archivos estáticos
├── Dockerfile             # Imagen Docker para producción
├── Dockerfile.dev         # Imagen Docker para desarrollo
├── next.config.mjs        # Configuración Next.js
├── tailwind.config.ts     # Configuración TailwindCSS
└── package.json           # Dependencias y scripts
```

## 🎨 Componentes Principales

### UI Components

- **Button**: Botón reutilizable con variantes y tamaños
- **Input**: Campo de entrada con validación
- **Card**: Contenedor de contenido
- **Select**: Selector dropdown
- **ThemeToggle**: Interruptor de tema oscuro/claro

### Layout Components

- **Header**: Navegación principal con autenticación
- **Footer**: Pie de página con información
- **Sidebar**: Navegación lateral

### Form Components

- **LoginForm**: Formulario de inicio de sesión
- **RegisterForm**: Formulario de registro
- **PersonaForm**: Formulario de gestión de personas

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm dev          # Servidor de desarrollo en puerto 3000
pnpm build        # Compilar para producción
pnpm start        # Servidor de producción
pnpm lint         # Linter ESLint
pnpm type-check   # Verificación de tipos TypeScript

# Docker
pnpm docker:dev   # Construir imagen de desarrollo
pnpm docker:prod  # Construir imagen de producción
```

## 🌍 Variables de Entorno

### Desarrollo (.env.local)

```bash
# Next.js
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=dev-zg58kn127grr7sf6.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=eKRUA6UlzZX8DKuCi247gryxqPc8r293
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/auth/callback

# App
NEXT_PUBLIC_APP_NAME=Sistema de Gestión de Personas - Dev
NEXT_PUBLIC_APP_VERSION=1.0.0-dev
NEXT_TELEMETRY_DISABLED=1
```

### Producción

```bash
# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com/api
NEXT_PUBLIC_FRONTEND_URL=https://your-frontend-domain.com

# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=your-prod-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-prod-client-id
NEXT_PUBLIC_AUTH0_REDIRECT_URI=https://your-frontend-domain.com/auth/callback

# App
NEXT_PUBLIC_APP_NAME=Sistema de Gestión de Personas
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🔐 Autenticación

El frontend utiliza Auth0 para la autenticación con el siguiente flujo:

1. **Login**: Redirección a Auth0 Universal Login
2. **Callback**: Procesamiento del callback en `/auth/callback`
3. **Token**: Almacenamiento y gestión del JWT
4. **API**: Inclusión automática del token en requests

### Configuración Auth0

```typescript
// src/lib/auth.ts
export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
  redirectUri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI!,
  scope: 'openid profile email'
}
```

## 🎨 Temas y Estilos

### TailwindCSS v4

El proyecto utiliza TailwindCSS v4 con configuración personalizada:

```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        // ...más colores personalizados
      }
    }
  }
}
```

### Tema Oscuro/Claro

El sistema de temas utiliza:

- **Context Provider**: `ThemeProvider` para gestión global
- **Local Storage**: Persistencia de preferencias
- **System Preference**: Detección automática del tema del sistema
- **CSS Variables**: Colores dinámicos con `hsl()`

## 📱 Responsive Design

El diseño es completamente responsive con breakpoints:

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🧪 Testing

```bash
# Ejecutar tests
pnpm test

# Tests en modo watch
pnpm test:watch

# Coverage
pnpm test:coverage
```

## 📦 Build y Deployment

### Build Local

```bash
pnpm build
pnpm start
```

### Docker Production

```bash
# Construir imagen
docker build -t frontend-react .

# Ejecutar contenedor
docker run -p 3000:3000 frontend-react
```

### Deployment

El proyecto está configurado para deployment en:

- **Vercel**: Configuración automática con `next.config.mjs`
- **Docker**: Multi-stage build optimizado
- **Static Export**: Configuración disponible para CDN

## 🔧 Troubleshooting

### Problemas Comunes

1. **Auth0 Redirect Loop**
   ```bash
   # Verificar variables de entorno
   echo $NEXT_PUBLIC_AUTH0_REDIRECT_URI
   ```

2. **API Connection Issues**
   ```bash
   # Verificar conectividad
   curl http://localhost:8001/api/health
   ```

3. **Build Errors**
   ```bash
   # Limpiar cache
   rm -rf .next
   pnpm build
   ```

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Contribución

1. Fork el proyecto
2. Crear una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📞 Soporte

Para soporte técnico, crear un issue en el repositorio o contactar al equipo de desarrollo.
