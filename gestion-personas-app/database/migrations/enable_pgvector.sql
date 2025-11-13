-- ============================================
-- Migración: Habilitar pgvector y crear tabla de embeddings
-- Fecha: 2025-11-10
-- Descripción: Activa la extensión pgvector y crea la tabla para almacenar embeddings vectoriales
-- ============================================

-- Habilitar la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla para almacenar embeddings de personas (768 dimensiones para Gemini embedding-001)
CREATE TABLE IF NOT EXISTS personas_embeddings (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    content_text TEXT NOT NULL, -- Texto usado para generar el embedding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(persona_id)
);

-- Índices para búsqueda eficiente de vectores
-- HNSW (Hierarchical Navigable Small World) es más rápido para búsquedas de alta dimensión
CREATE INDEX IF NOT EXISTS personas_embeddings_hnsw_idx 
ON personas_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- También crear índice para persona_id para búsquedas directas
CREATE INDEX IF NOT EXISTS personas_embeddings_persona_id_idx 
ON personas_embeddings(persona_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_personas_embeddings_updated_at 
BEFORE UPDATE ON personas_embeddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función auxiliar para búsqueda de similitud con límite
CREATE OR REPLACE FUNCTION search_similar_personas(
    query_embedding vector(768),
    similarity_threshold FLOAT DEFAULT 0.5,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    persona_id INTEGER,
    similarity FLOAT,
    content_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.persona_id,
        1 - (pe.embedding <=> query_embedding) AS similarity,
        pe.content_text
    FROM personas_embeddings pe
    WHERE 1 - (pe.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY pe.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Comentarios informativos
COMMENT ON TABLE personas_embeddings IS 'Almacena embeddings vectoriales de personas para búsqueda semántica usando pgvector';
COMMENT ON COLUMN personas_embeddings.embedding IS 'Vector de 768 dimensiones generado por Google Gemini embedding-001';
COMMENT ON COLUMN personas_embeddings.content_text IS 'Texto concatenado usado para generar el embedding (nombre, documento, edad, etc)';
COMMENT ON FUNCTION search_similar_personas IS 'Función auxiliar para búsqueda de similitud semántica con threshold y límite';

-- Verificar que la extensión está activa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) THEN
        RAISE EXCEPTION 'La extensión pgvector no está instalada correctamente';
    ELSE
        RAISE NOTICE '✅ Extensión pgvector habilitada correctamente';
        RAISE NOTICE '✅ Tabla personas_embeddings creada';
        RAISE NOTICE '✅ Índice HNSW creado para búsqueda vectorial eficiente';
    END IF;
END $$;
