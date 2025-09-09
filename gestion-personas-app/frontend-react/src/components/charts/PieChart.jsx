import BaseChart from './BaseChart';

const PieChart = ({ 
  data, 
  title, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16'],
  showLegend = true,
  hole = 0,
  className,
  ...props 
}) => {
  if (!data || !data.labels || !data.values) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  const chartData = [{
    labels: data.labels,
    values: data.values,
    type: 'pie',
    hole: hole,
    marker: {
      colors: data.colors || colors,
      line: {
        color: '#ffffff',
        width: 2
      }
    },
    textinfo: 'label+percent',
    textposition: 'auto',
    hovertemplate: '<b>%{label}</b><br>Valor: %{value}<br>Porcentaje: %{percent}<extra></extra>',
    ...data
  }];

  const layout = {
    title: {
      text: title,
      font: { size: 16, weight: 'bold' }
    },
    margin: { l: 30, r: 30, t: 60, b: 30 },
    showlegend: showLegend,
    legend: {
      orientation: 'v',
      x: 1,
      y: 0.5
    }
  };

  return (
    <BaseChart
      data={chartData}
      layout={layout}
      className={className}
      {...props}
    />
  );
};

export default PieChart;
