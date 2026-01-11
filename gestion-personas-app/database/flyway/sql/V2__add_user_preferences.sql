-- V2__add_user_preferences.sql
-- Tabla de preferencias de usuario
-- Flyway Migration

-- ============================================
-- Tabla de preferencias de usuario
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consulta_service_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Índice para búsquedas rápidas por user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar preferencias por defecto para el usuario admin
INSERT INTO user_preferences (user_id, consulta_service_enabled)
SELECT id, TRUE FROM users WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;
