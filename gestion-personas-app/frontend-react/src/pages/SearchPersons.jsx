import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { personasApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { formatDate, calculateAge, debounce } from '@/utils/helpers';
import { DOCUMENT_TYPES, GENDER_OPTIONS } from '@/utils/constants';

const SearchPersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    tipo_documento: '',
    genero: '',
    edad_min: '',
    edad_max: ''
  });
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const { success, error } = useNotifications();

  const fetchPersons = useCallback(async (page = 1, query = '', filterParams = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        q: query,
        ...filterParams
      };

      const response = query 
        ? await personasApi.search(query)
        : await personasApi.getAll(params);

      setPersons(response.data || response);
      setPagination(prev => ({
        ...prev,
        page: response.page || 1,
        total: response.total || response.length,
        totalPages: response.totalPages || Math.ceil((response.total || response.length) / prev.limit)
      }));
    } catch (err) {
      error('Error al buscar personas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, error]);

  const debouncedSearch = useCallback(
    debounce((query, filterParams) => {
      fetchPersons(1, query, filterParams);
    }, 500),
    [fetchPersons]
  );

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    debouncedSearch(searchQuery, filters);
  }, [searchQuery, filters, debouncedSearch]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      tipo_documento: '',
      genero: '',
      edad_min: '',
      edad_max: ''
    });
  };

  const viewPersonDetails = (person) => {
    setSelectedPerson(person);
    setShowDetails(true);
  };

  const handlePageChange = (newPage) => {
    fetchPersons(newPage, searchQuery, filters);
  };

  const exportData = async () => {
    try {
      success('Función de exportación en desarrollo');
    } catch (err) {
      error('Error al exportar datos: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Consultar Personas
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <i className="fas fa-download mr-2"></i>
            Exportar
          </Button>
          <Link to="/crear-persona">
            <Button>
              <i className="fas fa-plus mr-2"></i>
              Nueva Persona
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Filtros de Búsqueda
            </h2>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <i className="fas fa-times mr-2"></i>
              Limpiar
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Búsqueda General"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre, documento, email..."
            />
            
            <Select
              label="Tipo de Documento"
              value={filters.tipo_documento}
              onChange={(e) => handleFilterChange('tipo_documento', e.target.value)}
              placeholder="Todos los tipos"
            >
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            
            <Select
              label="Género"
              value={filters.genero}
              onChange={(e) => handleFilterChange('genero', e.target.value)}
              placeholder="Todos los géneros"
            >
              {Object.entries(GENDER_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            
            <div className="flex gap-2">
              <Input
                label="Edad Mín"
                type="number"
                value={filters.edad_min}
                onChange={(e) => handleFilterChange('edad_min', e.target.value)}
                placeholder="18"
                min="0"
                max="120"
              />
              <Input
                label="Edad Máx"
                type="number"
                value={filters.edad_max}
                onChange={(e) => handleFilterChange('edad_max', e.target.value)}
                placeholder="65"
                min="0"
                max="120"
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Results */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Resultados ({pagination.total} personas)
            </h2>
            {loading && <Spinner size="sm" />}
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          {loading && persons.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : persons.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-dark-text-muted">
                No se encontraron personas con los criterios especificados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border-primary">
                <thead className="bg-gray-50 dark:bg-dark-bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Persona
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Edad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-bg-card divide-y divide-gray-200 dark:divide-dark-border-primary">
                  {persons.map((person) => (
                    <tr key={person.id} className="bg-gray-50 dark:bg-dark-bg-secondary">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {person.primer_nombre?.[0]}{person.apellidos?.split(' ')[0]?.[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                              {person.primer_nombre} {person.segundo_nombre} {person.apellidos}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-dark-text-muted">
                              {GENDER_OPTIONS[person.genero]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                          {person.tipo_documento} {person.numero_documento}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-dark-text-muted">
                          {formatDate(person.fecha_nacimiento)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-dark-text-primary">
                        {calculateAge(person.fecha_nacimiento)} años
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                          {person.email || 'Sin email'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-dark-text-muted">
                          {person.telefono || 'Sin teléfono'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewPersonDetails(person)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400"
                            title="Ver detalles"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <Link
                            to={`/modificar-persona/${person.id}`}
                            className="text-warning-600 hover:text-warning-900 dark:text-warning-400"
                            title="Modificar"
                          >
                            <i className="fas fa-edit"></i>
                          </Link>
                          <Link
                            to={`/borrar-persona/${person.id}`}
                            className="text-danger-600 hover:text-danger-900 dark:text-danger-400"
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Card.Footer>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-dark-text-secondary">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} resultados
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
                
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    (page >= pagination.page - 2 && page <= pagination.page + 2)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={page === pagination.page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === pagination.page - 3 || page === pagination.page + 3) {
                    return <span key={page} className="px-2 text-gray-500">...</span>;
                  }
                  return null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <i className="fas fa-chevron-right"></i>
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Person Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Detalles de la Persona"
        size="lg"
      >
        {selectedPerson && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Nombre Completo:</strong>
                <p>{selectedPerson.primer_nombre} {selectedPerson.segundo_nombre} {selectedPerson.apellidos}</p>
              </div>
              <div>
                <strong>Documento:</strong>
                <p>{selectedPerson.tipo_documento} {selectedPerson.numero_documento}</p>
              </div>
              <div>
                <strong>Fecha de Nacimiento:</strong>
                <p>{formatDate(selectedPerson.fecha_nacimiento)}</p>
              </div>
              <div>
                <strong>Edad:</strong>
                <p>{calculateAge(selectedPerson.fecha_nacimiento)} años</p>
              </div>
              <div>
                <strong>Género:</strong>
                <p>{GENDER_OPTIONS[selectedPerson.genero]}</p>
              </div>
              <div>
                <strong>Email:</strong>
                <p>{selectedPerson.email || 'No especificado'}</p>
              </div>
              <div>
                <strong>Teléfono:</strong>
                <p>{selectedPerson.telefono || 'No especificado'}</p>
              </div>
              <div>
                <strong>Dirección:</strong>
                <p>{selectedPerson.direccion || 'No especificada'}</p>
              </div>
              <div>
                <strong>Ciudad:</strong>
                <p>{selectedPerson.ciudad || 'No especificada'}</p>
              </div>
              <div>
                <strong>Departamento:</strong>
                <p>{selectedPerson.departamento || 'No especificado'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SearchPersons;
