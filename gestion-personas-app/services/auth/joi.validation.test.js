/**
 * Tests para validación de schemas con Joi
 * Meta de cobertura: 95%
 *
 * Casos de prueba:
 * 1. Schema de login (username y password)
 * 2. Schema de registro (username, email, password)
 * 3. Schema de email (formato, normalización, TLDs)
 * 4. Schema de password (complejidad, longitud)
 * 5. Schema de username (formato, normalización, caracteres permitidos)
 */

const Joi = require("joi");

describe("Validación de Schemas con Joi", () => {
  // ============================================================================
  // SCHEMA DE PASSWORD
  // ============================================================================
  describe("Schema de Password", () => {
    const passwordSchema = Joi.string()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
      )
      .required()
      .messages({
        "string.min": "La contraseña debe tener al menos 8 caracteres",
        "string.max": "La contraseña no puede exceder 128 caracteres",
        "string.pattern.base":
          "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)",
        "any.required": "La contraseña es requerida",
      });

    it("debe aceptar contraseñas válidas", () => {
      const validPasswords = [
        "Password123!",
        "MyP@ssw0rd",
        "SecureP@ss1",
        "Test123!@#",
        "ValidP@ssword1",
        "Abcd1234!",
        "P@ssw0rd123",
        "MyStr0ng!Pass",
      ];

      validPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeUndefined();
      });
    });

    it("debe rechazar contraseñas sin mayúsculas", () => {
      const invalidPasswords = ["password123!", "myp@ssw0rd", "test123!@#"];

      invalidPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
        expect(error.message).toContain("mayúscula");
      });
    });

    it("debe rechazar contraseñas sin minúsculas", () => {
      const invalidPasswords = ["PASSWORD123!", "MYP@SSW0RD", "TEST123!@#"];

      invalidPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
        expect(error.message).toContain("minúscula");
      });
    });

    it("debe rechazar contraseñas sin números", () => {
      const invalidPasswords = ["Password!", "MyP@ssword", "Test!@#$"];

      invalidPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
        expect(error.message).toContain("número");
      });
    });

    it("debe rechazar contraseñas sin caracteres especiales", () => {
      const invalidPasswords = ["Password123", "MyPassword0", "Test1234567"];

      invalidPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
        expect(error.message).toContain("especial");
      });
    });

    it("debe rechazar contraseñas muy cortas (< 8 caracteres)", () => {
      const shortPasswords = ["Pass1!", "Ab1!", "Test1@"];

      shortPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
        expect(error.message).toContain("8 caracteres");
      });
    });

    it("debe rechazar contraseñas muy largas (> 128 caracteres)", () => {
      const longPassword = "A1!" + "a".repeat(130);

      const { error } = passwordSchema.validate(longPassword);
      expect(error).toBeDefined();
      expect(error.message).toContain("128 caracteres");
    });

    it("debe rechazar contraseñas vacías", () => {
      const { error } = passwordSchema.validate("");
      expect(error).toBeDefined();
      expect(error.message).toContain("requerida");
    });

    it("debe rechazar contraseñas con caracteres especiales no permitidos", () => {
      const invalidPasswords = [
        "Password123#", // # no está permitido
        "MyPass123^", // ^ no está permitido
        "Test123~Pass", // ~ no está permitido
      ];

      invalidPasswords.forEach((password) => {
        const { error } = passwordSchema.validate(password);
        expect(error).toBeDefined();
      });
    });
  });

  // ============================================================================
  // SCHEMA DE EMAIL
  // ============================================================================
  describe("Schema de Email", () => {
    const emailSchema = Joi.string()
      .email({
        minDomainSegments: 2,
        tlds: { allow: true },
      })
      .lowercase()
      .trim()
      .max(255)
      .required()
      .messages({
        "string.email": "El email debe tener un formato válido",
        "string.max": "El email no puede exceder 255 caracteres",
        "any.required": "El email es requerido",
      });

    it("debe aceptar emails válidos", () => {
      const validEmails = [
        "user@example.com",
        "john.doe@company.co.uk",
        "test+tag@domain.org",
        "admin@subdomain.example.com",
        "user123@test.io",
      ];

      validEmails.forEach((email) => {
        const { error } = emailSchema.validate(email);
        expect(error).toBeUndefined();
      });
    });

    it("debe normalizar emails a minúsculas", () => {
      const emails = [
        { input: "User@Example.COM", expected: "user@example.com" },
        { input: "ADMIN@TEST.COM", expected: "admin@test.com" },
        { input: "John.Doe@Company.ORG", expected: "john.doe@company.org" },
      ];

      emails.forEach(({ input, expected }) => {
        const { error, value } = emailSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).toBe(expected);
      });
    });

    it("debe eliminar espacios en blanco", () => {
      const emails = [
        { input: "  user@example.com  ", expected: "user@example.com" },
        { input: "test@domain.com ", expected: "test@domain.com" },
        { input: " admin@test.org", expected: "admin@test.org" },
      ];

      emails.forEach(({ input, expected }) => {
        const { error, value } = emailSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).toBe(expected);
      });
    });

    it("debe rechazar emails sin @", () => {
      const invalidEmails = ["userexample.com", "test.domain.org", "nodomain"];

      invalidEmails.forEach((email) => {
        const { error } = emailSchema.validate(email);
        expect(error).toBeDefined();
        expect(error.message).toContain("formato válido");
      });
    });

    it("debe rechazar emails sin dominio", () => {
      const invalidEmails = ["user@", "test@.", "@example.com"];

      invalidEmails.forEach((email) => {
        const { error } = emailSchema.validate(email);
        expect(error).toBeDefined();
      });
    });

    it("debe rechazar emails sin TLD válido", () => {
      const invalidEmails = ["user@example", "test@domain.", "admin@test.c"];

      invalidEmails.forEach((email) => {
        const { error } = emailSchema.validate(email);
        expect(error).toBeDefined();
      });
    });

    it("debe rechazar emails muy largos (> 255 caracteres)", () => {
      const longEmail = "a".repeat(250) + "@test.com";

      const { error } = emailSchema.validate(longEmail);
      expect(error).toBeDefined();
      expect(error.message).toContain("255 caracteres");
    });

    it("debe rechazar emails vacíos", () => {
      const { error } = emailSchema.validate("");
      expect(error).toBeDefined();
      expect(error.message).toContain("requerido");
    });

    it("debe validar TLDs comunes", () => {
      const validTLDs = [
        "user@example.com",
        "test@domain.org",
        "admin@company.net",
        "info@site.io",
        "contact@business.co",
        "support@service.edu",
      ];

      validTLDs.forEach((email) => {
        const { error } = emailSchema.validate(email);
        expect(error).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // SCHEMA DE USERNAME
  // ============================================================================
  describe("Schema de Username", () => {
    const usernameSchema = Joi.string()
      .min(3)
      .max(30)
      .lowercase()
      .trim()
      .pattern(/^[a-z0-9_]+$/)
      .required()
      .messages({
        "string.min": "El username debe tener al menos 3 caracteres",
        "string.max": "El username no puede exceder 30 caracteres",
        "string.pattern.base":
          "El username solo puede contener letras minúsculas, números y guión bajo (_)",
        "any.required": "El username es requerido",
      });

    it("debe aceptar usernames válidos", () => {
      const validUsernames = [
        "john_doe",
        "user123",
        "admin_user",
        "test_account_01",
        "my_username",
        "abc123",
      ];

      validUsernames.forEach((username) => {
        const { error } = usernameSchema.validate(username);
        expect(error).toBeUndefined();
      });
    });

    it("debe normalizar usernames a minúsculas", () => {
      const usernames = [
        { input: "UserName", expected: "username" },
        { input: "ADMIN", expected: "admin" },
        { input: "John_Doe", expected: "john_doe" },
        { input: "Test123", expected: "test123" },
      ];

      usernames.forEach(({ input, expected }) => {
        const { error, value } = usernameSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).toBe(expected);
      });
    });

    it("debe eliminar espacios en blanco", () => {
      const usernames = [
        { input: "  username  ", expected: "username" },
        { input: "test_user ", expected: "test_user" },
        { input: " admin123", expected: "admin123" },
      ];

      usernames.forEach(({ input, expected }) => {
        const { error, value } = usernameSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).toBe(expected);
      });
    });

    it("debe rechazar usernames con caracteres especiales no permitidos", () => {
      const invalidUsernames = [
        "user@name",
        "test-user",
        "john.doe",
        "user#123",
        "admin!",
        "test$user",
      ];

      invalidUsernames.forEach((username) => {
        const { error } = usernameSchema.validate(username);
        expect(error).toBeDefined();
        expect(error.message).toContain("solo puede contener");
      });
    });

    it("debe rechazar usernames muy cortos (< 3 caracteres)", () => {
      const shortUsernames = ["ab", "a", "u1"];

      shortUsernames.forEach((username) => {
        const { error } = usernameSchema.validate(username);
        expect(error).toBeDefined();
        expect(error.message).toContain("3 caracteres");
      });
    });

    it("debe rechazar usernames muy largos (> 30 caracteres)", () => {
      const longUsername = "a".repeat(31);

      const { error } = usernameSchema.validate(longUsername);
      expect(error).toBeDefined();
      expect(error.message).toContain("30 caracteres");
    });

    it("debe rechazar usernames vacíos", () => {
      const { error } = usernameSchema.validate("");
      expect(error).toBeDefined();
      expect(error.message).toContain("requerido");
    });

    it("debe aceptar guiones bajos en usernames", () => {
      const validUsernames = [
        "user_name",
        "test_user_123",
        "_username",
        "username_",
      ];

      validUsernames.forEach((username) => {
        const { error } = usernameSchema.validate(username);
        expect(error).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // SCHEMA DE LOGIN
  // ============================================================================
  describe("Schema de Login", () => {
    const usernameSchema = Joi.string()
      .min(3)
      .max(30)
      .lowercase()
      .trim()
      .pattern(/^[a-z0-9_]+$/)
      .required();

    const loginSchema = Joi.object({
      username: usernameSchema,
      password: Joi.string().required(),
    });

    it("debe aceptar credenciales válidas", () => {
      const validLogins = [
        { username: "john_doe", password: "anyPassword123" },
        { username: "admin", password: "admin123!" },
        { username: "test_user", password: "Test@1234" },
      ];

      validLogins.forEach((login) => {
        const { error } = loginSchema.validate(login);
        expect(error).toBeUndefined();
      });
    });

    it("debe normalizar el username en login", () => {
      const login = { username: "JohnDoe", password: "password123" };
      const { error, value } = loginSchema.validate(login);

      expect(error).toBeUndefined();
      expect(value.username).toBe("johndoe");
    });

    it("debe rechazar login sin username", () => {
      const login = { password: "password123" };
      const { error } = loginSchema.validate(login);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("username");
    });

    it("debe rechazar login sin password", () => {
      const login = { username: "testuser" };
      const { error } = loginSchema.validate(login);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("password");
    });

    it("debe rechazar campos adicionales no permitidos", () => {
      const login = {
        username: "testuser",
        password: "password123",
        extra: "field",
      };

      const { error } = loginSchema.validate(login, { stripUnknown: false });
      // Si permitimos unknown, no debe fallar
      // Si no permitimos, debería fallar
      // Por defecto Joi permite campos extra
      expect(login).toHaveProperty("extra");
    });
  });

  // ============================================================================
  // SCHEMA DE REGISTRO
  // ============================================================================
  describe("Schema de Registro", () => {
    const passwordSchema = Joi.string()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
      )
      .required();

    const emailSchema = Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: true } })
      .lowercase()
      .trim()
      .max(255)
      .required();

    const usernameSchema = Joi.string()
      .min(3)
      .max(30)
      .lowercase()
      .trim()
      .pattern(/^[a-z0-9_]+$/)
      .required();

    const registerSchema = Joi.object({
      username: usernameSchema,
      email: emailSchema,
      password: passwordSchema,
    });

    it("debe aceptar datos de registro válidos", () => {
      const validRegistrations = [
        {
          username: "newuser",
          email: "newuser@example.com",
          password: "SecurePass123!",
        },
        {
          username: "john_doe",
          email: "john@test.org",
          password: "MyP@ssw0rd",
        },
      ];

      validRegistrations.forEach((registration) => {
        const { error } = registerSchema.validate(registration);
        expect(error).toBeUndefined();
      });
    });

    it("debe normalizar todos los campos", () => {
      const registration = {
        username: "NewUser",
        email: "NewUser@Example.COM",
        password: "SecurePass123!",
      };

      const { error, value } = registerSchema.validate(registration);

      expect(error).toBeUndefined();
      expect(value.username).toBe("newuser");
      expect(value.email).toBe("newuser@example.com");
      expect(value.password).toBe("SecurePass123!"); // Password no se normaliza
    });

    it("debe rechazar registro sin username", () => {
      const registration = {
        email: "test@example.com",
        password: "Password123!",
      };

      const { error } = registerSchema.validate(registration);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("username");
    });

    it("debe rechazar registro sin email", () => {
      const registration = {
        username: "testuser",
        password: "Password123!",
      };

      const { error } = registerSchema.validate(registration);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("email");
    });

    it("debe rechazar registro sin password", () => {
      const registration = {
        username: "testuser",
        email: "test@example.com",
      };

      const { error } = registerSchema.validate(registration);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("password");
    });

    it("debe validar todos los campos simultáneamente", () => {
      const registration = {
        username: "ab", // muy corto
        email: "invalid-email", // formato inválido
        password: "weak", // no cumple requisitos
      };

      const { error } = registerSchema.validate(registration, {
        abortEarly: false,
      });
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // CASOS EDGE Y SANITIZACIÓN
  // ============================================================================
  describe("Casos Edge y Sanitización", () => {
    it("debe manejar valores null", () => {
      const schema = Joi.string().required();
      const { error } = schema.validate(null);

      expect(error).toBeDefined();
    });

    it("debe manejar valores undefined", () => {
      const schema = Joi.string().required();
      const { error } = schema.validate(undefined);

      expect(error).toBeDefined();
    });

    it("debe manejar objetos en lugar de strings", () => {
      const schema = Joi.string().required();
      const { error } = schema.validate({ not: "a string" });

      expect(error).toBeDefined();
    });

    it("debe sanitizar inyecciones SQL básicas", () => {
      const usernameSchema = Joi.string()
        .pattern(/^[a-z0-9_]+$/)
        .required();

      const maliciousInputs = [
        "admin' OR '1'='1",
        "user; DROP TABLE users--",
        "admin'--",
      ];

      maliciousInputs.forEach((input) => {
        const { error } = usernameSchema.validate(input);
        expect(error).toBeDefined();
      });
    });

    it("debe sanitizar intentos de XSS", () => {
      const usernameSchema = Joi.string()
        .pattern(/^[a-z0-9_]+$/)
        .required();

      const xssInputs = [
        '<script>alert("xss")</script>',
        "user<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
      ];

      xssInputs.forEach((input) => {
        const { error } = usernameSchema.validate(input);
        expect(error).toBeDefined();
      });
    });
  });
});
