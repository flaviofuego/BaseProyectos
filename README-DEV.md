# Guía de Desarrollo - Gestión de Personas App

## Configuración para Desarrollo

Esta guía te ayudará a configurar el entorno de desarrollo con **hot reload** para que los cambios en el código se reflejen automáticamente sin necesidad de reconstruir los contenedores.

## Estructura de Archivos para Desarrollo

- `docker-compose.yml` - Configuración de producción
- `docker-compose.dev.yml` - Configuración de desarrollo con volúmenes montados
- `Dockerfile` - Dockerfiles de producción (en cada servicio)
- `Dockerfile.dev` - Dockerfiles de desarrollo (en cada servicio)

## Comandos Principales

### Desarrollo (con hot reload)
```bash
# Construir imágenes de desarrollo
make build-dev

# Iniciar servicios en modo desarrollo
make dev

# Ver logs de desarrollo
make logs-dev

# Detener servicios de desarrollo
make down-dev
```

### Producción
```bash
# Construir imágenes de producción
make build

# Iniciar servicios en modo producción
make up

# Ver logs de producción
make logs

# Detener servicios
make down
```

## Diferencias entre Desarrollo y Producción

### Desarrollo (`docker-compose.dev.yml`)
- ✅ **Volúmenes montados**: Los cambios en el código se reflejan inmediatamente
- ✅ **Hot reload**: Nodemon para Node.js, Flask debug para Python
- ✅ **Variables de entorno de desarrollo**
- ✅ **Dependencias de desarrollo incluidas**

### Producción (`docker-compose.yml`)
- 🚀 **Código copiado**: Imagen optimizada sin volúmenes
- 🚀 **Sin hot reload**: Mejor rendimiento
- 🚀 **Solo dependencias de producción**
- 🚀 **Variables de entorno optimizadas**

## Flujo de Trabajo Recomendado

1. **Desarrollo diario**:
   ```bash
   make dev
   # Haz cambios en el código
   # Los cambios se reflejan automáticamente
   ```

2. **Testing/Staging**:
   ```bash
   make down-dev
   make build
   make up
   ```

3. **Debugging**:
   ```bash
   # Ver logs específicos de un servicio
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f gateway
   ```

## Puertos en Desarrollo

- **Frontend Flask**: `http://localhost:5000`
- **API Gateway**: `http://localhost:8001`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Qdrant**: `http://localhost:6333`

## Servicios Internos (entre contenedores)

- **Auth Service**: `http://auth-service:3001`
- **Personas Service**: `http://personas-service:3002`
- **Consulta Service**: `http://consulta-service:3003`
- **NLP Service**: `http://nlp-service:3004`
- **Log Service**: `http://log-service:3005`

## Troubleshooting

### Los cambios no se reflejan
1. Verifica que estés usando `make dev` y no `make up`
2. Revisa que los volúmenes estén montados correctamente:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml config
   ```

### Problemas de permisos (Linux/Mac)
```bash
# Dar permisos al directorio node_modules
sudo chown -R $USER:$USER ./gateway/node_modules
sudo chown -R $USER:$USER ./services/*/node_modules
```

### Limpiar todo y empezar de nuevo
```bash
make down-dev
docker system prune -a
make build-dev
make dev
```

### Ver el estado de los contenedores
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

## Estructura de Volúmenes

Cada servicio tiene sus volúmenes montados de la siguiente manera:

```yaml
volumes:
  - ./gateway:/app                    # Código fuente
  - /app/node_modules                 # Preserve node_modules en el contenedor
```

Esto permite:
- ✅ Editar archivos localmente
- ✅ Ver cambios inmediatamente
- ✅ Mantener las dependencias instaladas en el contenedor
- ✅ Evitar conflictos entre el sistema host y el contenedor

## Comandos Útiles de Debug

```bash
# Entrar a un contenedor específico
docker exec -it auth_service_dev sh
docker exec -it flask_app_dev bash

# Ver variables de entorno
docker exec auth_service_dev env

# Reiniciar un servicio específico
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend

# Ver uso de recursos
docker stats
```
