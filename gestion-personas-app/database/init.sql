-- Crear esquema de base de datos para gestión de personas

-- ============================================
-- Extensión pgvector para búsqueda vectorial
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de usuarios para autenticación
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'local', -- local, microsoft, google, etc
    provider_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal de personas
CREATE TABLE IF NOT EXISTS personas (
    id SERIAL PRIMARY KEY,
    numero_documento VARCHAR(10) UNIQUE NOT NULL,
    tipo_documento VARCHAR(30) NOT NULL CHECK (tipo_documento IN ('Tarjeta de identidad', 'Cédula')),
    primer_nombre VARCHAR(30) NOT NULL,
    segundo_nombre VARCHAR(30),
    apellidos VARCHAR(60) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20) NOT NULL CHECK (genero IN ('Masculino', 'Femenino', 'No binario', 'Prefiero no reportar')),
    correo_electronico VARCHAR(255) NOT NULL,
    celular VARCHAR(10) NOT NULL,
    foto_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Tabla de logs de transacciones
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, QUERY, NLP_QUERY
    entity_type VARCHAR(50) NOT NULL, -- PERSONA, USER, etc
    entity_id INTEGER,
    numero_documento VARCHAR(10),
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) NOT NULL, -- SUCCESS, ERROR
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_personas_documento ON personas(numero_documento);
CREATE INDEX idx_personas_tipo_documento ON personas(tipo_documento);
CREATE INDEX idx_personas_fecha_nacimiento ON personas(fecha_nacimiento);
CREATE INDEX idx_personas_created_at ON personas(created_at);

CREATE INDEX idx_logs_transaction_type ON transaction_logs(transaction_type);
CREATE INDEX idx_logs_numero_documento ON transaction_logs(numero_documento);
CREATE INDEX idx_logs_created_at ON transaction_logs(created_at);
CREATE INDEX idx_logs_user_id ON transaction_logs(user_id);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para consultas de personas con edad calculada
CREATE VIEW personas_con_edad AS
SELECT 
    p.*,
    EXTRACT(YEAR FROM AGE(fecha_nacimiento)) AS edad,
    CASE 
        WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 18 THEN 'Menor de edad'
        WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) BETWEEN 18 AND 65 THEN 'Adulto'
        ELSE 'Adulto mayor'
    END AS grupo_edad
FROM personas p;

-- Tabla de preferencias de usuario
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consulta_service_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Índice para búsquedas rápidas por user_id
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos de prueba inicial
-- Usuario: admin | Contraseña: admin123 (bcrypt rounds: 4 para desarrollo)
INSERT INTO users (username, email, password_hash, provider) 
VALUES ('admin', 'admin@example.com', '$2b$04$K8lgAt.ZHurAIqx4YmMuv.ry2BQ3vT4f6A/OgwGRBBqgf9nJgOGhu', 'local')
ON CONFLICT DO NOTHING;

-- Insertar preferencias por defecto para el usuario admin
INSERT INTO user_preferences (user_id, consulta_service_enabled)
SELECT id, TRUE FROM users WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- Tabla de embeddings vectoriales (pgvector)
-- ============================================
-- Tabla para almacenar embeddings de personas (768 dimensiones para Gemini embedding-001)
CREATE TABLE IF NOT EXISTS personas_embeddings (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
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

