import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { personasApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';

const CreatePerson = () => {
  const [formData, setFormData] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    apellidos: '',
    tipo_documento: 'CC',
    numero_documento: '',
    fecha_nacimiento: '',
    genero: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    pais: 'Colombia'
  });
  
  const [loading, setLoading] = useState(false);
  const [validatingDocument, setValidatingDocument] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const { success, error } = useNotifications();

  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PP', label: 'Pasaporte' },
    { value: 'RC', label: 'Registro Civil' }
  ];

  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'O', label: 'Otro' }
  ];

  const colombianDepartments = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada'
  ];

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

  const validateDocument = async () => {
    if (!formData.numero_documento) return;
    
    setValidatingDocument(true);
    try {
      await personasApi.validateDocument(formData.numero_documento);
      success('Número de documento válido');
    } catch (err) {
      error('El número de documento ya existe en el sistema');
      setErrors(prev => ({
        ...prev,
        numero_documento: 'Este documento ya está registrado'
      }));
    } finally {
      setValidatingDocument(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.primer_nombre.trim()) {
      newErrors.primer_nombre = 'El primer nombre es requerido';
    }
    
    if (!formData.apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son requeridos';
    }
    
    if (!formData.numero_documento.trim()) {
      newErrors.numero_documento = 'El número de documento es requerido';
    }
    
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida';
    }
    
    if (!formData.genero) {
      newErrors.genero = 'El género es requerido';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
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
      const response = await personasApi.create(formData);
      success('Persona creada exitosamente');
      navigate('/consultar-personas');
    } catch (err) {
      error('Error al crear persona: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const resetForm = () => {
    setFormData({
      primer_nombre: '',
      segundo_nombre: '',
      apellidos: '',
      tipo_documento: 'CC',
      numero_documento: '',
      fecha_nacimiento: '',
      genero: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      pais: 'Colombia'
    });
    setErrors({});
  };

  return (
    <main className="space-y-6 animate-fade-in" role="main">
      {/* Header */}
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Crear Nueva Persona
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/consultar-personas')}
          aria-label="Volver a la lista de personas"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          Volver
        </Button>
      </header>

      <Card className="shadow-xl">
        <Card.Header>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Información Personal
          </h2>
        </Card.Header>
        
        <Card.Body>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Nombres */}
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <legend className="sr-only">Nombres de la persona</legend>
              <Input
                label="Primer Nombre"
                name="primer_nombre"
                value={formData.primer_nombre}
                onChange={handleInputChange}
                error={errors.primer_nombre}
                required
                placeholder="Ej: Juan"
                aria-describedby="primer-nombre-help"
                helpText="Nombre principal de la persona"
              />
              
              <Input
                label="Segundo Nombre"
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleInputChange}
                placeholder="Ej: Carlos (Opcional)"
                helpText="Segundo nombre (opcional)"
              />
            </fieldset>

            <Input
              label="Apellidos"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleInputChange}
              error={errors.apellidos}
              required
              placeholder="Ej: Pérez García"
              helpText="Apellidos completos de la persona"
            />

            {/* Documento */}
            <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <legend className="sr-only">Información de documento de identidad</legend>
              <Select
                label="Tipo de Documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleInputChange}
                options={documentTypes}
                required
                aria-describedby="tipo-documento-help"
              />
              
              <div className="md:col-span-2">
                <Input
                  label="Número de Documento"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleInputChange}
                  onBlur={validateDocument}
                  error={errors.numero_documento}
                  required
                  placeholder="Ej: 12345678"
                  helpText="Número único del documento de identidad"
                />
                {validatingDocument && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1" role="status" aria-live="polite">
                    <i className="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>
                    Validando documento...
                  </p>
                )}
              </div>
            </fieldset>

            {/* Fecha y Género */}
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <legend className="sr-only">Información de nacimiento y género</legend>
              <Input
                label="Fecha de Nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
                error={errors.fecha_nacimiento}
                required
                aria-describedby="fecha-nacimiento-help"
                helpText="Fecha de nacimiento de la persona"
              />
              
              <Select
                label="Género"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                error={errors.genero}
                options={genderOptions}
                placeholder="Selecciona el género"
                required
                aria-describedby="genero-help"
              />
            </fieldset>

            {/* Contacto */}
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <legend className="sr-only">Información de contacto</legend>
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="correo@ejemplo.com"
                helpText="Dirección de correo electrónico (opcional)"
              />
              
              <Input
                label="Teléfono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="Ej: 3001234567"
                helpText="Número de teléfono (opcional)"
              />
            </fieldset>

            {/* Dirección */}
            <Input
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Ej: Calle 123 #45-67"
              helpText="Dirección de residencia (opcional)"
            />

            {/* Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                placeholder="Ej: Bogotá"
              />
              
              <Select
                label="Departamento"
                name="departamento"
                value={formData.departamento}
                onChange={handleInputChange}
                placeholder="Selecciona departamento"
              >
                {colombianDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
              
              <Input
                label="País"
                name="pais"
                value={formData.pais}
                onChange={handleInputChange}
                placeholder="Colombia"
              />
            </div>
          </form>
        </Card.Body>

        <Card.Footer>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={resetForm}
              disabled={loading}
            >
              <i className="fas fa-undo mr-2"></i>
              Limpiar
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loading}
            >
              <i className="fas fa-eye mr-2"></i>
              Vista Previa
            </Button>
            
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={loading}
            >
              <i className="fas fa-save mr-2"></i>
              Crear Persona
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Vista Previa"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setShowPreview(false);
              handleSubmit();
            }}>
              Confirmar y Crear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nombre Completo:</strong>
              <p>{formData.primer_nombre} {formData.segundo_nombre} {formData.apellidos}</p>
            </div>
            <div>
              <strong>Documento:</strong>
              <p>{formData.tipo_documento} {formData.numero_documento}</p>
            </div>
            <div>
              <strong>Fecha de Nacimiento:</strong>
              <p>{formData.fecha_nacimiento}</p>
            </div>
            <div>
              <strong>Género:</strong>
              <p>{genderOptions.find(g => g.value === formData.genero)?.label}</p>
            </div>
            {formData.email && (
              <div>
                <strong>Email:</strong>
                <p>{formData.email}</p>
              </div>
            )}
            {formData.telefono && (
              <div>
                <strong>Teléfono:</strong>
                <p>{formData.telefono}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </main>
  );
};

export default CreatePerson;
