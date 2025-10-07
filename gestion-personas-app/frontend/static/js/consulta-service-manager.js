/**
 * Consulta Service Manager
 * 
 * Este módulo maneja la configuración del servicio de consulta por usuario.
 * Permite obtener el estado actual y habilitarlo/deshabilitarlo desde el frontend.
 */

class ConsultaServiceManager {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.currentStatus = null;
    }

    /**
     * Obtiene el token de autenticación de la sesión
     */
    getAuthToken() {
        // El token se pasa desde el backend a través de una variable global
        // o se puede obtener de localStorage/sessionStorage
        return window.authToken || localStorage.getItem('authToken');
    }

    /**
     * Realiza una petición autenticada a la API
     */
    async makeRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        
        if (!token) {
            throw new Error('No hay token de autenticación disponible');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error en la petición');
        }

        return response.json();
    }

    /**
     * Obtiene el estado actual del servicio de consulta
     * @returns {Promise<boolean>} true si está habilitado, false si está deshabilitado
     */
    async getStatus() {
        try {
            const data = await this.makeRequest('/preferences');
            this.currentStatus = data.preferences.consulta_service_enabled;
            return this.currentStatus;
        } catch (error) {
            console.error('Error al obtener estado del servicio de consulta:', error);
            throw error;
        }
    }

    /**
     * Actualiza el estado del servicio de consulta
     * @param {boolean} enabled - true para habilitar, false para deshabilitar
     * @returns {Promise<Object>} Respuesta de la API
     */
    async setStatus(enabled) {
        try {
            const data = await this.makeRequest('/preferences/consulta-service', {
                method: 'PUT',
                body: JSON.stringify({ enabled })
            });
            
            this.currentStatus = enabled;
            return data;
        } catch (error) {
            console.error('Error al actualizar estado del servicio de consulta:', error);
            throw error;
        }
    }

    /**
     * Alterna el estado del servicio de consulta
     * @returns {Promise<Object>} Respuesta de la API
     */
    async toggleStatus() {
        const currentStatus = await this.getStatus();
        return this.setStatus(!currentStatus);
    }

    /**
     * Verifica si una respuesta de error es debido a que el servicio está deshabilitado
     * @param {Response} response - Respuesta de fetch
     * @returns {Promise<boolean>} true si el servicio está deshabilitado
     */
    async isServiceDisabledError(response) {
        if (response.status === 403) {
            try {
                const error = await response.json();
                return error.service_disabled === true;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Maneja un error de servicio deshabilitado mostrando un mensaje al usuario
     * @param {Function} callback - Función opcional a ejecutar cuando el usuario decida habilitar
     */
    handleServiceDisabledError(callback = null) {
        const message = 'El servicio de consulta está deshabilitado para tu usuario.\n\n' +
                       '¿Deseas habilitarlo ahora?';
        
        if (confirm(message)) {
            this.setStatus(true)
                .then(data => {
                    alert(data.message || 'Servicio habilitado correctamente');
                    if (callback) callback();
                })
                .catch(error => {
                    alert('Error al habilitar el servicio: ' + error.message);
                });
        }
    }
}

// Crear instancia global
const consultaServiceManager = new ConsultaServiceManager();

// Función de utilidad para inicializar el toggle switch en la página de configuración
function initConsultaServiceToggle(toggleElementId = 'consulta-service-toggle') {
    const toggle = document.getElementById(toggleElementId);
    
    if (!toggle) {
        console.warn('Toggle element not found:', toggleElementId);
        return;
    }

    // Obtener estado inicial
    consultaServiceManager.getStatus()
        .then(enabled => {
            toggle.checked = enabled;
            updateToggleUI(enabled);
        })
        .catch(error => {
            console.error('Error al obtener estado inicial:', error);
        });

    // Manejar cambios
    toggle.addEventListener('change', async (e) => {
        const newStatus = e.target.checked;
        const statusElement = document.getElementById('consulta-service-status');
        const descriptionElement = document.getElementById('consulta-service-description');

        // Deshabilitar toggle mientras se procesa
        toggle.disabled = true;

        try {
            const data = await consultaServiceManager.setStatus(newStatus);
            
            // Mostrar mensaje de éxito
            if (window.showNotification) {
                window.showNotification(data.message, 'success');
            } else {
                alert(data.message);
            }

            // Actualizar UI
            updateToggleUI(newStatus);

        } catch (error) {
            console.error('Error al cambiar estado:', error);
            
            // Revertir el toggle
            toggle.checked = !newStatus;
            
            // Mostrar error
            if (window.showNotification) {
                window.showNotification('Error: ' + error.message, 'error');
            } else {
                alert('Error: ' + error.message);
            }
        } finally {
            toggle.disabled = false;
        }
    });

    function updateToggleUI(enabled) {
        const statusElement = document.getElementById('consulta-service-status');
        const descriptionElement = document.getElementById('consulta-service-description');

        if (statusElement) {
            statusElement.textContent = enabled ? 'Habilitado' : 'Deshabilitado';
            statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
        }

        if (descriptionElement) {
            if (enabled) {
                descriptionElement.textContent = 'Tienes acceso completo al servicio de búsqueda y consulta de personas.';
            } else {
                descriptionElement.textContent = 'No puedes acceder a las funciones de búsqueda y consulta de personas. ' +
                                                'El dashboard y otras funcionalidades no se verán afectadas.';
            }
        }
    }
}

// Inicializar automáticamente si el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Solo inicializar si estamos en la página de configuración
        if (document.getElementById('consulta-service-toggle')) {
            initConsultaServiceToggle();
        }
    });
} else {
    // DOM ya está listo
    if (document.getElementById('consulta-service-toggle')) {
        initConsultaServiceToggle();
    }
}

// Exportar para uso en módulos ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConsultaServiceManager, consultaServiceManager, initConsultaServiceToggle };
}

