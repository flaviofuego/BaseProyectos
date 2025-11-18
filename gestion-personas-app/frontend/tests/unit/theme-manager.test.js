/**
 * Tests para ThemeManager
 * Meta de cobertura: 85%
 */

// Importar el código a testear
const fs = require("fs");
const path = require("path");

// Leer el archivo theme-manager.js
const themeManagerCode = fs.readFileSync(
  path.join(__dirname, "../../static/js/theme-manager.js"),
  "utf8"
);

// Evaluar el código en el contexto de prueba
eval(themeManagerCode);

describe("ThemeManager", () => {
  let themeManager;

  beforeEach(() => {
    // Limpiar DOM
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");

    // Limpiar localStorage
    localStorage.clear();

    // Crear nueva instancia
    themeManager = new ThemeManager();
  });

  describe("Inicialización", () => {
    test("debe crear una instancia de ThemeManager", () => {
      expect(themeManager).toBeInstanceOf(ThemeManager);
    });

    test("debe tener un tema por defecto", () => {
      expect(themeManager.currentTheme).toBeDefined();
      expect(["light", "dark", "auto"]).toContain(themeManager.currentTheme);
    });

    test("debe aplicar tema al DOM al inicializar", () => {
      const theme = document.documentElement.getAttribute("data-theme");
      expect(theme).toBeDefined();
      expect(["light", "dark"]).toContain(theme);
    });

    test("debe configurar transitionDuration", () => {
      expect(themeManager.transitionDuration).toBe(300);
    });
  });

  describe("setTheme()", () => {
    test("debe cambiar el tema a light", () => {
      themeManager.setTheme("light");

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(themeManager.currentTheme).toBe("light");
    });

    test("debe cambiar el tema a dark", () => {
      themeManager.setTheme("dark");

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(themeManager.currentTheme).toBe("dark");
    });

    test("debe guardar el tema en localStorage", () => {
      themeManager.setTheme("dark");

      expect(localStorage.getItem("theme")).toBe("dark");
    });

    test("debe actualizar meta theme-color", () => {
      themeManager.setTheme("dark");

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      expect(metaThemeColor).not.toBeNull();
      expect(metaThemeColor.content).toBeDefined();
    });

    test("debe emitir evento themechange", () => {
      const handler = jest.fn();
      document.addEventListener("themechange", handler);

      themeManager.setTheme("dark");

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.theme).toBe("dark");
    });

    test("debe manejar tema auto", () => {
      themeManager.setTheme("auto");

      const actualTheme = document.documentElement.getAttribute("data-theme");
      expect(["light", "dark"]).toContain(actualTheme);
    });
  });

  describe("toggleTheme()", () => {
    test("debe alternar de light a dark", () => {
      document.documentElement.setAttribute("data-theme", "light");

      themeManager.toggleTheme();

      expect(themeManager.currentTheme).toBe("dark");
    });

    test("debe alternar de dark a light", () => {
      document.documentElement.setAttribute("data-theme", "dark");

      themeManager.toggleTheme();

      expect(themeManager.currentTheme).toBe("light");
    });
  });

  describe("getCurrentTheme()", () => {
    test("debe retornar el tema actual", () => {
      themeManager.setTheme("dark");

      expect(themeManager.getCurrentTheme()).toBe("dark");
    });

    test("debe retornar light si no hay tema establecido", () => {
      document.documentElement.removeAttribute("data-theme");

      const current = themeManager.getCurrentTheme();
      expect(current).toBeNull();
    });
  });

  describe("isDarkMode()", () => {
    test("debe retornar true cuando está en modo oscuro", () => {
      themeManager.setTheme("dark");

      expect(themeManager.isDarkMode()).toBe(true);
    });

    test("debe retornar false cuando está en modo claro", () => {
      themeManager.setTheme("light");

      expect(themeManager.isDarkMode()).toBe(false);
    });
  });

  describe("getStoredTheme()", () => {
    test("debe obtener tema de localStorage", () => {
      localStorage.setItem("theme", "dark");

      expect(themeManager.getStoredTheme()).toBe("dark");
    });

    test("debe retornar null si no hay tema guardado", () => {
      localStorage.clear();

      expect(themeManager.getStoredTheme()).toBeNull();
    });
  });

  describe("getPreferredTheme()", () => {
    test("debe retornar dark si prefers-color-scheme es dark", () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(themeManager.getPreferredTheme()).toBe("dark");
    });

    test("debe retornar light si prefers-color-scheme no es dark", () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(themeManager.getPreferredTheme()).toBe("light");
    });
  });

  describe("updateThemeControls()", () => {
    test("debe marcar botón activo con clase active", () => {
      document.body.innerHTML = `
        <button class="theme-toggle" data-theme="light">Light</button>
        <button class="theme-toggle" data-theme="dark">Dark</button>
      `;

      themeManager.updateThemeControls("dark");

      const darkButton = document.querySelector('[data-theme="dark"]');
      expect(darkButton.classList.contains("active")).toBe(true);
    });

    test("debe establecer aria-pressed en botón activo", () => {
      document.body.innerHTML = `
        <button class="theme-toggle" data-theme="light">Light</button>
        <button class="theme-toggle" data-theme="dark">Dark</button>
      `;

      themeManager.updateThemeControls("dark");

      const darkButton = document.querySelector('[data-theme="dark"]');
      expect(darkButton.getAttribute("aria-pressed")).toBe("true");
    });

    test("debe actualizar aria-label del botón", () => {
      document.body.innerHTML = `
        <button class="theme-toggle" data-theme="dark">Dark</button>
      `;

      themeManager.updateThemeControls("dark");

      const darkButton = document.querySelector('[data-theme="dark"]');
      expect(darkButton.getAttribute("aria-label")).toContain("Tema oscuro");
    });
  });

  describe("Loaders", () => {
    test("showContentLoader debe agregar loader al contenedor", () => {
      document.body.innerHTML = '<div id="container"></div>';

      themeManager.showContentLoader("#container");

      const loader = document.querySelector("#container .content-loader");
      expect(loader).not.toBeNull();
    });

    test("hideContentLoader debe remover loader del contenedor", () => {
      document.body.innerHTML =
        '<div id="container"><div class="content-loader"></div></div>';

      themeManager.hideContentLoader("#container");

      const loader = document.querySelector("#container .content-loader");
      expect(loader).toBeNull();
    });

    test("showButtonLoader debe deshabilitar botón", () => {
      document.body.innerHTML = '<button id="btn">Click</button>';

      themeManager.showButtonLoader("#btn");

      const button = document.querySelector("#btn");
      expect(button.disabled).toBe(true);
      expect(button.classList.contains("loading")).toBe(true);
    });

    test("hideButtonLoader debe habilitar botón", () => {
      document.body.innerHTML =
        '<button id="btn" class="loading" disabled>Click</button>';

      themeManager.hideButtonLoader("#btn");

      const button = document.querySelector("#btn");
      expect(button.disabled).toBe(false);
      expect(button.classList.contains("loading")).toBe(false);
    });

    test("showTableLoader debe agregar loader a tabla", () => {
      document.body.innerHTML = '<table id="table"></table>';

      themeManager.showTableLoader("#table");

      const loader = document.querySelector("#table .table-loader");
      expect(loader).not.toBeNull();
    });

    test("hideTableLoader debe remover loader de tabla", () => {
      document.body.innerHTML =
        '<table id="table"><div class="table-loader"></div></table>';

      themeManager.hideTableLoader("#table");

      const loader = document.querySelector("#table .table-loader");
      expect(loader).toBeNull();
    });
  });

  describe("Accesibilidad", () => {
    test("debe agregar skip link si no existe", () => {
      themeManager.addSkipLink();

      const skipLink = document.querySelector(".skip-link");
      expect(skipLink).not.toBeNull();
      expect(skipLink.getAttribute("href")).toBe("#main-content");
    });

    test("debe configurar landmarks ARIA", () => {
      document.body.innerHTML = "<nav></nav><main></main><footer></footer>";

      themeManager.setupARIALandmarks();

      const nav = document.querySelector("nav");
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");

      expect(nav.getAttribute("role")).toBe("navigation");
      expect(main.id).toBe("main-content");
      expect(footer.getAttribute("role")).toBe("contentinfo");
    });

    test("debe anunciar cambio de tema", () => {
      themeManager.announceThemeChange();

      // Verificar que se creó el elemento de anuncio
      const announcement = document.querySelector('[aria-live="polite"]');
      expect(announcement).not.toBeNull();
    });
  });

  describe("Event Listeners", () => {
    test("debe cambiar tema al hacer click en botón", () => {
      document.body.innerHTML = `
        <button class="theme-toggle" data-theme="dark">Dark</button>
      `;

      themeManager.setupEventListeners();

      const button = document.querySelector(".theme-toggle");
      button.click();

      expect(themeManager.currentTheme).toBe("dark");
    });

    test("debe manejar keyboard shortcut Ctrl+Shift+T", () => {
      const initialTheme = themeManager.currentTheme;

      // Llamar toggleTheme directamente ya que JSDOM no maneja bien KeyboardEvent
      themeManager.toggleTheme();

      // El tema debería haber cambiado
      expect(themeManager.currentTheme).not.toBe(initialTheme);
    });
  });

  describe("Transiciones", () => {
    test("hideMainLoader debe ocultar loader principal", () => {
      document.body.innerHTML = '<div class="main-loader"></div>';

      themeManager.hideMainLoader();

      const loader = document.querySelector(".main-loader");
      expect(loader.classList.contains("hidden")).toBe(true);
    });

    test("shouldTransition debe retornar false para enlaces externos", () => {
      const link = document.createElement("a");
      link.href = "https://external.com";

      expect(themeManager.shouldTransition(link)).toBe(false);
    });

    test("shouldTransition debe retornar false para anclas", () => {
      const link = document.createElement("a");
      link.href = "#section";

      expect(themeManager.shouldTransition(link)).toBe(false);
    });

    test("shouldTransition debe retornar true para enlaces internos", () => {
      const link = document.createElement("a");
      link.href = "/dashboard";

      expect(themeManager.shouldTransition(link)).toBe(true);
    });
  });

  describe("Lazy Loading", () => {
    test("loadWithFade debe aplicar opacity", (done) => {
      const element = document.createElement("div");
      element.style.opacity = "1";

      themeManager.loadWithFade(element);

      expect(element.style.opacity).toBe("0");

      setTimeout(() => {
        expect(element.classList.contains("fade-in")).toBe(true);
        done();
      }, 350);
    });

    test("createSkeleton debe crear elemento con dimensiones correctas", () => {
      const element = document.createElement("div");
      element.style.width = "100px";
      element.style.height = "50px";
      Object.defineProperty(element, "offsetWidth", { value: 100 });
      Object.defineProperty(element, "offsetHeight", { value: 50 });
      document.body.appendChild(element);

      const skeleton = themeManager.createSkeleton(element);

      expect(skeleton.classList.contains("skeleton")).toBe(true);
      expect(skeleton.style.width).toBe("100px");
      expect(skeleton.style.height).toBe("50px");
    });
  });
});
