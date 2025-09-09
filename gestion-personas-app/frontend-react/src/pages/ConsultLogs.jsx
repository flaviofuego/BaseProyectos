import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { logsApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { formatDateTime, debounce } from '@/utils/helpers';

const ConsultLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    level: '',
    service: '',
    date_from: '',
    date_to: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  const { error } = useNotifications();

  const logLevels = [
    { value: 'DEBUG', label: 'Debug', color: 'text-gray-600' },
    { value: 'INFO', label: 'Info', color: 'text-blue-600' },
    { value: 'WARNING', label: 'Warning', color: 'text-warning-600' },
    { value: 'ERROR', label: 'Error', color: 'text-danger-600' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-danger-800' }
  ];

  const services = [
    { value: 'auth', label: 'Autenticación' },
    { value: 'personas', label: 'Gestión de Personas' },
    { value: 'consulta', label: 'Consultas' },
    { value: 'nlp', label: 'Procesamiento NLP' },
    { value: 'log', label: 'Sistema de Logs' },
    { value: 'gateway', label: 'API Gateway' }
  ];

  const fetchLogs = useCallback(async (page = 1, query = '', filterParams = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filterParams
      };

      // Clean empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = query 
        ? await logsApi.search(query, params)
        : await logsApi.getAll(params);

      setLogs(response.data || response);
      setPagination(prev => ({
        ...prev,
        page: response.page || 1,
        total: response.total || response.length,
        totalPages: response.totalPages || Math.ceil((response.total || response.length) / prev.limit)
      }));
    } catch (err) {
      error('Error al cargar logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, error]);

  const debouncedSearch = useCallback(
    debounce((query, filterParams) => {
      fetchLogs(1, query, filterParams);
    }, 500),
    [fetchLogs]
  );

  useEffect(() => {
    fetchLogs();
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
      level: '',
      service: '',
      date_from: '',
      date_to: ''
    });
  };

  const handlePageChange = (newPage) => {
    fetchLogs(newPage, searchQuery, filters);
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getLevelBadgeClass = (level) => {
    const levelConfig = logLevels.find(l => l.value === level);
    if (!levelConfig) return 'bg-gray-100 text-gray-800';
    
    switch (level) {
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'WARNING':
        return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-300';
      case 'ERROR':
        return 'bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-300';
      case 'CRITICAL':
        return 'bg-danger-200 text-danger-900 dark:bg-danger-900/40 dark:text-danger-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatLogMessage = (message) => {
    if (typeof message === 'string') return message;
    return JSON.stringify(message, null, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Logs del Sistema
        </h1>
        <Button onClick={() => fetchLogs(pagination.page, searchQuery, filters)}>
          <i className="fas fa-sync-alt mr-2"></i>
          Actualizar
        </Button>
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
            <div className="lg:col-span-2">
              <Input
                label="Búsqueda en Logs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en mensajes, IPs, usuarios..."
              />
            </div>
            
            <Select
              label="Nivel de Log"
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              placeholder="Todos los niveles"
            >
              {logLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </Select>
            
            <Select
              label="Servicio"
              value={filters.service}
              onChange={(e) => handleFilterChange('service', e.target.value)}
              placeholder="Todos los servicios"
            >
              {services.map(service => (
                <option key={service.value} value={service.value}>{service.label}</option>
              ))}
            </Select>
            
            <Input
              label="Fecha Desde"
              type="datetime-local"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
            
            <Input
              label="Fecha Hasta"
              type="datetime-local"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Results */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Registros de Logs ({pagination.total} entradas)
            </h2>
            {loading && <Spinner size="sm" />}
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-file-alt text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-dark-text-muted">
                No se encontraron logs con los criterios especificados
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={log.id || index}
                  className="border-b border-gray-200 dark:border-dark-border-primary hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors duration-200"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeClass(log.level)}`}>
                            {log.level}
                          </span>
                          
                          {log.service && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                              {services.find(s => s.value === log.service)?.label || log.service}
                            </span>
                          )}
                          
                          <span className="text-sm text-gray-500 dark:text-dark-text-muted">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                          {expandedLogs.has(log.id) ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 dark:bg-dark-bg-tertiary p-3 rounded-lg overflow-x-auto">
                              {formatLogMessage(log.message)}
                            </pre>
                          ) : (
                            <p className="truncate">
                              {typeof log.message === 'string' ? log.message : JSON.stringify(log.message)}
                            </p>
                          )}
                        </div>
                        
                        {log.metadata && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-dark-text-muted">
                            {log.metadata.ip && (
                              <span className="mr-4">
                                <i className="fas fa-globe mr-1"></i>
                                {log.metadata.ip}
                              </span>
                            )}
                            {log.metadata.user_id && (
                              <span className="mr-4">
                                <i className="fas fa-user mr-1"></i>
                                Usuario: {log.metadata.user_id}
                              </span>
                            )}
                            {log.metadata.endpoint && (
                              <span>
                                <i className="fas fa-link mr-1"></i>
                                {log.metadata.endpoint}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={expandedLogs.has(log.id) ? "Contraer" : "Expandir"}
                      >
                        <i className={`fas ${expandedLogs.has(log.id) ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                {pagination.total} registros
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
    </div>
  );
};

export default ConsultLogs;
