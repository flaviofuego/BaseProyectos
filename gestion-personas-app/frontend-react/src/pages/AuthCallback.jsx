import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import { authService } from '@/services/auth';
import { useAuthHook } from '@/hooks/useAuth';
import { useNotifications } from '@/context/NotificationContext';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthHook();
  const { success, error } = useNotifications();

  useEffect(() => {
    const handleAuth0Callback = async () => {
      try {
        const token = searchParams.get('token');
        const error_param = searchParams.get('error');

        if (error_param) {
          let errorMessage = 'Error de autenticación';
          switch (error_param) {
            case 'auth_error':
              errorMessage = 'Error en el proceso de autenticación';
              break;
            case 'auth_failed':
              errorMessage = 'Autenticación fallida';
              break;
            default:
              errorMessage = searchParams.get('error_description') || errorMessage;
          }
          throw new Error(errorMessage);
        }

        if (!token) {
          throw new Error('Token de autenticación no encontrado');
        }

        // Verificar el token con el backend
        const response = await fetch('http://localhost:8001/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Token inválido');
        }

        const userData = await response.json();
        
        // Guardar el token y usuario
        if (userData.user) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData.user));
          login(userData.user, token);
          success('¡Bienvenido al sistema!');
          navigate('/');
        } else {
          throw new Error('Datos de usuario inválidos');
        }
      } catch (err) {
        console.error('Error en callback de Auth0:', err);
        error('Error al iniciar sesión: ' + err.message);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuth0Callback();
  }, [searchParams, navigate, login, success, error]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Iniciando sesión...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Por favor espera mientras procesamos tu autenticación.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
};

export default AuthCallback;
