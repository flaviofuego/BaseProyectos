import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { authService } from '@/services/auth';
import { useNotifications } from '@/context/NotificationContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const { success, error } = useNotifications();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'El usuario es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      error('Por favor corrige los errores en el formulario');
      return;
    }
    
    setLoading(true);
    try {
      await authService.register(formData);
      success('Usuario registrado exitosamente. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      error('Error al registrar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/20">
            <svg className="h-12 w-12 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-dark-text-primary">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
            Sistema de Gestión de Personas v2.5
          </p>
        </div>

        <Card>
          <Card.Body>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  error={errors.first_name}
                  required
                  placeholder="Tu nombre"
                />
                
                <Input
                  label="Apellido"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  error={errors.last_name}
                  required
                  placeholder="Tu apellido"
                />
              </div>

              <Input
                label="Usuario"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                error={errors.username}
                required
                placeholder="Nombre de usuario"
                autoComplete="username"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                required
                placeholder="tu@email.com"
                autoComplete="email"
              />

              <Input
                label="Contraseña"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                required
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />

              <Input
                label="Confirmar Contraseña"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                required
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
              />

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                Crear Cuenta
              </Button>
            </form>
          </Card.Body>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            ¿Ya tienes una cuenta?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
