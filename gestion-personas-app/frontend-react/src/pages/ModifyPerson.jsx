import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { personasApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { DOCUMENT_TYPES, GENDER_OPTIONS, COLOMBIAN_DEPARTMENTS } from '@/utils/constants';

const ModifyPerson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotifications();

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
  
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchPerson = async () => {
      try {
        const person = await personasApi.getById(id);
        setFormData(person);
        setOriginalData(person);
      } catch (err) {
        error('Error al cargar persona: ' + err.message);
        navigate('/consultar-personas');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPerson();
    }
  }, [id, error, navigate]);

  useEffect(() => {
    // Check for changes
    const changed = Object.keys(formData).some(key => formData[key] !== originalData[key]);
    setHasChanges(changed);
  }, [formData, originalData]);

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

    if (!hasChanges) {
      error('No se han detectado cambios para guardar');
      return;
    }
    
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      await personasApi.update(id, formData);
      success('Persona actualizada exitosamente');
      navigate('/consultar-personas');
    } catch (err) {
      error('Error al actualizar persona: ' + err.message);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const resetForm = () => {
    setFormData(originalData);
    setErrors({});
  };

  const getChangedFields = () => {
    const changed = [];
    Object.keys(formData).forEach(key => {
      if (formData[key] !== originalData[key]) {
        changed.push({
          field: key,
          original: originalData[key] || 'No especificado',
          new: formData[key] || 'No especificado'
        });
      }
    });
    return changed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Modificar Persona
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/consultar-personas')}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Volver
        </Button>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
          <div className="flex">
            <i className="fas fa-exclamation-triangle text-warning-500 mr-2 mt-0.5"></i>
            <div>
              <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                Hay cambios sin guardar
              </h3>
              <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                Recuerda guardar los cambios antes de salir de esta página.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            Información Personal
          </h2>
        </Card.Header>
        
        <Card.Body>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Primer Nombre"
                name="primer_nombre"
                value={formData.primer_nombre}
                onChange={handleInputChange}
                error={errors.primer_nombre}
                required
                placeholder="Ej: Juan"
              />
              
              <Input
                label="Segundo Nombre"
                name="segundo_nombre"
                value={formData.segundo_nombre}
                onChange={handleInputChange}
                placeholder="Ej: Carlos (Opcional)"
              />
            </div>

            <Input
              label="Apellidos"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleInputChange}
              error={errors.apellidos}
              required
              placeholder="Ej: Pérez García"
            />

            {/* Documento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                label="Tipo de Documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleInputChange}
                required
              >
                {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              
              <div className="md:col-span-2">
                <Input
                  label="Número de Documento"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleInputChange}
                  error={errors.numero_documento}
                  required
                  placeholder="Ej: 12345678"
                />
              </div>
            </div>

            {/* Fecha y Género */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Fecha de Nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
                error={errors.fecha_nacimiento}
                required
              />
              
              <Select
                label="Género"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                error={errors.genero}
                required
              >
                {Object.entries(GENDER_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="correo@ejemplo.com"
              />
              
              <Input
                label="Teléfono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="Ej: 3001234567"
              />
            </div>

            {/* Dirección */}
            <Input
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Ej: Calle 123 #45-67"
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
                {COLOMBIAN_DEPARTMENTS.map(dept => (
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
              disabled={saving || !hasChanges}
            >
              <i className="fas fa-undo mr-2"></i>
              Restaurar
            </Button>
            
            <Button
              onClick={handleSubmit}
              loading={saving}
              disabled={saving || !hasChanges}
            >
              <i className="fas fa-save mr-2"></i>
              Guardar Cambios
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar Cambios"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSave} loading={saving}>
              Confirmar y Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas guardar los siguientes cambios?
          </p>
          
          <div className="space-y-3">
            {getChangedFields().map((change, index) => (
              <div key={index} className="bg-gray-50 dark:bg-dark-bg-secondary p-3 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-dark-text-primary capitalize">
                  {change.field.replace('_', ' ')}:
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="line-through">{change.original}</span>
                  {' → '}
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {change.new}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModifyPerson;
