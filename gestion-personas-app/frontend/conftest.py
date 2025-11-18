"""
Configuración de pytest para tests de Flask
"""
import pytest
import sys
import os

# Agregar directorio padre al path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app as flask_app


@pytest.fixture
def app():
    """Fixture que proporciona la aplicación Flask"""
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False
    flask_app.config['SECRET_KEY'] = 'test-secret-key'
    
    yield flask_app


@pytest.fixture
def client(app):
    """Fixture que proporciona el cliente de pruebas"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Fixture que proporciona el runner CLI"""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers():
    """Fixture que proporciona headers de autenticación de prueba"""
    return {
        'Authorization': 'Bearer test-token-12345'
    }


@pytest.fixture
def mock_session():
    """Fixture que proporciona una sesión mock"""
    return {
        'token': 'test-token-12345',
        'user_id': 1,
        'username': 'testuser',
        'email': 'test@example.com'
    }
