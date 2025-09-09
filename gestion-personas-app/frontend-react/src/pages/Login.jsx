import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/context/NotificationContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error } = useNotifications();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login(formData);
      login(response.user, response.token);
      success('¡Bienvenido al sistema!');
      navigate('/');
    } catch (err) {
      error('Error al iniciar sesión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth0Login = async () => {
    try {
      // Redirect to Auth0
      window.location.href = 'http://localhost:8001/api/auth/login/auth0';
    } catch (err) {
      error('Error al iniciar sesión con Auth0: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/20">
            <svg className="h-12 w-12 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-dark-text-primary">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
            Sistema de Gestión de Personas v2.5
          </p>
        </div>

        <Card>
          <Card.Body>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Usuario"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
              />

              <div className="relative">
                <Input
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={!formData.username || !formData.password}
              >
                Iniciar Sesión
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-dark-border-primary" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-dark-bg-card text-gray-500 dark:text-dark-text-muted">
                    O continúa con
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAuth0Login}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 3.605-2.068 4.777-.872.872-1.928 1.507-3.065 1.8-.732.189-1.496.227-2.252.114a6.3 6.3 0 0 1-1.659-.423c-1.04-.495-1.918-1.277-2.505-2.233C5.378 10.982 5.2 9.656 5.446 8.393c.246-1.264.938-2.41 1.961-3.246.699-.571 1.525-.98 2.411-1.19.908-.22 1.857-.183 2.747.104.89.287 1.702.82 2.318 1.52.616.7 1.01 1.563 1.118 2.483z"/>
                  </svg>
                  Iniciar con Auth0
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            ¿Necesitas una cuenta?{' '}
            <button 
              onClick={() => navigate('/register')}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
