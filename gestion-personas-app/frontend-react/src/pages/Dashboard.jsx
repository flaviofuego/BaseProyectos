import { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { consultaApi } from '@/services/api';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const { success, error } = useNotifications();
  const { isDark } = useTheme();

  const fetchStats = useCallback(async () => {
    try {
      const data = await consultaApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      error('Error al cargar estadísticas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const forceRefresh = async () => {
    setLoading(true);
    try {
      await consultaApi.refreshStats();
      await fetchStats();
      success('Dashboard actualizado con datos frescos!');
    } catch (err) {
      error('Error al actualizar dashboard: ' + err.message);
    }
  };

  const startAutoRefresh = () => {
    if (refreshInterval) return;
    
    const interval = setInterval(fetchStats, 10000); // 10 seconds
    setRefreshInterval(interval);
    success('Auto-actualización activada (cada 10s)');
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
      success('Auto-actualización desactivada');
    }
  };

  useEffect(() => {
    fetchStats();
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const plotConfig = {
    displayModeBar: false,
    responsive: true
  };

  const plotLayout = {
    height: 300,
    margin: { t: 20, b: 60, l: 40, r: 20 },
    paper_bgcolor: isDark ? '#161b22' : '#ffffff',
    plot_bgcolor: isDark ? '#161b22' : '#ffffff',
    font: {
      color: isDark ? '#f0f6fc' : '#212529'
    },
    xaxis: {
      gridcolor: isDark ? '#30363d' : '#e9ecef',
      zerolinecolor: isDark ? '#30363d' : '#e9ecef'
    },
    yaxis: {
      gridcolor: isDark ? '#30363d' : '#e9ecef',
      zerolinecolor: isDark ? '#30363d' : '#e9ecef'
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Dashboard de Estadísticas
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchStats} disabled={loading} size="sm">
            <i className="fas fa-sync-alt mr-2"></i>
            Actualizar
          </Button>
          <Button onClick={forceRefresh} variant="warning" disabled={loading} size="sm">
            <i className="fas fa-sync mr-2"></i>
            Forzar
          </Button>
          {refreshInterval ? (
            <Button onClick={stopAutoRefresh} variant="danger" size="sm">
              <i className="fas fa-stop mr-2"></i>
              Detener Auto
            </Button>
          ) : (
            <Button onClick={startAutoRefresh} variant="success" size="sm">
              <i className="fas fa-play mr-2"></i>
              Auto-Actualizar
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary-500" hover>
              <Card.Body>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                      Total Personas
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                      {stats.total_personas || 0}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="fas fa-users text-3xl text-primary-500"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {stats.estadisticas_edad && (
              <>
                <Card className="border-l-4 border-l-success-500" hover>
                  <Card.Body>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                          Edad Promedio
                        </p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                          {Math.round(stats.estadisticas_edad.promedio)} años
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="fas fa-chart-line text-3xl text-success-500"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="border-l-4 border-l-warning-500" hover>
                  <Card.Body>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                          Edad Mínima
                        </p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                          {stats.estadisticas_edad.minima} años
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="fas fa-arrow-down text-3xl text-warning-500"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="border-l-4 border-l-danger-500" hover>
                  <Card.Body>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                          Edad Máxima
                        </p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                          {stats.estadisticas_edad.maxima} años
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="fas fa-arrow-up text-3xl text-danger-500"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Chart */}
            {stats.por_genero && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    Distribución por Género
                  </h3>
                </Card.Header>
                <Card.Body>
                  <Plot
                    data={[{
                      values: Object.values(stats.por_genero),
                      labels: Object.keys(stats.por_genero),
                      type: 'pie',
                      marker: {
                        colors: ['#0d6efd', '#6f42c1', '#20c997']
                      }
                    }]}
                    layout={{
                      ...plotLayout,
                      showlegend: true
                    }}
                    config={plotConfig}
                    style={{ width: '100%' }}
                  />
                </Card.Body>
              </Card>
            )}

            {/* Age Chart */}
            {stats.por_grupo_edad && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    Distribución por Grupo de Edad
                  </h3>
                </Card.Header>
                <Card.Body>
                  <Plot
                    data={[{
                      x: Object.keys(stats.por_grupo_edad),
                      y: Object.values(stats.por_grupo_edad),
                      type: 'bar',
                      marker: { color: '#17a2b8' }
                    }]}
                    layout={{
                      ...plotLayout,
                      xaxis: { 
                        ...plotLayout.xaxis,
                        title: 'Grupo de Edad' 
                      },
                      yaxis: { 
                        ...plotLayout.yaxis,
                        title: 'Cantidad' 
                      }
                    }}
                    config={plotConfig}
                    style={{ width: '100%' }}
                  />
                </Card.Body>
              </Card>
            )}
          </div>

          {/* Youngest Person Card */}
          {stats.persona_mas_joven && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Persona Más Joven
                </h3>
              </Card.Header>
              <Card.Body>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <i className="fas fa-user-circle text-4xl text-primary-500"></i>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                      {stats.persona_mas_joven.primer_nombre} {stats.persona_mas_joven.apellidos}
                    </h4>
                    <p className="text-gray-600 dark:text-dark-text-secondary">
                      Edad: {stats.persona_mas_joven.edad} años
                    </p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
