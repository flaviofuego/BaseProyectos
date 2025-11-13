// Integración del NLP Service contra Docker
const axios = require("axios");

// NLP service corriendo en Docker vía Gateway
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8001";
const NLP_URL = `${GATEWAY_URL}/api/nlp`;

describe("NLP Service - integración contra Docker", () => {
  const token = "temp-admin-token"; // Token de desarrollo

  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it("responde OK con pregunta válida", async () => {
    const res = await axios.post(
      `${NLP_URL}/query`,
      { pregunta: "¿Cuántas personas hay registradas?" },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    // Puede retornar 200 OK o 429 si rate limit activo
    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data).toHaveProperty("respuesta");
    }
  });

  it("retorna 400 si la pregunta está vacía", async () => {
    const res = await axios.post(
      `${NLP_URL}/query`,
      { pregunta: "" },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    // Debe retornar 400 (bad request) o 429 (rate limit)
    expect([400, 429]).toContain(res.status);
  });

  it("retorna 400 si falta la pregunta", async () => {
    const res = await axios.post(
      `${NLP_URL}/query`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect([400, 429]).toContain(res.status);
  });
});
