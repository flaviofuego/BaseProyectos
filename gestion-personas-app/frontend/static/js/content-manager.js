/**
 * Content Manager - Gestor de contenido dinámico y animaciones
 * Maneja loaders, transiciones y carga de datos
 */

class ContentManager {
    constructor() {
        this.loadingElements = new Set();
        this.init();
    }

    /**
     * Inicializa el gestor de contenido
     */
    init() {
        this.setupFormHandlers();
        this.setupTableHandlers();
        this.setupAjaxHandlers();
        this.setupPageAnimations();
    }

    /**
     * Configura manejadores para formularios
     */
    setupFormHandlers() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM' && !form.classList.contains('no-loader')) {
                this.showFormLoader(form);
            }
        });

        // Auto-hide loaders en inputs cuando cambian
        document.addEventListener('input', (e) => {
            const formGroup = e.target.closest('.form-group');
            if (formGroup && formGroup.classList.contains('loading')) {
                this.hideFormGroupLoader(formGroup);
            }
        });
    }

    /**
     * Configura manejadores para tablas
     */
    setupTableHandlers() {
        // Botones de paginación
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination a, .page-link')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                if (href && !href.startsWith('#')) {
                    this.loadPageWithTable(href);
                }
            }
        });

        // Botones de búsqueda
        document.addEventListener('click', (e) => {
            if (e.target.matches('button[type="submit"], .btn-search')) {
                const form = e.target.closest('form');
                if (form) {
                    const table = form.parentElement.querySelector('.table-responsive, table');
                    if (table) {
                        this.showTableSearchLoader(table);
                    }
                }
            }
        });
    }

    /**
     * Configura manejadores para AJAX
     */
    setupAjaxHandlers() {
        // Interceptar fetch requests para mostrar loaders
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const loaderId = this.generateLoaderId();
            this.showGlobalLoader(loaderId);
            
            try {
                const response = await originalFetch(...args);
                this.hideGlobalLoader(loaderId);
                return response;
            } catch (error) {
                this.hideGlobalLoader(loaderId);
                throw error;
            }
        };
    }

    /**
     * Configura animaciones de página
     */
    setupPageAnimations() {
        // Animar elementos cuando entran en viewport
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const animationType = element.dataset.animate || 'fade-in';
                        
                        // Añadir delay si está especificado
                        const delay = element.dataset.delay || 0;
                        
                        setTimeout(() => {
                            element.classList.add(animationType);
                            element.style.opacity = '1';
                        }, parseInt(delay));
                        
                        observer.unobserve(element);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            // Observar elementos con data-animate
            document.querySelectorAll('[data-animate]').forEach(el => {
                el.style.opacity = '0';
                observer.observe(el);
            });
        }
    }

    /**
     * Muestra loader en formulario
     */
    showFormLoader(form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            window.themeManager?.showButtonLoader(submitBtn);
        }

        // Agregar clase de loading al form
        form.classList.add('loading');
    }

    /**
     * Oculta loader en formulario
     */
    hideFormLoader(form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            window.themeManager?.hideButtonLoader(submitBtn);
        }

        form.classList.remove('loading');
    }

    /**
     * Muestra loader en grupo de formulario
     */
    showFormGroupLoader(formGroup) {
        if (formGroup) {
            formGroup.classList.add('loading');
        }
    }

    /**
     * Oculta loader en grupo de formulario
     */
    hideFormGroupLoader(formGroup) {
        if (formGroup) {
            formGroup.classList.remove('loading');
        }
    }

    /**
     * Muestra loader de búsqueda en tabla
     */
    showTableSearchLoader(table) {
        if (table) {
            window.themeManager?.showTableLoader(table);
        }
    }

    /**
     * Carga página con transición de tabla
     */
    async loadPageWithTable(url) {
        const table = document.querySelector('.table-responsive, table');
        
        if (table) {
            // Mostrar loader
            window.themeManager?.showTableLoader(table);
            
            try {
                // Simular carga (aquí iría la lógica real de AJAX)
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Navegar a la nueva página
                window.location.href = url;
                
            } catch (error) {
                console.error('Error al cargar página:', error);
                window.themeManager?.hideTableLoader(table);
            }
        } else {
            // Fallback: navegación normal
            window.location.href = url;
        }
    }

    /**
     * Genera ID único para loader
     */
    generateLoaderId() {
        return 'loader_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Muestra loader global
     */
    showGlobalLoader(id) {
        this.loadingElements.add(id);
        
        if (!document.querySelector('.global-loader')) {
            const loader = document.createElement('div');
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="global-loader-bar" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--color-primary);
                    transform: scaleX(0);
                    transform-origin: left;
                    animation: loading-bar 2s ease-in-out infinite;
                    z-index: 9998;
                "></div>
            `;
            document.body.appendChild(loader);
        }
    }

    /**
     * Oculta loader global
     */
    hideGlobalLoader(id) {
        this.loadingElements.delete(id);
        
        if (this.loadingElements.size === 0) {
            const loader = document.querySelector('.global-loader');
            if (loader) {
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }
        }
    }

    /**
     * Animar contadores numéricos
     */
    animateCounter(element, targetValue, duration = 1000) {
        const startValue = 0;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Función de easing
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    /**
     * Animar aparición de tarjetas en secuencia
     */
    animateCardsSequence(cards, delay = 100) {
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('slide-in-right');
                card.style.opacity = '1';
            }, index * delay);
        });
    }

    /**
     * Mostrar notificación toast
     */
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = this.getOrCreateToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.innerHTML = `
            <div class="toast-body">
                <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close btn-close-toast" aria-label="Cerrar"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        // Manual close
        toast.querySelector('.btn-close-toast').addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }

    /**
     * Obtiene o crea contenedor de toasts
     */
    getOrCreateToastContainer() {
        let container = document.querySelector('.toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Obtiene icono para tipo de toast
     */
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Pulsar elemento (efecto visual)
     */
    pulseElement(element) {
        element.classList.add('pulse');
        setTimeout(() => {
            element.classList.remove('pulse');
        }, 2000);
    }
}

// CSS adicional para toasts
const toastStyles = `
.toast {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    box-shadow: var(--shadow);
    min-width: 300px;
}

.toast-success { border-left: 4px solid var(--color-success); }
.toast-error { border-left: 4px solid var(--color-danger); }
.toast-warning { border-left: 4px solid var(--color-warning); }
.toast-info { border-left: 4px solid var(--color-info); }

.toast-body {
    padding: 1rem;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.btn-close-toast {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    margin-left: 1rem;
}

.btn-close-toast:hover {
    color: var(--text-primary);
}
`;

// Inyectar estilos
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = toastStyles;
    document.head.appendChild(style);
}

/**
 * Sistema de notificaciones mejorado
 */
class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000, options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: ${this.getTextColor(type)};
            border: 1px solid ${this.getBorderColor(type)};
            border-radius: 0.5rem;
            padding: 1rem 1.5rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(120%);
            transition: all 0.3s ease-in-out;
            pointer-events: auto;
            position: relative;
            backdrop-filter: blur(10px);
            border-left: 4px solid ${this.getAccentColor(type)};
        `;

        // Icono y mensaje
        const icon = this.getIcon(type);
        const title = options.title || this.getTitle(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <span style="font-size: 1.2em; flex-shrink: 0;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">
                        ${title}
                    </div>
                    <div style="font-size: 0.9em; opacity: 0.9;">
                        ${message}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; padding: 0; margin-left: 0.5rem; font-size: 1.2em; line-height: 1;">
                    ×
                </button>
            </div>
        `;

        this.container.appendChild(notification);

        // Enviar evento al historial de notificaciones
        const notificationEvent = new CustomEvent('notificationShown', {
            detail: {
                type: type,
                title: title,
                message: message,
                duration: duration,
                options: options
            }
        });
        document.dispatchEvent(notificationEvent);

        // Animar entrada
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    remove(notification) {
        if (notification && notification.parentElement) {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }

    getBackgroundColor(type) {
        const colors = {
            success: 'rgba(34, 197, 94, 0.1)',
            error: 'rgba(239, 68, 68, 0.1)',
            warning: 'rgba(245, 158, 11, 0.1)',
            info: 'rgba(59, 130, 246, 0.1)'
        };
        return colors[type] || colors.info;
    }

    getTextColor(type) {
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#d97706',
            info: '#2563eb'
        };
        return colors[type] || colors.info;
    }

    getBorderColor(type) {
        const colors = {
            success: 'rgba(34, 197, 94, 0.2)',
            error: 'rgba(239, 68, 68, 0.2)',
            warning: 'rgba(245, 158, 11, 0.2)',
            info: 'rgba(59, 130, 246, 0.2)'
        };
        return colors[type] || colors.info;
    }

    getAccentColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getTitle(type) {
        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };
        return titles[type] || titles.info;
    }

    // Métodos de conveniencia
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.contentManager = new ContentManager();
        window.notificationManager = new NotificationManager();
    });
} else {
    window.contentManager = new ContentManager();
    window.notificationManager = new NotificationManager();
}

// Exponer para uso global
window.ContentManager = ContentManager;
