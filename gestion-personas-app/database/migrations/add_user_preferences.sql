-- Migración para agregar tabla de preferencias de usuario
-- Esta tabla almacena las configuraciones de cada usuario, incluyendo si el servicio de consulta está habilitado

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

-- Insertar preferencias por defecto para usuarios existentes
INSERT INTO user_preferences (user_id, consulta_service_enabled)
SELECT id, TRUE FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE user_preferences IS 'Almacena las preferencias de configuración de cada usuario';
COMMENT ON COLUMN user_preferences.consulta_service_enabled IS 'Indica si el servicio de consulta está habilitado para el usuario (TRUE por defecto)';

