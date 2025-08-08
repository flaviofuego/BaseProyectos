# Migración de OpenAI a Google Gemini

Este documento describe los pasos para migrar de OpenAI a Google Gemini en el sistema de gestión de personas.

## ⚠️ Cambios Importantes

### 1. API Key
- **Antes**: `OPENAI_API_KEY`
- **Ahora**: `GEMINI_API_KEY`

### 2. Dimensión de Embeddings
- **OpenAI**: 1536 dimensiones
- **Gemini**: 768 dimensiones

### 3. Dependencias
- **Removido**: `openai` package
- **Agregado**: `@google/generative-ai` package

## 🚀 Pasos de Migración

### 1. Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Copia la API key

### 2. Actualizar Variables de Entorno

```bash
# Edita tu archivo .env
nano .env

# Cambia:
# OPENAI_API_KEY=tu-openai-key
# Por:
GEMINI_API_KEY=tu-gemini-key
```

### 3. Recrear Colección de Vectores

Debido al cambio en las dimensiones de embeddings, necesitas recrear la colección en Qdrant:

```bash
# Detener servicios
docker-compose down

# Eliminar volumen de Qdrant (esto eliminará los embeddings existentes)
docker volume rm gestion-personas-app_qdrant_data

# Reiniciar servicios
docker-compose up -d
```

### 4. Reconstruir Contenedores

```bash
# Rebuild del servicio NLP con las nuevas dependencias
docker-compose build nlp-service

# Reiniciar todos los servicios
docker-compose up -d
```

### 5. Sincronizar Embeddings

Una vez que los servicios estén ejecutándose:

```bash
# Sincronizar embeddings de todas las personas existentes
curl -X POST "http://localhost:8000/api/nlp/sync-embeddings"
```

## 🔍 Verificación

### 1. Health Check
```bash
curl http://localhost:8000/api/nlp/health
```

Deberías ver:
```json
{
  "status": "OK",
  "service": "nlp-service",
  "gemini_configured": true,
  "qdrant_url": "http://qdrant:6333"
}
```

### 2. Prueba de Consulta
Ve al frontend (http://localhost:8501) y prueba una consulta en lenguaje natural como:
"¿Cuál es el empleado más joven que se ha registrado?"

## 🎯 Beneficios de Gemini

1. **Costo**: Generalmente más económico que OpenAI
2. **Velocidad**: Respuestas más rápidas en muchos casos
3. **Multimodal**: Soporte nativo para texto e imágenes
4. **Gratuito**: Cuota gratuita generosa para desarrollo

## 🐛 Solución de Problemas

### Error: "GEMINI_API_KEY not configured"
- Verifica que la API key esté configurada en el archivo `.env`
- Reinicia los contenedores después de cambiar variables de entorno

### Error de dimensiones en Qdrant
- Elimina y recrea el volumen de Qdrant como se describe arriba
- Ejecuta la sincronización de embeddings

### Respuestas en inglés en lugar de español
- Gemini debería responder en español automáticamente
- Si no, verifica que las consultas incluyan contexto en español

## 📚 Referencias

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)
