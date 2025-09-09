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
    <nav className="bg-primary-500 dark:bg-primary-700 border-b border-primary-600 dark:border-primary-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <svg className="h-8 w-8 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold text-white">Gestión de Personas</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-primary-700 dark:bg-primary-600 text-white'
                    : 'text-white hover:bg-primary-600 dark:hover:bg-primary-600'
                }`}
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
              <button className="flex items-center text-white hover:text-gray-200 transition-colors duration-200">
                <i className="fas fa-user-circle mr-2" aria-hidden="true"></i>
                <span>{user?.username || 'Usuario'}</span>
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              {/* User Dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-bg-card rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-bg-secondary transition-colors duration-200"
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
              className="md:hidden text-white hover:text-gray-200 transition-colors duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="md:hidden bg-primary-600 dark:bg-primary-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-primary-700 dark:bg-primary-600 text-white'
                    : 'text-white hover:bg-primary-700 dark:hover:bg-primary-600'
                }`}
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
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-primary-700 dark:hover:bg-primary-600 transition-all duration-200"
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
