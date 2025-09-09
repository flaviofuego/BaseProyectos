import BaseChart from './BaseChart';

const ScatterChart = ({ 
  data, 
  title, 
  xTitle, 
  yTitle,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  showTrendline = false,
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
    x: trace.x || trace.xValues,
    y: trace.y || trace.yValues,
    type: 'scatter',
    mode: 'markers',
    name: trace.name || `Serie ${index + 1}`,
    marker: {
      color: trace.color || colors[index % colors.length],
      size: trace.size || 8,
      opacity: 0.7,
      line: {
        color: '#ffffff',
        width: 1
      }
    },
    text: trace.text || trace.labels,
    hovertemplate: '<b>%{fullData.name}</b><br>X: %{x}<br>Y: %{y}<br>%{text}<extra></extra>',
    ...trace
  }));

  // Add trendline if requested
  if (showTrendline && data.length > 0 && data[0].x && data[0].y) {
    const firstTrace = data[0];
    const xVals = firstTrace.x || firstTrace.xValues;
    const yVals = firstTrace.y || firstTrace.yValues;
    
    if (xVals && yVals && xVals.length === yVals.length) {
      // Simple linear regression
      const n = xVals.length;
      const sumX = xVals.reduce((a, b) => a + b, 0);
      const sumY = yVals.reduce((a, b) => a + b, 0);
      const sumXY = xVals.reduce((sum, x, i) => sum + x * yVals[i], 0);
      const sumXX = xVals.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const trendlineY = [minX * slope + intercept, maxX * slope + intercept];
      
      chartData.push({
        x: [minX, maxX],
        y: trendlineY,
        type: 'scatter',
        mode: 'lines',
        name: 'Línea de tendencia',
        line: {
          color: '#ef4444',
          width: 2,
          dash: 'dash'
        },
        hovertemplate: 'Tendencia<br>X: %{x}<br>Y: %{y}<extra></extra>'
      });
    }
  }

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
    showlegend: data.length > 1 || showTrendline,
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

export default ScatterChart;
