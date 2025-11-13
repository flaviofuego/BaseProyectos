// Unit tests del Log Service - validaciones Joi
const Joi = require("joi");

describe("Log Service - unit (validaciones)", () => {
  const logSchema = Joi.object({
    transaction_type: Joi.string().required(),
    entity_type: Joi.string().required(),
    entity_id: Joi.number().allow(null),
    numero_documento: Joi.string().max(10).allow(null),
    user_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
    ip_address: Joi.string().allow(null),
    user_agent: Joi.string().allow(null),
    request_data: Joi.object().allow(null),
    response_data: Joi.object().allow(null),
    status: Joi.string().valid("SUCCESS", "ERROR", "NOT_FOUND").required(),
    error_message: Joi.string().allow(null),
  });

  it("valida payload correcto de log", () => {
    const payload = {
      transaction_type: "CREAR_PERSONA",
      entity_type: "persona",
      status: "SUCCESS",
    };

    const { error } = logSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it("rechaza payload sin transaction_type", () => {
    const payload = {
      entity_type: "persona",
      status: "SUCCESS",
    };

    const { error } = logSchema.validate(payload);
    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe("transaction_type");
  });

  it("rechaza payload con status inválido", () => {
    const payload = {
      transaction_type: "TEST",
      entity_type: "persona",
      status: "INVALID_STATUS",
    };

    const { error } = logSchema.validate(payload);
    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe("status");
  });
});
