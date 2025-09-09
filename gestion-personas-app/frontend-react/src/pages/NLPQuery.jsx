import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { nlpApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { formatDateTime } from '@/utils/helpers';

const NLPQuery = () => {
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedExample, setSelectedExample] = useState('');
  const textareaRef = useRef(null);

  const { success, error } = useNotifications();

  const queryTypes = [
    { value: 'general', label: 'Consulta General', description: 'Preguntas abiertas sobre personas' },
    { value: 'search', label: 'Búsqueda Inteligente', description: 'Buscar personas por características' },
    { value: 'statistics', label: 'Estadísticas', description: 'Análisis de datos y métricas' },
    { value: 'analysis', label: 'Análisis', description: 'Análisis profundo de patrones' }
  ];

  const exampleQueries = {
    general: [
      '¿Cuántas personas hay registradas en el sistema?',
      'Muéstrame información sobre las personas de Madrid',
      '¿Qué personas tienen más de 30 años?',
      'Lista las personas ordenadas por edad'
    ],
    search: [
      'Busca personas que trabajen en tecnología',
      'Encuentra personas que vivan en Barcelona o Valencia',
      'Busca programadores con más de 5 años de experiencia',
      'Muestra personas nacidas entre 1980 y 1990'
    ],
    statistics: [
      '¿Cuál es la distribución por edades?',
      'Muestra estadísticas por ciudad',
      '¿Cuál es la profesión más común?',
      'Analiza la distribución geográfica'
    ],
    analysis: [
      'Analiza patrones de edad por profesión',
      'Compara la distribución de edades entre ciudades',
      'Identifica tendencias en los datos',
      'Analiza correlaciones entre variables'
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await nlpApi.processQuery({
        query: query.trim(),
        type: queryType
      });

      const newResult = {
        id: Date.now(),
        query: query.trim(),
        type: queryType,
        result: response,
        timestamp: new Date().toISOString()
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 queries
      success('Consulta procesada exitosamente');
    } catch (err) {
      error('Error al procesar consulta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setSelectedExample('');
  };

  const loadExample = (example) => {
    setQuery(example);
    setSelectedExample(example);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setResult(null);
    success('Historial limpiado');
  };

  const formatResult = (data) => {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
      return data.map((item, index) => (
        <div key={index} className="mb-2 p-2 bg-gray-50 dark:bg-dark-bg-tertiary rounded">
          {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
        </div>
      ));
    }
    if (typeof data === 'object') {
      return <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>;
    }
    return String(data);
  };

  const getQueryTypeColor = (type) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'search': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'statistics': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'analysis': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            Consultas NLP
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Realiza consultas en lenguaje natural sobre los datos de personas
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={clearHistory}>
            <i className="fas fa-trash mr-2"></i>
            Limpiar Historial
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Nueva Consulta
              </h2>
            </Card.Header>
            
            <Card.Body>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Tipo de Consulta"
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  required
                >
                  {queryTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </Select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Consulta en Lenguaje Natural
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Escribe tu consulta en lenguaje natural..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-brain mr-2"></i>
                        Procesar Consulta
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearQuery}
                    disabled={!query}
                  >
                    <i className="fas fa-times mr-2"></i>
                    Limpiar
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <Card.Header>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      Resultado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                      {formatDateTime(result.timestamp)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQueryTypeColor(result.type)}`}>
                    {queryTypes.find(t => t.value === result.type)?.label}
                  </span>
                </div>
              </Card.Header>
              
              <Card.Body>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                      Consulta:
                    </h4>
                    <p className="text-gray-700 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-bg-tertiary p-3 rounded-lg">
                      {result.query}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                      Resultado:
                    </h4>
                    <div className="bg-gray-50 dark:bg-dark-bg-tertiary p-4 rounded-lg overflow-auto">
                      <div className="text-gray-700 dark:text-dark-text-secondary">
                        {formatResult(result.result)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Examples */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Ejemplos de Consultas
              </h3>
            </Card.Header>
            
            <Card.Body>
              <div className="space-y-4">
                {queryTypes.map(type => (
                  <div key={type.value}>
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                      {type.label}
                    </h4>
                    <div className="space-y-2">
                      {exampleQueries[type.value]?.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => loadExample(example)}
                          className={`w-full text-left text-sm p-2 rounded-lg border transition-colors duration-200 ${
                            selectedExample === example
                              ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-300'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-dark-bg-tertiary dark:border-dark-border-primary dark:text-dark-text-secondary dark:hover:bg-dark-bg-secondary'
                          }`}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Query History */}
          {history.length > 0 && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Historial de Consultas
                </h3>
              </Card.Header>
              
              <Card.Body>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 dark:border-dark-border-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors duration-200 cursor-pointer"
                      onClick={() => {
                        setQuery(item.query);
                        setQueryType(item.type);
                        setResult(item);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getQueryTypeColor(item.type)}`}>
                          {queryTypes.find(t => t.value === item.type)?.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-dark-text-muted">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-dark-text-secondary line-clamp-2">
                        {item.query}
                      </p>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NLPQuery;
