/**
 * Theme Manager - Gestor de temas claro/oscuro
 * Cumple con estándares de accesibilidad WCAG 2.1
 * Incluye animaciones de transición y gestión de loaders
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getPreferredTheme();
        this.transitionDuration = 300; // ms
        this.init();
    }

    /**
     * Inicializa el gestor de temas
     */
    init() {
        // Aplicar tema inicial
        this.setTheme(this.currentTheme);
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Observar cambios en preferencias del sistema
        this.watchSystemPreferences();
        
        // Configurar accesibilidad
        this.setupAccessibility();
        
        // Configurar loaders y transiciones
        this.setupLoadersAndTransitions();
    }

    /**
     * Configura loaders y transiciones de página
     */
    setupLoadersAndTransitions() {
        // Crear loader principal si no existe
        this.createMainLoader();
        
        // Configurar transiciones de navegación
        this.setupNavigationTransitions();
        
        // Configurar lazy loading para contenido
        this.setupLazyLoading();
    }

    /**
     * Crea el loader principal de la aplicación
     */
    createMainLoader() {
        if (!document.querySelector('.main-loader')) {
            const loader = document.createElement('div');
            loader.className = 'main-loader';
            loader.innerHTML = `
                <div class="d-flex flex-column align-items-center">
                    <div class="spinner-main"></div>
                    <p class="mt-3 text-primary">Cargando...</p>
                </div>
            `;
            document.body.appendChild(loader);
            
            // Ocultar loader cuando la página esté lista
            if (document.readyState === 'complete') {
                setTimeout(() => this.hideMainLoader(), 100);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(() => this.hideMainLoader(), 500);
                });
            }
        }
    }

    /**
     * Oculta el loader principal
     */
    hideMainLoader() {
        const loader = document.querySelector('.main-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }

    /**
     * Configura transiciones suaves de navegación
     */
    setupNavigationTransitions() {
        // Interceptar clics en enlaces de navegación
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.shouldTransition(link)) {
                e.preventDefault();
                this.transitionToPage(link.href);
            }
        });

        // Agregar clase de transición al contenido principal
        const main = document.querySelector('main');
        if (main) {
            main.classList.add('page-transition');
        }
    }

    /**
     * Determina si se debe aplicar transición a un enlace
     */
    shouldTransition(link) {
        // No aplicar transición a enlaces externos, anclas, o descargas
        const href = link.getAttribute('href');
        return href && 
               !href.startsWith('#') && 
               !href.startsWith('http') && 
               !link.hasAttribute('download') &&
               !link.classList.contains('no-transition');
    }

    /**
     * Realiza transición suave a una nueva página
     */
    async transitionToPage(url) {
        const main = document.querySelector('main');
        
        if (main) {
            // Mostrar indicador de carga en navegación
            this.showNavigationLoader();
            
            // Fade out
            main.classList.add('fade-out');
            
            // Esperar a que termine la animación
            await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
            
            // Navegar a la nueva página
            window.location.href = url;
        } else {
            // Fallback: navegación normal
            window.location.href = url;
        }
    }

    /**
     * Muestra indicador de carga en la navegación
     */
    showNavigationLoader() {
        const navbar = document.querySelector('.navbar');
        if (navbar && !navbar.querySelector('.nav-loading')) {
            const loader = document.createElement('div');
            loader.className = 'nav-loading';
            navbar.style.position = 'relative';
            navbar.appendChild(loader);
        }
    }

    /**
     * Configura lazy loading para contenido pesado
     */
    setupLazyLoading() {
        // Observar elementos con data-loading
        const loadingElements = document.querySelectorAll('[data-loading]');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadElement(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            });

            loadingElements.forEach(el => observer.observe(el));
        } else {
            // Fallback para navegadores sin IntersectionObserver
            loadingElements.forEach(el => this.loadElement(el));
        }
    }

    /**
     * Carga un elemento con efecto de loading
     */
    loadElement(element) {
        const loadingType = element.dataset.loading;
        
        switch (loadingType) {
            case 'skeleton':
                this.loadWithSkeleton(element);
                break;
            case 'spinner':
                this.loadWithSpinner(element);
                break;
            case 'fade':
                this.loadWithFade(element);
                break;
            default:
                this.loadWithFade(element);
        }
    }

    /**
     * Carga elemento con skeleton
     */
    loadWithSkeleton(element) {
        // Crear skeleton placeholder
        const skeleton = this.createSkeleton(element);
        element.parentNode.insertBefore(skeleton, element);
        element.style.display = 'none';
        
        // Simular carga (reemplazar con lógica real)
        setTimeout(() => {
            skeleton.remove();
            element.style.display = '';
            element.classList.add('fade-in');
        }, 1000);
    }

    /**
     * Carga elemento con spinner
     */
    loadWithSpinner(element) {
        element.classList.add('loading');
        
        // Simular carga
        setTimeout(() => {
            element.classList.remove('loading');
            element.classList.add('fade-in');
        }, 800);
    }

    /**
     * Carga elemento con fade
     */
    loadWithFade(element) {
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.classList.add('fade-in');
        }, 300);
    }

    /**
     * Crea skeleton placeholder
     */
    createSkeleton(element) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-card';
        skeleton.style.width = element.offsetWidth + 'px';
        skeleton.style.height = element.offsetHeight + 'px';
        return skeleton;
    }

    /**
     * API para mostrar loader de contenido
     */
    showContentLoader(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container && !container.querySelector('.content-loader')) {
            const loader = document.createElement('div');
            loader.className = 'content-loader';
            loader.innerHTML = '<div class="content-spinner"></div>';
            container.appendChild(loader);
        }
    }

    /**
     * API para ocultar loader de contenido
     */
    hideContentLoader(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container) {
            const loader = container.querySelector('.content-loader');
            if (loader) {
                loader.remove();
            }
        }
    }

    /**
     * API para mostrar loader en tabla
     */
    showTableLoader(table) {
        if (typeof table === 'string') {
            table = document.querySelector(table);
        }
        
        if (table && !table.querySelector('.table-loader')) {
            table.style.position = 'relative';
            const loader = document.createElement('div');
            loader.className = 'table-loader';
            loader.innerHTML = '<div class="content-spinner"></div>';
            table.appendChild(loader);
        }
    }

    /**
     * API para ocultar loader en tabla
     */
    hideTableLoader(table) {
        if (typeof table === 'string') {
            table = document.querySelector(table);
        }
        
        if (table) {
            const loader = table.querySelector('.table-loader');
            if (loader) {
                loader.remove();
            }
        }
    }

    /**
     * API para mostrar loader en botón
     */
    showButtonLoader(button) {
        if (typeof button === 'string') {
            button = document.querySelector(button);
        }
        
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
    }

    /**
     * API para ocultar loader en botón
     */
    hideButtonLoader(button) {
        if (typeof button === 'string') {
            button = document.querySelector(button);
        }
        
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Obtiene el tema almacenado en localStorage
     */
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    /**
     * Obtiene el tema preferido del sistema
     */
    getPreferredTheme() {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Establece el tema actual
     * @param {string} theme - 'light', 'dark', o 'auto'
     */
    setTheme(theme) {
        const actualTheme = theme === 'auto' ? this.getPreferredTheme() : theme;
        
        // Aplicar tema al DOM
        document.documentElement.setAttribute('data-theme', actualTheme);
        
        // Actualizar controles UI
        this.updateThemeControls(theme);
        
        // Guardar preferencia
        localStorage.setItem('theme', theme);
        
        // Actualizar variable para uso externo
        this.currentTheme = theme;
        
        // Emitir evento personalizado
        this.dispatchThemeChangeEvent(actualTheme);
        
        // Actualizar meta theme-color para móviles
        this.updateThemeColor(actualTheme);
    }

    /**
     * Actualiza los controles de tema en la UI
     * @param {string} theme - Tema actual
     */
    updateThemeControls(theme) {
        const buttons = document.querySelectorAll('.theme-toggle');
        
        buttons.forEach(button => {
            const buttonTheme = button.dataset.theme;
            const isActive = buttonTheme === theme;
            
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive);
            
            // Actualizar texto del botón para lectores de pantalla
            const label = this.getThemeLabel(buttonTheme);
            const status = isActive ? 'activo' : 'inactivo';
            button.setAttribute('aria-label', `${label} (${status})`);
        });
    }

    /**
     * Obtiene la etiqueta localizada para un tema
     * @param {string} theme - Tema
     */
    getThemeLabel(theme) {
        const labels = {
            'light': 'Tema claro',
            'dark': 'Tema oscuro',
            'auto': 'Automático'
        };
        return labels[theme] || theme;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Listeners para botones de tema
        document.addEventListener('click', (e) => {
            if (e.target.matches('.theme-toggle') || e.target.closest('.theme-toggle')) {
                const button = e.target.matches('.theme-toggle') ? e.target : e.target.closest('.theme-toggle');
                const theme = button.dataset.theme;
                
                if (theme) {
                    this.setTheme(theme);
                }
            }
        });

        // Shortcut de teclado (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
                
                // Anunciar cambio para lectores de pantalla
                this.announceThemeChange();
            }
        });
    }

    /**
     * Alterna entre temas claro y oscuro
     */
    toggleTheme() {
        const currentActualTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentActualTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Observa cambios en las preferencias del sistema
     */
    watchSystemPreferences() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', () => {
            // Solo actualizar si el usuario tiene configurado 'auto'
            if (this.currentTheme === 'auto') {
                this.setTheme('auto');
            }
        });
    }

    /**
     * Configura características de accesibilidad
     */
    setupAccessibility() {
        // Añadir skip link si no existe
        this.addSkipLink();
        
        // Configurar landmarks ARIA
        this.setupARIALandmarks();
        
        // Monitorear focus para navegación por teclado
        this.setupFocusManagement();
    }

    /**
     * Añade skip link para lectores de pantalla
     */
    addSkipLink() {
        if (!document.querySelector('.skip-link')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.className = 'skip-link';
            skipLink.textContent = 'Saltar al contenido principal';
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
    }

    /**
     * Configura landmarks ARIA
     */
    setupARIALandmarks() {
        // Asegurar que el contenido principal tenga el ID correcto
        const main = document.querySelector('main');
        if (main && !main.id) {
            main.id = 'main-content';
        }
        
        // Añadir roles ARIA donde sea necesario
        const nav = document.querySelector('nav');
        if (nav && !nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Navegación principal');
        }
        
        const footer = document.querySelector('footer');
        if (footer && !footer.getAttribute('role')) {
            footer.setAttribute('role', 'contentinfo');
        }
    }

    /**
     * Configura gestión de focus para accesibilidad
     */
    setupFocusManagement() {
        // Destacar focus para navegación por teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Emite evento personalizado cuando cambia el tema
     * @param {string} theme - Tema actual
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme, manager: this }
        });
        document.dispatchEvent(event);
    }

    /**
     * Actualiza el color de tema para móviles
     * @param {string} theme - Tema actual
     */
    updateThemeColor(theme) {
        let themeColor = '#0d6efd'; // Color por defecto
        
        if (theme === 'dark') {
            themeColor = '#0969da';
        }
        
        // Actualizar o crear meta tag
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = themeColor;
    }

    /**
     * Anuncia cambio de tema para lectores de pantalla
     */
    announceThemeChange() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const message = `Tema cambiado a ${this.getThemeLabel(currentTheme)}`;
        
        // Crear elemento para anuncio
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remover después de que se haya anunciado
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * API pública para obtener el tema actual
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme');
    }

    /**
     * API pública para verificar si está en modo oscuro
     */
    isDarkMode() {
        return this.getCurrentTheme() === 'dark';
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

// Exponer para uso global
window.ThemeManager = ThemeManager;
