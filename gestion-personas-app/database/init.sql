-- Crear esquema de base de datos para gestión de personas

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

-- Datos de prueba inicial
INSERT INTO users (username, email, password_hash, provider) 
VALUES ('admin', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'local')
ON CONFLICT DO NOTHING;