const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            © 2025 Sistema de Gestión de Personas v2.5. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Desarrollado con <span className="text-red-500" aria-label="amor">❤️</span> usando React + Tailwind CSS
            </span>
            
            <div className="flex items-center space-x-2" aria-label="Estado del sistema">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                En línea
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 dark:text-gray-400">
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
