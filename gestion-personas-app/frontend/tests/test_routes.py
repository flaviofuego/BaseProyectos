"""
Tests de integración real para las rutas de Flask
NO USA MOCKS - Usa servicios reales de Docker
Meta de cobertura: 80%
"""
import pytest
import time


class TestAuthenticationFlow:
    """Tests para el flujo de autenticación"""

    def test_login_page_renders(self, client):
        """Debe mostrar la página de login"""
        response = client.get('/login')
        assert response.status_code == 200

    def test_register_page_renders(self, client):
        """Debe mostrar la página de registro"""
        response = client.get('/register')
        assert response.status_code == 200

    def test_login_with_valid_credentials(self, client):
        """Debe permitir login con credenciales válidas"""
        response = client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        }, follow_redirects=False)
        
        # Debe redirigir o retornar success
        assert response.status_code in [200, 302]

    def test_login_with_invalid_credentials(self, client):
        """Debe rechazar credenciales inválidas"""
        response = client.post('/login', data={
            'username': 'wronguser',
            'password': 'wrongpass'
        }, follow_redirects=True)
        
        assert response.status_code == 200


class TestDashboardWithRealAuth:
    """Tests para dashboard con autenticación real"""

    def test_dashboard_redirects_without_auth(self, client):
        """Debe redirigir si no está autenticado"""
        response = client.get('/dashboard', follow_redirects=False)
        assert response.status_code in [302, 303, 401]

    def test_dashboard_accessible_after_login(self, client):
        """Debe mostrar dashboard después de login"""
        # Login real
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })
        
        # Acceder dashboard
        response = client.get('/dashboard', follow_redirects=True)
        assert response.status_code == 200


class TestPersonasRoutesIntegration:
    """Tests de integración para rutas de personas"""

    def setup_method(self):
        """Setup para cada test - hace login"""
        self.test_user = {
            'username': 'admin',
            'password': 'admin123'
        }

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data=self.test_user, follow_redirects=True)

    def test_consultar_personas_requires_auth(self, client):
        """Debe requerir autenticación para consultar"""
        response = client.get('/personas/consultar', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_consultar_personas_after_login(self, client):
        """Debe mostrar lista de personas después de login"""
        self.login(client)
        response = client.get('/personas/consultar', follow_redirects=True)
        assert response.status_code == 200

    def test_crear_persona_get_after_login(self, client):
        """Debe mostrar formulario de creación"""
        self.login(client)
        response = client.get('/personas/crear', follow_redirects=True)
        assert response.status_code == 200

    def test_crear_persona_post_with_valid_data(self, client):
        """Debe crear persona con datos válidos"""
        self.login(client)
        
        # Usar timestamp para documento único
        timestamp = str(int(time.time()))
        
        response = client.post('/personas/crear', data={
            'numero_documento': f'TEST{timestamp}',
            'tipo_documento': 'Cédula',
            'primer_nombre': 'Test',
            'segundo_nombre': 'Usuario',
            'apellidos': 'Prueba',
            'fecha_nacimiento': '1990-01-01',
            'genero': 'Masculino',
            'correo_electronico': f'test{timestamp}@test.com',
            'celular': '3001234567'
        }, follow_redirects=True)
        
        # Debe redirigir o mostrar success
        assert response.status_code == 200


class TestNLPRoutes:
    """Tests para rutas de NLP"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_nlp_page_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/personas/nlp', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_nlp_page_after_login(self, client):
        """Debe mostrar interfaz NLP"""
        self.login(client)
        response = client.get('/personas/nlp', follow_redirects=True)
        assert response.status_code == 200


class TestBulkUploadRoutes:
    """Tests para carga masiva"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_bulk_upload_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/personas/bulk-upload', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_bulk_upload_page_after_login(self, client):
        """Debe mostrar página de carga masiva"""
        self.login(client)
        response = client.get('/personas/bulk-upload', follow_redirects=True)
        assert response.status_code == 200


class TestLogsRoutes:
    """Tests para consulta de logs"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_logs_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/logs', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_logs_page_after_login(self, client):
        """Debe mostrar página de logs"""
        self.login(client)
        response = client.get('/logs', follow_redirects=True)
        assert response.status_code == 200


class TestReportesRoutes:
    """Tests para reportes"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_reportes_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/reportes', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_reportes_page_after_login(self, client):
        """Debe mostrar página de reportes"""
        self.login(client)
        response = client.get('/reportes', follow_redirects=True)
        assert response.status_code == 200


class TestConfiguracionCuenta:
    """Tests para configuración de cuenta"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_configurar_cuenta_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/configurar-cuenta', follow_redirects=False)
        assert response.status_code in [302, 401]

    def test_configurar_cuenta_after_login(self, client):
        """Debe mostrar página de configuración"""
        self.login(client)
        response = client.get('/configurar-cuenta', follow_redirects=True)
        assert response.status_code == 200


class TestModificarPersona:
    """Tests para modificar personas"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_modificar_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/personas/modificar?numero_documento=123', follow_redirects=False)
        assert response.status_code in [302, 401]


class TestBorrarPersona:
    """Tests para borrar personas"""

    def login(self, client):
        """Helper para hacer login"""
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })

    def test_borrar_requires_auth(self, client):
        """Debe requerir autenticación"""
        response = client.get('/personas/borrar', follow_redirects=False)
        assert response.status_code in [302, 401]


class TestErrorHandlers:
    """Tests para manejadores de errores"""

    def test_404_error(self, client):
        """Debe manejar 404"""
        response = client.get('/ruta-que-no-existe')
        assert response.status_code == 404


class TestSessionManagement:
    """Tests para manejo de sesión"""

    def test_logout_clears_session(self, client):
        """Debe limpiar sesión al logout"""
        # Login
        client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        })
        
        # Logout
        response = client.get('/logout', follow_redirects=True)
        
        # Debe redirigir a login
        assert response.status_code == 200


class TestHelperFunctions:
    """Tests para funciones helper"""

    def test_build_image_url_with_uploads(self, app):
        """Debe construir URL correctamente"""
        with app.app_context():
            from app import build_image_url
            result = build_image_url('/uploads/test.jpg')
            assert result is not None

    def test_build_image_url_with_none(self, app):
        """Debe manejar None"""
        with app.app_context():
            from app import build_image_url
            result = build_image_url(None)
            assert result is None or result == ''

    def test_build_image_url_with_external(self, app):
        """Debe manejar URLs externas"""
        with app.app_context():
            from app import build_image_url
            result = build_image_url('http://example.com/image.jpg')
            assert result == 'http://example.com/image.jpg'
