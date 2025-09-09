import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useAuthHook } from '@/hooks/useAuth';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthHook();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
    { name: 'Crear Persona', href: '/crear-persona', icon: 'fas fa-user-plus' },
    { name: 'Consultar Personas', href: '/consultar-personas', icon: 'fas fa-search' },
    { name: 'Consulta NLP', href: '/consulta-nlp', icon: 'fas fa-robot' },
    { name: 'Logs del Sistema', href: '/consultar-logs', icon: 'fas fa-list-alt' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-primary-600 dark:bg-gray-900 border-b border-primary-700 dark:border-gray-800 shadow-lg" role="navigation" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center group focus:outline-none focus:ring-2 focus:ring-white rounded-md"
              aria-label="Ir al inicio - Gestión de Personas"
            >
              <svg className="h-8 w-8 text-white mr-3 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors duration-200">Gestión de Personas</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2" role="menubar">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                role="menuitem"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                  isActive(item.href)
                    ? 'bg-primary-700 dark:bg-primary-600 text-white shadow-inner'
                    : 'text-white hover:bg-primary-700 dark:hover:bg-gray-800 hover:shadow-md'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <i className={`${item.icon} mr-2`} aria-hidden="true"></i>
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <NotificationDropdown />
            
            {/* User Menu */}
            <div className="relative group">
              <button 
                className="flex items-center text-white hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded-md px-2 py-1"
                aria-label={`Menú de usuario - ${user?.username || 'Usuario'}`}
                aria-expanded="false"
                aria-haspopup="true"
              >
                <i className="fas fa-user-circle mr-2" aria-hidden="true"></i>
                <span>{user?.username || 'Usuario'}</span>
                <i className="fas fa-chevron-down ml-1 text-xs" aria-hidden="true"></i>
              </button>
              
              {/* User Dropdown */}
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-200 dark:border-gray-700"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                    aria-label="Cerrar sesión"
                  >
                    <i className="fas fa-sign-out-alt mr-2" aria-hidden="true"></i>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded-md p-1"
              aria-label={isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-primary-700 dark:bg-gray-800 border-t border-primary-800 dark:border-gray-700" role="menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                  isActive(item.href)
                    ? 'bg-primary-800 dark:bg-gray-700 text-white shadow-inner'
                    : 'text-white hover:bg-primary-800 dark:hover:bg-gray-700'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <i className={`${item.icon} mr-2`} aria-hidden="true"></i>
                {item.name}
              </Link>
            ))}
            
            {/* Mobile logout */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              role="menuitem"
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-primary-800 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Cerrar sesión"
            >
              <i className="fas fa-sign-out-alt mr-2" aria-hidden="true"></i>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
