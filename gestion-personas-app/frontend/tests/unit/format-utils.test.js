/**
 * Tests para FormatUtils
 * Meta de cobertura: 95%
 */

const FormatUtils = require("../../static/js/format-utils.js");

describe("FormatUtils", () => {
  describe("formatDate()", () => {
    test("debe formatear fecha en formato short", () => {
      const date = new Date("2024-01-15");
      const result = FormatUtils.formatDate(date, "short");

      expect(result).toContain("15");
      expect(result).toContain("01");
      expect(result).toContain("2024");
    });

    test("debe formatear fecha en formato long", () => {
      const date = new Date("2024-01-15");
      const result = FormatUtils.formatDate(date, "long");

      expect(result).toContain("15");
      expect(result).toContain("enero");
      expect(result).toContain("2024");
    });

    test("debe formatear solo la hora", () => {
      const date = new Date("2024-01-15T14:30:00");
      const result = FormatUtils.formatDate(date, "time");

      expect(result).toContain("14");
      expect(result).toContain("30");
    });

    test("debe manejar fechas como string", () => {
      const result = FormatUtils.formatDate("2024-01-15", "short");

      expect(result).toBeTruthy();
      expect(result).toContain("15");
    });

    test("debe retornar string vacío para fechas inválidas", () => {
      expect(FormatUtils.formatDate(null)).toBe("");
      expect(FormatUtils.formatDate("")).toBe("");
      expect(FormatUtils.formatDate("invalid")).toBe("");
    });
  });

  describe("toTitleCase()", () => {
    test("debe convertir texto a Title Case", () => {
      expect(FormatUtils.toTitleCase("hello world")).toBe("Hello World");
      expect(FormatUtils.toTitleCase("HELLO WORLD")).toBe("Hello World");
      expect(FormatUtils.toTitleCase("hello WORLD")).toBe("Hello World");
    });

    test("debe manejar texto vacío", () => {
      expect(FormatUtils.toTitleCase("")).toBe("");
      expect(FormatUtils.toTitleCase(null)).toBe("");
      expect(FormatUtils.toTitleCase(undefined)).toBe("");
    });

    test("debe manejar texto con múltiples espacios", () => {
      expect(FormatUtils.toTitleCase("hello  world")).toBe("Hello  World");
    });
  });

  describe("capitalize()", () => {
    test("debe capitalizar la primera letra", () => {
      expect(FormatUtils.capitalize("hello")).toBe("Hello");
      expect(FormatUtils.capitalize("HELLO")).toBe("Hello");
      expect(FormatUtils.capitalize("hello world")).toBe("Hello world");
    });

    test("debe manejar texto vacío", () => {
      expect(FormatUtils.capitalize("")).toBe("");
      expect(FormatUtils.capitalize(null)).toBe("");
    });
  });

  describe("formatNumber()", () => {
    test("debe formatear números con separadores de miles", () => {
      expect(FormatUtils.formatNumber(1000)).toContain("000");
      expect(FormatUtils.formatNumber(1000000)).toBeTruthy();
      expect(FormatUtils.formatNumber(1234.56)).toBeTruthy();
    });

    test("debe manejar números como string", () => {
      expect(FormatUtils.formatNumber("1000")).toBeTruthy();
    });

    test("debe manejar valores inválidos", () => {
      expect(FormatUtils.formatNumber(null)).toBe("");
      expect(FormatUtils.formatNumber(undefined)).toBe("");
      expect(FormatUtils.formatNumber("abc")).toBe("");
    });

    test("debe manejar cero", () => {
      expect(FormatUtils.formatNumber(0)).toBe("0");
    });
  });

  describe("formatCurrency()", () => {
    test("debe formatear moneda en USD por defecto", () => {
      const result = FormatUtils.formatCurrency(100);

      expect(result).toBeTruthy();
      expect(result).toContain("100");
    });

    test("debe formatear moneda en EUR", () => {
      const result = FormatUtils.formatCurrency(100, "EUR");

      expect(result).toBeTruthy();
    });

    test("debe manejar números como string", () => {
      const result = FormatUtils.formatCurrency("100.50");

      expect(result).toBeTruthy();
    });

    test("debe manejar valores inválidos", () => {
      expect(FormatUtils.formatCurrency(null)).toBe("");
      expect(FormatUtils.formatCurrency("abc")).toBe("");
    });
  });

  describe("formatPhone()", () => {
    test("debe formatear teléfono de 10 dígitos", () => {
      const result = FormatUtils.formatPhone("1234567890");

      expect(result).toContain("123");
      expect(result).toContain("456");
      expect(result).toContain("7890");
    });

    test("debe formatear teléfono de 11 dígitos", () => {
      const result = FormatUtils.formatPhone("12345678901");

      expect(result).toBeTruthy();
      expect(result).toContain("234");
    });

    test("debe limpiar caracteres no numéricos", () => {
      const result = FormatUtils.formatPhone("(123) 456-7890");

      expect(result).toBeTruthy();
    });

    test("debe retornar original si no coincide formato", () => {
      expect(FormatUtils.formatPhone("123")).toBe("123");
    });

    test("debe manejar valores vacíos", () => {
      expect(FormatUtils.formatPhone("")).toBe("");
      expect(FormatUtils.formatPhone(null)).toBe("");
    });
  });

  describe("truncate()", () => {
    test("debe truncar texto largo", () => {
      const text = "Este es un texto muy largo";
      const result = FormatUtils.truncate(text, 10);

      expect(result.length).toBe(10);
      expect(result).toContain("...");
    });

    test("debe retornar texto completo si es más corto que maxLength", () => {
      const text = "Corto";
      const result = FormatUtils.truncate(text, 10);

      expect(result).toBe("Corto");
    });

    test("debe usar sufijo personalizado", () => {
      const text = "Texto largo";
      const result = FormatUtils.truncate(text, 8, ">>");

      expect(result).toContain(">>");
    });

    test("debe manejar texto vacío", () => {
      expect(FormatUtils.truncate("", 10)).toBe("");
      expect(FormatUtils.truncate(null, 10)).toBe("");
    });
  });

  describe("formatBytes()", () => {
    test("debe formatear bytes correctamente", () => {
      expect(FormatUtils.formatBytes(0)).toBe("0 Bytes");
      expect(FormatUtils.formatBytes(1024)).toContain("KB");
      expect(FormatUtils.formatBytes(1024 * 1024)).toContain("MB");
      expect(FormatUtils.formatBytes(1024 * 1024 * 1024)).toContain("GB");
    });

    test("debe respetar decimales especificados", () => {
      const result = FormatUtils.formatBytes(1500, 0);

      expect(result).not.toContain(".");
    });

    test("debe manejar valores inválidos", () => {
      expect(FormatUtils.formatBytes(null)).toBe("");
    });
  });

  describe("formatPercentage()", () => {
    test("debe formatear porcentaje con un decimal", () => {
      expect(FormatUtils.formatPercentage(85.5)).toBe("85.5%");
      expect(FormatUtils.formatPercentage(100)).toBe("100.0%");
    });

    test("debe respetar decimales especificados", () => {
      expect(FormatUtils.formatPercentage(85.567, 2)).toBe("85.57%");
      expect(FormatUtils.formatPercentage(85.567, 0)).toBe("86%");
    });

    test("debe manejar números como string", () => {
      expect(FormatUtils.formatPercentage("85.5")).toBe("85.5%");
    });

    test("debe manejar valores inválidos", () => {
      expect(FormatUtils.formatPercentage(null)).toBe("");
      expect(FormatUtils.formatPercentage("abc")).toBe("");
    });
  });

  describe("formatRelativeTime()", () => {
    beforeEach(() => {
      // Mock de Date.now() para tests consistentes
      jest
        .spyOn(Date, "now")
        .mockImplementation(() => new Date("2024-01-15T12:00:00").getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('debe mostrar "hace un momento" para tiempos recientes', () => {
      const date = new Date("2024-01-15T11:59:30");

      expect(FormatUtils.formatRelativeTime(date)).toBe("hace un momento");
    });

    test("debe mostrar minutos para tiempos cercanos", () => {
      const date = new Date("2024-01-15T11:55:00");
      const result = FormatUtils.formatRelativeTime(date);

      expect(result).toContain("minuto");
    });

    test("debe mostrar horas", () => {
      const date = new Date("2024-01-15T10:00:00");
      const result = FormatUtils.formatRelativeTime(date);

      expect(result).toContain("hora");
    });

    test("debe mostrar días", () => {
      const date = new Date("2024-01-14T12:00:00");
      const result = FormatUtils.formatRelativeTime(date);

      expect(result).toContain("día");
    });

    test("debe mostrar fecha para tiempos antiguos", () => {
      const date = new Date("2024-01-01T12:00:00");
      const result = FormatUtils.formatRelativeTime(date);

      expect(result).toContain("01");
    });

    test("debe manejar fechas inválidas", () => {
      expect(FormatUtils.formatRelativeTime(null)).toBe("");
      expect(FormatUtils.formatRelativeTime("invalid")).toBe("");
    });
  });

  describe("sanitizeHTML()", () => {
    test("debe escapar caracteres HTML", () => {
      const html = '<script>alert("xss")</script>';
      const result = FormatUtils.sanitizeHTML(html);

      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });

    test("debe manejar texto sin HTML", () => {
      const text = "Plain text";
      const result = FormatUtils.sanitizeHTML(text);

      expect(result).toBe("Plain text");
    });

    test("debe manejar texto vacío", () => {
      expect(FormatUtils.sanitizeHTML("")).toBe("");
      expect(FormatUtils.sanitizeHTML(null)).toBe("");
    });
  });

  describe("slugify()", () => {
    test("debe convertir texto a slug", () => {
      expect(FormatUtils.slugify("Hello World")).toBe("hello-world");
      expect(FormatUtils.slugify("Hello  World")).toBe("hello-world");
      expect(FormatUtils.slugify("Hello_World")).toBe("hello-world");
    });

    test("debe remover acentos", () => {
      expect(FormatUtils.slugify("José María")).toBe("jose-maria");
      expect(FormatUtils.slugify("niño")).toBe("nino");
    });

    test("debe remover caracteres especiales", () => {
      expect(FormatUtils.slugify("Hello! World?")).toBe("hello-world");
      expect(FormatUtils.slugify("test@example.com")).toBe("testexamplecom");
    });

    test("debe remover guiones al inicio y final", () => {
      expect(FormatUtils.slugify("--Hello World--")).toBe("hello-world");
    });

    test("debe manejar texto vacío", () => {
      expect(FormatUtils.slugify("")).toBe("");
      expect(FormatUtils.slugify(null)).toBe("");
    });
  });
});
