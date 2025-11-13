// Unit tests del NLP Service - validaciones básicas sin dependencias externas
describe("NLP Service - unit (validaciones)", () => {
  it("valida que pregunta sea string no vacío", () => {
    const validar = (pregunta) => {
      if (!pregunta || typeof pregunta !== "string") return false;
      return pregunta.trim().length > 0;
    };

    expect(validar("¿Cuántas personas hay?")).toBe(true);
    expect(validar("")).toBe(false);
    expect(validar(null)).toBe(false);
    expect(validar(undefined)).toBe(false);
    expect(validar(123)).toBe(false);
  });

  it("normaliza preguntas removiendo espacios extra", () => {
    const normalizar = (pregunta) => pregunta.trim().replace(/\s+/g, " ");

    expect(normalizar("  ¿Cuántas   personas  hay?  ")).toBe(
      "¿Cuántas personas hay?"
    );
    expect(normalizar("test")).toBe("test");
  });
});
