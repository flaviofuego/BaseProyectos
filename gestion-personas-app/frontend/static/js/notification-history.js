/**
 * Gestor de historial de notificaciones
 * Almacena y muestra el historial de notificaciones de la sesión
 */

class NotificationHistory {
    constructor() {
        this.maxNotifications = 50; // Máximo número de notificaciones a guardar
        this.sessionKey = 'session_notifications';
        this.notifications = this.loadNotifications();
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeElements() {
        this.notificationList = document.getElementById('notification-list');
        this.notificationBadge = document.getElementById('notification-badge');
        this.notificationCount = document.getElementById('notification-count');
        this.clearButton = document.getElementById('clear-notifications');
    }

    bindEvents() {
        // Botón de limpiar notificaciones
        if (this.clearButton) {
            this.clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAllNotifications();
            });
        }

        // Escuchar notificaciones del NotificationManager
        document.addEventListener('notificationShown', (event) => {
            this.addNotification(event.detail);
        });

        // Cerrar dropdown al hacer click en una notificación
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-item')) {
                const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('notificationsDropdown'));
                if (dropdown) {
                    dropdown.hide();
                }
            }
        });
    }

    loadNotifications() {
        try {
            const stored = sessionStorage.getItem(this.sessionKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
            return [];
        }
    }

    saveNotifications() {
        try {
            sessionStorage.setItem(this.sessionKey, JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Error al guardar notificaciones:', error);
        }
    }

    addNotification(notification) {
        // Crear objeto de notificación con timestamp
        const notificationObj = {
            id: Date.now() + Math.random(), // ID único
            type: notification.type || 'info',
            title: notification.title || '',
            message: notification.message || '',
            timestamp: new Date(),
            read: false
        };

        // Agregar al inicio del array
        this.notifications.unshift(notificationObj);

        // Limitar el número de notificaciones
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.saveNotifications();
        this.updateDisplay();
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateDisplay();
        }
    }

    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateDisplay();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateDisplay();
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMinutes < 1) {
            return 'Ahora mismo';
        } else if (diffMinutes < 60) {
            return `Hace ${diffMinutes} min`;
        } else if (diffHours < 24) {
            return `Hace ${diffHours} h`;
        } else {
            return date.toLocaleDateString();
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle text-success',
            'error': 'fa-exclamation-circle text-danger',
            'warning': 'fa-exclamation-triangle text-warning',
            'info': 'fa-info-circle text-primary'
        };
        return icons[type] || icons['info'];
    }

    createNotificationElement(notification) {
        const timeAgo = this.formatTimestamp(notification.timestamp);
        const iconClass = this.getNotificationIcon(notification.type);
        const readClass = notification.read ? 'read' : 'unread';

        return `
            <div class="notification-item ${readClass}" data-id="${notification.id}">
                <div class="d-flex align-items-start">
                    <div class="notification-icon me-2">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="notification-content flex-grow-1">
                        ${notification.title ? `<div class="notification-title">${this.escapeHtml(notification.title)}</div>` : ''}
                        <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                        <div class="notification-time">
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-link text-muted notification-remove" 
                            data-id="${notification.id}" title="Eliminar notificación">
                        <i class="fas fa-times fa-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateDisplay() {
        if (!this.notificationList) return;

        const unreadCount = this.getUnreadCount();

        // Actualizar badge
        if (this.notificationBadge && this.notificationCount) {
            if (unreadCount > 0) {
                this.notificationCount.textContent = unreadCount > 99 ? '99+' : unreadCount;
                this.notificationBadge.style.display = 'block';
            } else {
                this.notificationBadge.style.display = 'none';
            }
        }

        // Actualizar lista
        if (this.notifications.length === 0) {
            this.notificationList.innerHTML = `
                <div class="dropdown-item-text text-muted text-center py-3">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                    <br>
                    No hay notificaciones
                </div>
            `;
        } else {
            const notificationsHtml = this.notifications
                .map(notification => this.createNotificationElement(notification))
                .join('');
            
            this.notificationList.innerHTML = notificationsHtml;

            // Agregar event listeners para los botones de eliminar
            this.notificationList.querySelectorAll('.notification-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const notificationId = parseFloat(btn.dataset.id);
                    this.removeNotification(notificationId);
                });
            });

            // Agregar event listeners para marcar como leído
            this.notificationList.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.notification-remove')) {
                        const notificationId = parseFloat(item.dataset.id);
                        this.markAsRead(notificationId);
                    }
                });
            });
        }
    }

    // Método público para acceso desde otros scripts
    getNotifications() {
        return [...this.notifications];
    }

    // Método público para forzar actualización
    refresh() {
        this.notifications = this.loadNotifications();
        this.updateDisplay();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurar que NotificationManager esté inicializado
    setTimeout(() => {
        window.notificationHistory = new NotificationHistory();
    }, 100);
});

// Exportar para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationHistory;
}
