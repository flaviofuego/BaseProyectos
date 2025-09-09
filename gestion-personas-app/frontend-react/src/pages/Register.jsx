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
    
    // Real-time validation for password confirmation
    if (name === 'confirmPassword' && formData.password && value !== formData.password) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Las contraseñas no coinciden'
      }));
    } else if (name === 'password' && formData.confirmPassword && value !== formData.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Las contraseñas no coinciden'
      }));
    } else if (name === 'confirmPassword' && value === formData.password) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: ''
      }));
    } else if (name === 'password' && value === formData.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate username (required by backend)
    if (!formData.username.trim()) {
      newErrors.username = 'El usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'El usuario solo puede contener letras y números';
    }
    
    // Validate email (required by backend)
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }
    
    // Validate password (required by backend)
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    // Validate password confirmation (frontend only)
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmación de contraseña es requerida';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    // Validate names (optional but if provided, should not be empty)
    if (formData.first_name && !formData.first_name.trim()) {
      newErrors.first_name = 'Si proporcionas un nombre, no puede estar vacío';
    }
    
    if (formData.last_name && !formData.last_name.trim()) {
      newErrors.last_name = 'Si proporcionas un apellido, no puede estar vacío';
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
      // Send only the fields that the backend accepts
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };
      
      await authService.register(registrationData);
      success('Usuario registrado exitosamente. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      error('Error al registrar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 transition-colors duration-300">
      <section className="max-w-md w-full space-y-8">
        {/* Header */}
        <header className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/30 shadow-lg">
            <svg className="h-12 w-12 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Crear Cuenta</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Sistema de Gestión de Personas v2.5</p>
        </header>

        <Card className="bg-white dark:bg-gray-900/80 shadow-xl border border-gray-200 dark:border-gray-800">
          <Card.Body>
            {/* Info message */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Campos requeridos
                  </h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Solo se requieren: <strong>Usuario</strong>, <strong>Email</strong> y <strong>Contraseña</strong>. Los campos de nombre son opcionales.
                  </p>
                </div>
              </div>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit} aria-label="Formulario de registro">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre (Opcional)"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  error={errors.first_name}
                  placeholder="Tu nombre"
                  className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  aria-describedby={errors.first_name ? "first_name-error" : undefined}
                  helpText="Este campo es opcional y no se guarda en el sistema"
                />
                
                <Input
                  label="Apellido (Opcional)"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  error={errors.last_name}
                  placeholder="Tu apellido"
                  className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  aria-describedby={errors.last_name ? "last_name-error" : undefined}
                  helpText="Este campo es opcional y no se guarda en el sistema"
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
                className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                aria-describedby={errors.username ? "username-error" : undefined}
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
                className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                aria-describedby={errors.email ? "email-error" : undefined}
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
                className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                aria-describedby={errors.password ? "password-error" : "password-help"}
              />

              <div className="relative">
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
                  className="focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                {formData.password && formData.confirmPassword && !errors.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="absolute right-3 top-8 text-green-500" aria-label="Las contraseñas coinciden">
                    <i className="fas fa-check-circle"></i>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-500 dark:hover:bg-primary-400 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                loading={loading}
                disabled={loading}
                aria-label="Crear cuenta"
              >
                Crear Cuenta
              </Button>
            </form>
          </Card.Body>
        </Card>

        <nav className="text-center mt-4" aria-label="Navegación entre pestañas de autenticación">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            ¿Ya tienes una cuenta?
            <button 
              onClick={() => navigate('/login')}
              className="ml-2 font-medium text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 rounded"
              aria-label="Ir a iniciar sesión"
            >
              Inicia sesión aquí
            </button>
          </p>
        </nav>
      </section>
    </main>
  );
};

export default Register;
