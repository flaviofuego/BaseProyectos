/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores personalizados que replican el sistema de variables CSS
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0d6efd',
          600: '#0969da',
          700: '#1f6feb',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#198754',
          600: '#238636',
          700: '#16a34a',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#dc3545',
          600: '#da3633',
          700: '#dc2626',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#ffc107',
          600: '#d29922',
          700: '#f59e0b',
        },
        // Modo oscuro
        dark: {
          bg: {
            primary: '#0d1117',
            secondary: '#161b22',
            tertiary: '#21262d',
            card: '#161b22',
          },
          text: {
            primary: '#f0f6fc',
            secondary: '#8b949e',
            muted: '#7d8590',
          },
          border: {
            primary: '#30363d',
            light: '#21262d',
          }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-in-out',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
