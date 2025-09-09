import BaseChart from './BaseChart';

const BarChart = ({ 
  data, 
  title, 
  xTitle, 
  yTitle, 
  horizontal = false,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  className,
  ...props 
}) => {
  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  const chartData = data.map((trace, index) => ({
    x: horizontal ? trace.values : trace.labels,
    y: horizontal ? trace.labels : trace.values,
    type: 'bar',
    orientation: horizontal ? 'h' : 'v',
    name: trace.name || `Serie ${index + 1}`,
    marker: {
      color: trace.color || colors[index % colors.length],
      opacity: 0.8
    },
    hovertemplate: horizontal 
      ? '<b>%{y}</b><br>Valor: %{x}<extra></extra>'
      : '<b>%{x}</b><br>Valor: %{y}<extra></extra>',
    ...trace
  }));

  const layout = {
    title: {
      text: title,
      font: { size: 16, weight: 'bold' }
    },
    xaxis: {
      title: xTitle,
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: yTitle,
      showgrid: true,
      zeroline: false
    },
    margin: { l: 60, r: 30, t: 60, b: 60 },
    showlegend: data.length > 1,
    legend: {
      orientation: 'h',
      y: -0.2
    },
    barmode: 'group'
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

export default BarChart;
