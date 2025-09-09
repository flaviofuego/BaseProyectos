import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState(() => {
    const saved = sessionStorage.getItem('session_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date().toISOString(),
      duration
    };

    setNotifications(prev => [...prev, notification]);
    setNotificationHistory(prev => {
      const updated = [notification, ...prev].slice(0, 50); // Keep last 50
      sessionStorage.setItem('session_notifications', JSON.stringify(updated));
      return updated;
    });

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
    sessionStorage.removeItem('session_notifications');
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => addNotification(message, 'success', duration), [addNotification]);
  const error = useCallback((message, duration) => addNotification(message, 'error', duration), [addNotification]);
  const warning = useCallback((message, duration) => addNotification(message, 'warning', duration), [addNotification]);
  const info = useCallback((message, duration) => addNotification(message, 'info', duration), [addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      notificationHistory,
      addNotification,
      removeNotification,
      clearAllNotifications,
      clearHistory,
      success,
      error,
      warning,
      info
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
