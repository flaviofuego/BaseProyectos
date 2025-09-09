import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { personasApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { formatDate, calculateAge } from '@/utils/helpers';
import { DOCUMENT_TYPES, GENDER_OPTIONS } from '@/utils/constants';

const DeletePerson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotifications();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    const fetchPerson = async () => {
      try {
        const personData = await personasApi.getById(id);
        setPerson(personData);
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

  const handleDelete = async () => {
    if (confirmText !== 'ELIMINAR') {
      error('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    setDeleting(true);
    try {
      await personasApi.delete(id);
      success('Persona eliminada exitosamente');
      navigate('/consultar-personas');
    } catch (err) {
      error('Error al eliminar persona: ' + err.message);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-exclamation-triangle text-4xl text-warning-500 mb-4"></i>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Persona no encontrada
        </h2>
        <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
          La persona que intentas eliminar no existe o no tienes permisos para acceder.
        </p>
        <Button onClick={() => navigate('/consultar-personas')}>
          Volver a la lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Eliminar Persona
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/consultar-personas')}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Volver
        </Button>
      </div>

      {/* Warning Alert */}
      <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4">
        <div className="flex">
          <i className="fas fa-exclamation-triangle text-danger-500 mr-3 mt-0.5"></i>
          <div>
            <h3 className="text-sm font-medium text-danger-800 dark:text-danger-200">
              ¡Acción Irreversible!
            </h3>
            <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
              Esta acción eliminará permanentemente a la persona del sistema. 
              Todos los datos asociados se perderán y no podrán recuperarse.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Person Details */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
              Información de la Persona a Eliminar
            </h2>
          </Card.Header>
          
          <Card.Body>
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-dark-border-primary">
                <div className="h-16 w-16 rounded-full bg-danger-500 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {person.primer_nombre?.[0]}{person.apellidos?.split(' ')[0]?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    {person.primer_nombre} {person.segundo_nombre} {person.apellidos}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    {GENDER_OPTIONS[person.genero]} • {calculateAge(person.fecha_nacimiento)} años
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                    Tipo de Documento
                  </label>
                  <p className="text-gray-900 dark:text-dark-text-primary">
                    {DOCUMENT_TYPES[person.tipo_documento]}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                    Número de Documento
                  </label>
                  <p className="text-gray-900 dark:text-dark-text-primary">
                    {person.numero_documento}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                    Fecha de Nacimiento
                  </label>
                  <p className="text-gray-900 dark:text-dark-text-primary">
                    {formatDate(person.fecha_nacimiento)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                    Edad
                  </label>
                  <p className="text-gray-900 dark:text-dark-text-primary">
                    {calculateAge(person.fecha_nacimiento)} años
                  </p>
                </div>
                
                {person.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-dark-text-primary">
                      {person.email}
                    </p>
                  </div>
                )}
                
                {person.telefono && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                      Teléfono
                    </label>
                    <p className="text-gray-900 dark:text-dark-text-primary">
                      {person.telefono}
                    </p>
                  </div>
                )}
                
                {person.direccion && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                      Dirección
                    </label>
                    <p className="text-gray-900 dark:text-dark-text-primary">
                      {person.direccion}
                    </p>
                  </div>
                )}
                
                {(person.ciudad || person.departamento) && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                      Ubicación
                    </label>
                    <p className="text-gray-900 dark:text-dark-text-primary">
                      {[person.ciudad, person.departamento, person.pais].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Deletion Confirmation */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold text-danger-600 dark:text-danger-400">
              Confirmar Eliminación
            </h2>
          </Card.Header>
          
          <Card.Body>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-dark-bg-secondary p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                  ¿Qué se eliminará?
                </h4>
                <ul className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
                  <li>• Todos los datos personales</li>
                  <li>• Información de contacto</li>
                  <li>• Historial de registros</li>
                  <li>• Referencias en el sistema</li>
                </ul>
              </div>

              <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-warning-800 dark:text-warning-200 mb-2">
                  Importante:
                </h4>
                <ul className="text-sm text-warning-700 dark:text-warning-300 space-y-1">
                  <li>• Esta acción no se puede deshacer</li>
                  <li>• Los datos no podrán recuperarse</li>
                  <li>• Se notificará a los administradores</li>
                </ul>
              </div>
            </div>
          </Card.Body>

          <Card.Footer>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/modificar-persona/${person.id}`)}
                  className="flex-1"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Modificar en su lugar
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => setShowConfirm(true)}
                  className="flex-1"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Eliminar Persona
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </div>

      {/* Final Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setConfirmText('');
        }}
        title="Confirmación Final"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-6xl text-danger-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              ¿Estás completamente seguro?
            </h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-2">
              Esta acción eliminará permanentemente a:
            </p>
            <p className="font-semibold text-gray-900 dark:text-dark-text-primary mt-1">
              {person.primer_nombre} {person.apellidos}
            </p>
          </div>

          <div className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg">
            <p className="text-sm text-danger-700 dark:text-danger-300 mb-3">
              Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="w-full px-3 py-2 border border-danger-300 dark:border-danger-600 rounded-md bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-danger-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              disabled={confirmText !== 'ELIMINAR' || deleting}
              className="flex-1"
            >
              <i className="fas fa-trash mr-2"></i>
              Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletePerson;
