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
    paper_bgcolor: isDark ? '#111827' : '#ffffff',
    plot_bgcolor: isDark ? '#111827' : '#ffffff',
    font: {
      color: isDark ? '#f9fafb' : '#111827'
    },
    xaxis: {
      gridcolor: isDark ? '#374151' : '#e5e7eb',
      zerolinecolor: isDark ? '#374151' : '#e5e7eb'
    },
    yaxis: {
      gridcolor: isDark ? '#374151' : '#e5e7eb',
      zerolinecolor: isDark ? '#374151' : '#e5e7eb'
    }
  };

  return (
    <main className="space-y-6 animate-fade-in" role="main">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard de Estadísticas
        </h1>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Controles del dashboard">
          <Button onClick={fetchStats} disabled={loading} size="sm" aria-label="Actualizar estadísticas">
            <i className="fas fa-sync-alt mr-2" aria-hidden="true"></i>
            Actualizar
          </Button>
          <Button onClick={forceRefresh} variant="warning" disabled={loading} size="sm" aria-label="Forzar actualización completa">
            <i className="fas fa-sync mr-2" aria-hidden="true"></i>
            Forzar
          </Button>
          {refreshInterval ? (
            <Button onClick={stopAutoRefresh} variant="danger" size="sm" aria-label="Detener actualización automática">
              <i className="fas fa-stop mr-2" aria-hidden="true"></i>
              Detener Auto
            </Button>
          ) : (
            <Button onClick={startAutoRefresh} variant="success" size="sm" aria-label="Iniciar actualización automática">
              <i className="fas fa-play mr-2" aria-hidden="true"></i>
              Auto-Actualizar
            </Button>
          )}
        </div>
      </header>

      {stats && (
        <>
          {/* Stats Cards */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Estadísticas principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-primary-500 shadow-lg hover:shadow-xl transition-shadow duration-300" hover>
                <Card.Body>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Personas
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {stats.total_personas || 0}
                      </p>
                    </div>
                    <div className="flex-shrink-0" aria-hidden="true">
                      <i className="fas fa-users text-3xl text-primary-500"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {stats.estadisticas_edad && (
                <>
                  <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300" hover>
                    <Card.Body>
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Edad Promedio
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.round(stats.estadisticas_edad.promedio)} años
                          </p>
                        </div>
                        <div className="flex-shrink-0" aria-hidden="true">
                          <i className="fas fa-chart-line text-3xl text-green-500"></i>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>

                  <Card className="border-l-4 border-l-yellow-500 shadow-lg hover:shadow-xl transition-shadow duration-300" hover>
                    <Card.Body>
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Edad Mínima
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {stats.estadisticas_edad.minima} años
                          </p>
                        </div>
                        <div className="flex-shrink-0" aria-hidden="true">
                          <i className="fas fa-arrow-down text-3xl text-yellow-500"></i>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>

                  <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow duration-300" hover>
                    <Card.Body>
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Edad Máxima
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {stats.estadisticas_edad.maxima} años
                          </p>
                        </div>
                        <div className="flex-shrink-0" aria-hidden="true">
                          <i className="fas fa-arrow-up text-3xl text-red-500"></i>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </>
              )}
            </div>
          </section>

          {/* Charts */}
          <section aria-labelledby="charts-heading">
            <h2 id="charts-heading" className="sr-only">Gráficos estadísticos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Chart */}
              {stats.por_genero && (
                <Card className="shadow-lg">
                  <Card.Header>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                          colors: ['#3b82f6', '#8b5cf6', '#10b981']
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
                <Card className="shadow-lg">
                  <Card.Header>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Distribución por Grupo de Edad
                  </h3>
                </Card.Header>
                <Card.Body>
                  <Plot
                    data={[{
                      x: Object.keys(stats.por_grupo_edad),
                      y: Object.values(stats.por_grupo_edad),
                      type: 'bar',
                      marker: { color: '#06b6d4' }
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
          </section>

          {/* Youngest Person Card */}
          {stats.persona_mas_joven && (
            <section aria-labelledby="youngest-person-heading">
              <h2 id="youngest-person-heading" className="sr-only">Persona más joven registrada</h2>
              <Card className="shadow-lg">
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Persona Más Joven
                  </h3>
                </Card.Header>
                <Card.Body>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0" aria-hidden="true">
                      <i className="fas fa-user-circle text-4xl text-primary-500"></i>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {stats.persona_mas_joven.primer_nombre} {stats.persona_mas_joven.apellidos}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Edad: {stats.persona_mas_joven.edad} años
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </section>
          )}
        </>
      )}
    </main>
  );
};

export default Dashboard;
