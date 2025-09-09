const Footer = () => {
  return (
    <footer className="bg-white dark:bg-dark-bg-card border-t border-gray-200 dark:border-dark-border-primary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
            © 2025 Sistema de Gestión de Personas v2.5. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Desarrollado con ❤️ usando React + Tailwind CSS
            </span>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-success-600 dark:text-success-400 font-medium">
                En línea
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border-primary">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 dark:text-dark-text-muted">
            <div>
              Versión del Frontend: React 18.2.0 | Backend API: v2.5
            </div>
            <div className="mt-2 sm:mt-0">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
