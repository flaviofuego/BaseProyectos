import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import Button from '@/components/ui/Button';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, notificationHistory, clearHistory } = useNotifications();
  const dropdownRef = useRef(null);

  const unreadCount = notifications.length;
  const hasHistory = notificationHistory.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-white hover:text-gray-200 transition-colors duration-200"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-bg-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border-primary z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Notificaciones
              </h3>
              {hasHistory && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearHistory();
                    setIsOpen(false);
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {!hasHistory ? (
              <div className="p-4 text-center text-gray-500 dark:text-dark-text-muted">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7h6l-6-6v6z" />
                </svg>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notificationHistory.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors duration-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-lg">
                        {notificationService.getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-dark-text-primary">
                          {notificationService.truncateMessage(notification.message, 80)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                          {notificationService.formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasHistory && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border-primary bg-gray-50 dark:bg-dark-bg-secondary rounded-b-lg">
              <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center">
                Mostrando últimas {Math.min(notificationHistory.length, 50)} notificaciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
