// Integración del Log Service contra Docker
const axios = require("axios");

// Log service corriendo en Docker vía Gateway
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8001";
const LOG_URL = `${GATEWAY_URL}/api/logs`;

describe("Log Service - integración contra Docker", () => {
  const token = "temp-admin-token"; // Token de desarrollo

  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it("ingesta logs válidos", async () => {
    const logPayload = {
      transaction_type: "TEST_TRANSACTION",
      entity_type: "test",
      status: "SUCCESS",
      user_id: 1,
    };

    const res = await axios.post(`${LOG_URL}/log`, logPayload, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    // Debe retornar 201 (created) o 429 (rate limit)
    expect([201, 429]).toContain(res.status);
    if (res.status === 201) {
      expect(res.data).toHaveProperty("id");
    }
  });

  it("consulta logs por filtro", async () => {
    const res = await axios.get(`${LOG_URL}/search?status=SUCCESS&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    // Debe retornar 200 o 429 (rate limit)
    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data).toHaveProperty("logs");
      expect(Array.isArray(res.data.logs)).toBe(true);
    }
  });

  it("rechaza payload inválido", async () => {
    const invalidPayload = {
      // Falta transaction_type requerido
      entity_type: "test",
      status: "SUCCESS",
    };

    const res = await axios.post(`${LOG_URL}/log`, invalidPayload, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    // Debe retornar 400 (bad request) o 429 (rate limit)
    expect([400, 429]).toContain(res.status);
  });
});
