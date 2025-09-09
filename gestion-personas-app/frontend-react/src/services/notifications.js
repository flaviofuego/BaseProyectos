export const notificationService = {
  
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Hace unos segundos';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  },

  getTypeIcon(type) {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  },

  getTypeColor(type) {
    switch (type) {
      case 'success':
        return 'text-success-600 dark:text-success-400';
      case 'error':
        return 'text-danger-600 dark:text-danger-400';
      case 'warning':
        return 'text-warning-600 dark:text-warning-400';
      default:
        return 'text-primary-600 dark:text-primary-400';
    }
  },

  truncateMessage(message, maxLength = 100) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }
};
