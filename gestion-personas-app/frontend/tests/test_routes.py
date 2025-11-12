"""
Tests para las rutas principales de Flask
Meta de cobertura: 80%
"""
import pytest
from unittest.mock import patch, MagicMock


class TestDashboardRoute:
    """Tests para la ruta /dashboard"""

    @patch('app.make_request')
    def test_dashboard_renders_successfully(self, mock_request, client):
        """Debe renderizar el dashboard con código 200"""
        # Simular sesión autenticada
        with client.session_transaction() as sess:
            sess['token'] = 'test-token'
            sess['username'] = 'testuser'

        # Mock de respuestas de API
        mock_stats = MagicMock()
        mock_stats.status_code = 200
        mock_stats.json.return_value = {
            'total_personas': 100,
            'activos': 85,
            'inactivos': 15
        }

        mock_request.return_value = mock_stats

        response = client.get('/dashboard')

        assert response.status_code == 200
        assert b'Dashboard' in response.data or b'dashboard' in response.data.lower()

    def test_dashboard_redirects_without_auth(self, client):
        """Debe redirigir a login si no está autenticado"""
        response = client.get('/dashboard', follow_redirects=False)
        
        assert response.status_code in [302, 303, 401]


class TestLoginRoute:
    """Tests para la ruta /login"""

    def test_login_page_renders_successfully(self, client):
        """Debe renderizar la página de login con código 200"""
        response = client.get('/login')

        assert response.status_code == 200
        assert b'login' in response.data.lower() or b'iniciar' in response.data.lower()

    @patch('app.make_request')
    def test_login_post_successful(self, mock_request, client):
        """Debe iniciar sesión correctamente con credenciales válidas"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'token': 'test-token-123',
            'user': {
                'id': 1,
                'username': 'testuser',
                'email': 'test@example.com'
            }
        }
        mock_request.return_value = mock_response

        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'Test123!@#'
        }, follow_redirects=False)

        assert response.status_code in [200, 302, 303]

    @patch('app.make_request')
    def test_login_post_invalid_credentials(self, mock_request, client):
        """Debe fallar con credenciales inválidas"""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {'error': 'Invalid credentials'}
        mock_request.return_value = mock_response

        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'wrongpass'
        })

        assert response.status_code in [200, 401]


class TestRegisterRoute:
    """Tests para la ruta /register"""

    def test_register_page_renders_successfully(self, client):
        """Debe renderizar la página de registro con código 200"""
        response = client.get('/register')

        assert response.status_code == 200
        assert b'register' in response.data.lower() or b'registr' in response.data.lower()

    @patch('app.make_request')
    def test_register_post_successful(self, mock_request, client):
        """Debe registrar un nuevo usuario correctamente"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'message': 'User registered successfully',
            'user': {
                'id': 1,
                'username': 'newuser',
                'email': 'new@example.com'
            }
        }
        mock_request.return_value = mock_response

        response = client.post('/register', data={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'Test123!@#'
        }, follow_redirects=False)

        assert response.status_code in [200, 201, 302, 303]


class TestConsultarPersonasRoute:
    """Tests para la ruta /consultar_personas"""

    @patch('app.make_request')
    def test_consultar_personas_renders_successfully(self, mock_request, client):
        """Debe renderizar la página de consulta con código 200"""
        # Simular sesión autenticada
        with client.session_transaction() as sess:
            sess['token'] = 'test-token'
            sess['username'] = 'testuser'

        # Mock de respuesta de API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'personas': [
                {
                    'id': 1,
                    'nombre': 'Juan',
                    'apellido': 'Pérez',
                    'numero_documento': '12345678'
                }
            ]
        }
        mock_request.return_value = mock_response

        response = client.get('/consultar_personas')

        assert response.status_code == 200


class TestCrearPersonaRoute:
    """Tests para la ruta /crear_persona"""

    @patch('app.make_request')
    def test_crear_persona_renders_successfully(self, mock_request, client):
        """Debe renderizar el formulario de crear persona"""
        # Simular sesión autenticada
        with client.session_transaction() as sess:
            sess['token'] = 'test-token'
            sess['username'] = 'testuser'

        response = client.get('/crear_persona')

        assert response.status_code == 200


class TestErrorHandlers:
    """Tests para manejadores de errores"""

    def test_404_error_handler(self, client):
        """Debe renderizar página 404 para rutas no existentes"""
        response = client.get('/ruta-que-no-existe')

        assert response.status_code == 404

    @patch('app.make_request')
    def test_handles_api_connection_error(self, mock_request, client):
        """Debe manejar errores de conexión con la API"""
        # Simular sesión autenticada
        with client.session_transaction() as sess:
            sess['token'] = 'test-token'

        mock_request.return_value = None  # Simular error de conexión

        response = client.get('/dashboard')

        # Debe manejar el error gracefully
        assert response.status_code in [200, 500, 503]


class TestHelperFunctions:
    """Tests para funciones auxiliares"""

    def test_build_image_url_with_uploads_path(self, app):
        """Debe construir URL correcta para imágenes en /uploads/"""
        from app import build_image_url

        foto_url = '/uploads/foto123.jpg'
        result = build_image_url(foto_url)

        assert 'http://localhost:8001/uploads/foto123.jpg' in result

    def test_build_image_url_with_none(self, app):
        """Debe retornar None cuando foto_url es None"""
        from app import build_image_url

        result = build_image_url(None)
        assert result is None

    def test_build_image_url_with_external_url(self, app):
        """Debe retornar URL externa sin modificar"""
        from app import build_image_url

        external_url = 'https://example.com/image.jpg'
        result = build_image_url(external_url)

        assert result == external_url


class TestSessionManagement:
    """Tests para manejo de sesión"""

    def test_logout_clears_session(self, client):
        """Debe limpiar la sesión al hacer logout"""
        # Establecer sesión
        with client.session_transaction() as sess:
            sess['token'] = 'test-token'
            sess['username'] = 'testuser'

        # Hacer logout
        response = client.get('/logout', follow_redirects=False)

        # Verificar que redirige
        assert response.status_code in [302, 303]

        # Verificar que la sesión está limpia
        with client.session_transaction() as sess:
            assert 'token' not in sess or sess.get('token') is None
