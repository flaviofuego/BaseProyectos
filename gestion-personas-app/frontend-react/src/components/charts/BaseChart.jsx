import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useTheme } from '@/context/ThemeContext';

const BaseChart = ({ data, layout, config, className, onUpdate, ...props }) => {
  const plotRef = useRef(null);
  const { theme } = useTheme();
  const [plotCreated, setPlotCreated] = useState(false);

  // Get theme-aware colors
  const getThemedLayout = (originalLayout) => {
    const isDark = theme === 'dark';
    
    return {
      ...originalLayout,
      paper_bgcolor: isDark ? '#1f2937' : '#ffffff',
      plot_bgcolor: isDark ? '#1f2937' : '#ffffff',
      font: {
        ...originalLayout.font,
        color: isDark ? '#f9fafb' : '#111827'
      },
      xaxis: {
        ...originalLayout.xaxis,
        gridcolor: isDark ? '#374151' : '#e5e7eb',
        linecolor: isDark ? '#6b7280' : '#d1d5db',
        tickfont: {
          ...originalLayout.xaxis?.tickfont,
          color: isDark ? '#d1d5db' : '#374151'
        }
      },
      yaxis: {
        ...originalLayout.yaxis,
        gridcolor: isDark ? '#374151' : '#e5e7eb',
        linecolor: isDark ? '#6b7280' : '#d1d5db',
        tickfont: {
          ...originalLayout.yaxis?.tickfont,
          color: isDark ? '#d1d5db' : '#374151'
        }
      },
      legend: {
        ...originalLayout.legend,
        font: {
          ...originalLayout.legend?.font,
          color: isDark ? '#f9fafb' : '#111827'
        }
      }
    };
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'pan2d',
      'select2d',
      'lasso2d',
      'autoScale2d',
      'hoverClosestCartesian',
      'hoverCompareCartesian',
      'toggleSpikelines'
    ],
    ...config
  };

  useEffect(() => {
    if (!plotRef.current || !data) return;

    const themedLayout = getThemedLayout(layout || {});

    if (!plotCreated) {
      Plotly.newPlot(plotRef.current, data, themedLayout, defaultConfig)
        .then(() => {
          setPlotCreated(true);
          if (onUpdate) {
            plotRef.current.on('plotly_update', onUpdate);
          }
        })
        .catch(console.error);
    } else {
      Plotly.react(plotRef.current, data, themedLayout, defaultConfig)
        .catch(console.error);
    }

    return () => {
      if (plotRef.current && onUpdate) {
        plotRef.current.removeAllListeners('plotly_update');
      }
    };
  }, [data, layout, theme, plotCreated, onUpdate]);

  useEffect(() => {
    return () => {
      if (plotRef.current && plotCreated) {
        Plotly.purge(plotRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={plotRef} 
      className={`w-full h-full min-h-[300px] ${className || ''}`}
      {...props}
    />
  );
};

export default BaseChart;
