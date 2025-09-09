import BaseChart from './BaseChart';

const LineChart = ({ 
  data, 
  title, 
  xTitle, 
  yTitle,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  showMarkers = true,
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
    x: trace.x || trace.labels,
    y: trace.y || trace.values,
    type: 'scatter',
    mode: showMarkers ? 'lines+markers' : 'lines',
    name: trace.name || `Serie ${index + 1}`,
    line: {
      color: trace.color || colors[index % colors.length],
      width: 3
    },
    marker: showMarkers ? {
      color: trace.color || colors[index % colors.length],
      size: 6,
      line: {
        color: '#ffffff',
        width: 1
      }
    } : undefined,
    hovertemplate: '<b>%{fullData.name}</b><br>X: %{x}<br>Y: %{y}<extra></extra>',
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

export default LineChart;
