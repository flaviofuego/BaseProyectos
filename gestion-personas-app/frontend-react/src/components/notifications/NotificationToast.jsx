import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { clsx } from 'clsx';

const NotificationToast = ({ notification }) => {
  const { removeNotification } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  };

  const getTypeStyles = () => {
    const baseStyles = 'border-l-4';
    switch (notification.type) {
      case 'success':
        return `${baseStyles} border-success-500 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300`;
      case 'error':
        return `${baseStyles} border-danger-500 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300`;
      case 'warning':
        return `${baseStyles} border-warning-500 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300`;
      default:
        return `${baseStyles} border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300`;
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={clsx(
        'max-w-sm w-full rounded-lg shadow-lg transition-all duration-300 transform',
        getTypeStyles(),
        isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {notification.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          aria-label="Cerrar notificación"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
