# Dockerfile para producción del frontend React/Next.js
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./

# === STAGE 1: Dependencies ===
FROM base AS deps
# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# === STAGE 2: Build ===
FROM base AS builder
# Instalar todas las dependencias (incluidas dev)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Variables de entorno para build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Construir la aplicación
RUN pnpm build

# === STAGE 3: Runtime ===
FROM node:20-alpine AS runner

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Establecer directorio de trabajo
WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Crear directorio .next con permisos apropiados
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar archivos construidos y dependencias
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de inicio
CMD ["node", "server.js"]
