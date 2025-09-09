import { useState, useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { error: showError } = useNotifications();

  const request = useCallback(async (apiCall, options = {}) => {
    const { 
      showErrorNotification = true,
      loadingState = true,
      onSuccess,
      onError 
    } = options;

    try {
      if (loadingState) setLoading(true);
      setError(null);
      
      const result = await apiCall();
      
      if (onSuccess) onSuccess(result);
      return result;
      
    } catch (err) {
      const errorMessage = err.message || 'Error en la operación';
      setError(errorMessage);
      
      if (showErrorNotification) {
        showError(errorMessage);
      }
      
      if (onError) onError(err);
      throw err;
      
    } finally {
      if (loadingState) setLoading(false);
    }
  }, [showError]);

  return {
    loading,
    error,
    request
  };
};
