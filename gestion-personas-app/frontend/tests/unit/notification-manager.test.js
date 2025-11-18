/**
 * Tests para NotificationManager
 * Meta de cobertura: ~90%
 */

const fs = require("fs");
const path = require("path");

// Cargar y evaluar el código de content-manager.js (define NotificationManager)
const cmCode = fs.readFileSync(
  path.join(__dirname, "../../static/js/content-manager.js"),
  "utf8"
);

eval(cmCode);

// Forzar inicialización como si el DOM ya estuviera listo
document.dispatchEvent(new Event("DOMContentLoaded"));

describe("NotificationManager", () => {
  let manager;

  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    // Usar instancia global creada por el script
    manager =
      window.notificationManager ||
      new (window.NotificationManager || function () {})();
  });

  test("debe crear contenedor en el DOM al inicializar", () => {
    const container = document.getElementById("notification-container");
    expect(container).not.toBeNull();
    expect(manager.container).toBe(container);
  });

  test("show() debe renderizar notificación y auto-removerla", async () => {
    jest.useFakeTimers();

    const n = manager.show("Mensaje de prueba", "info", 1000);

    const container = document.getElementById("notification-container");
    expect(container.children.length).toBe(1);

    // Adelantar tiempo para auto-remove
    jest.advanceTimersByTime(1200);

    // Esperar al ciclo de animación de salida
    await Promise.resolve().then();

    expect(container.children.length).toBe(0);

    jest.useRealTimers();
  });

  test("show() debe despachar evento 'notificationShown' con detalle correcto", () => {
    const handler = jest.fn();
    document.addEventListener("notificationShown", handler);

    manager.show("Hola", "success", 0, { title: "Listo" });

    expect(handler).toHaveBeenCalled();
    const evt = handler.mock.calls[0][0];
    expect(evt.detail.type).toBe("success");
    expect(evt.detail.title).toBe("Listo");
    expect(evt.detail.message).toBe("Hola");
  });

  test("remove() debe ocultar y eliminar la notificación", async () => {
    const n = manager.show("Borrar", "warning", 0);

    const container = document.getElementById("notification-container");
    expect(container.children.length).toBe(1);

    manager.remove(n);

    // Esperar a la animación de salida (300ms)
    await new Promise((r) => setTimeout(r, 350));

    expect(container.children.length).toBe(0);
  });

  test("métodos de conveniencia success/error/warning/info", () => {
    manager.success("ok");
    manager.error("error");
    manager.warning("warn");
    manager.info("info");

    const container = document.getElementById("notification-container");
    expect(container.children.length).toBe(4);
  });

  test("debe aplicar estilos por tipo (border-left distinto)", () => {
    manager.show("ok", "success", 0);
    manager.show("err", "error", 0);

    const container = document.getElementById("notification-container");
    const [succ, err] = container.children;
    expect(succ.getAttribute("style")).toEqual(
      expect.stringContaining("border-left")
    );
    expect(err.getAttribute("style")).toEqual(
      expect.stringContaining("border-left")
    );
  });
});
