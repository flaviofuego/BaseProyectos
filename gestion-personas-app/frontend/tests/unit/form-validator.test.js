/**
 * Tests para FormValidator
 * Meta de cobertura: 90%
 */

const FormValidator = require("../../static/js/form-validator.js");

describe("FormValidator", () => {
  describe("isNumericOnly()", () => {
    test("debe retornar true para números válidos", () => {
      expect(FormValidator.isNumericOnly("12345")).toBe(true);
      expect(FormValidator.isNumericOnly("0")).toBe(true);
      expect(FormValidator.isNumericOnly("999999")).toBe(true);
    });

    test("debe retornar false para texto no numérico", () => {
      expect(FormValidator.isNumericOnly("abc")).toBe(false);
      expect(FormValidator.isNumericOnly("12a34")).toBe(false);
      expect(FormValidator.isNumericOnly("12.34")).toBe(false);
    });

    test("debe retornar false para valores vacíos o null", () => {
      expect(FormValidator.isNumericOnly("")).toBe(false);
      expect(FormValidator.isNumericOnly(null)).toBe(false);
      expect(FormValidator.isNumericOnly(undefined)).toBe(false);
      expect(FormValidator.isNumericOnly("   ")).toBe(false);
    });

    test("debe manejar espacios correctamente", () => {
      expect(FormValidator.isNumericOnly("  12345  ")).toBe(true);
    });
  });

  describe("validateNumeroDocumento()", () => {
    test("debe validar números de documento de 8-15 dígitos", () => {
      expect(FormValidator.validateNumeroDocumento("12345678")).toBe(true);
      expect(FormValidator.validateNumeroDocumento("123456789012345")).toBe(
        true
      );
    });

    test("debe rechazar números con longitud incorrecta", () => {
      expect(FormValidator.validateNumeroDocumento("1234567")).toBe(false);
      expect(FormValidator.validateNumeroDocumento("1234567890123456")).toBe(
        false
      );
    });

    test("debe rechazar números con caracteres no numéricos", () => {
      expect(FormValidator.validateNumeroDocumento("1234567a")).toBe(false);
      expect(FormValidator.validateNumeroDocumento("12-34-5678")).toBe(false);
    });

    test("debe manejar espacios en blanco", () => {
      expect(FormValidator.validateNumeroDocumento("  12345678  ")).toBe(true);
    });
  });

  describe("validateEmail()", () => {
    test("debe validar emails correctos", () => {
      expect(FormValidator.validateEmail("test@example.com")).toBe(true);
      expect(FormValidator.validateEmail("user.name@example.co.uk")).toBe(true);
      expect(FormValidator.validateEmail("user+tag@example.com")).toBe(true);
    });

    test("debe rechazar emails inválidos", () => {
      expect(FormValidator.validateEmail("invalid")).toBe(false);
      expect(FormValidator.validateEmail("@example.com")).toBe(false);
      expect(FormValidator.validateEmail("user@")).toBe(false);
      expect(FormValidator.validateEmail("user @example.com")).toBe(false);
    });

    test("debe manejar valores vacíos", () => {
      expect(FormValidator.validateEmail("")).toBe(false);
      expect(FormValidator.validateEmail(null)).toBe(false);
      expect(FormValidator.validateEmail(undefined)).toBe(false);
    });
  });

  describe("validatePassword()", () => {
    test("debe validar contraseñas seguras", () => {
      expect(FormValidator.validatePassword("Test1234")).toBe(true);
      expect(FormValidator.validatePassword("MyPass123")).toBe(true);
      expect(FormValidator.validatePassword("Secure999")).toBe(true);
    });

    test("debe rechazar contraseñas sin mayúscula", () => {
      expect(FormValidator.validatePassword("test1234")).toBe(false);
    });

    test("debe rechazar contraseñas sin minúscula", () => {
      expect(FormValidator.validatePassword("TEST1234")).toBe(false);
    });

    test("debe rechazar contraseñas sin número", () => {
      expect(FormValidator.validatePassword("TestPass")).toBe(false);
    });

    test("debe rechazar contraseñas muy cortas", () => {
      expect(FormValidator.validatePassword("Test12")).toBe(false);
      expect(FormValidator.validatePassword("")).toBe(false);
    });

    test("debe manejar null y undefined", () => {
      expect(FormValidator.validatePassword(null)).toBe(false);
      expect(FormValidator.validatePassword(undefined)).toBe(false);
    });
  });

  describe("passwordsMatch()", () => {
    test("debe retornar true cuando las contraseñas coinciden", () => {
      expect(FormValidator.passwordsMatch("Test1234", "Test1234")).toBe(true);
      expect(FormValidator.passwordsMatch("abc", "abc")).toBe(true);
    });

    test("debe retornar false cuando las contraseñas no coinciden", () => {
      expect(FormValidator.passwordsMatch("Test1234", "Test5678")).toBe(false);
      expect(FormValidator.passwordsMatch("abc", "ABC")).toBe(false);
    });

    test("debe manejar valores vacíos", () => {
      expect(FormValidator.passwordsMatch("", "")).toBe(false);
      expect(FormValidator.passwordsMatch(null, null)).toBe(false);
      expect(FormValidator.passwordsMatch("Test1234", "")).toBe(false);
    });
  });

  describe("validateUsername()", () => {
    test("debe validar usernames correctos", () => {
      expect(FormValidator.validateUsername("user123")).toBe(true);
      expect(FormValidator.validateUsername("test_user")).toBe(true);
      expect(FormValidator.validateUsername("User_123")).toBe(true);
    });

    test("debe rechazar usernames muy cortos", () => {
      expect(FormValidator.validateUsername("ab")).toBe(false);
    });

    test("debe rechazar usernames muy largos", () => {
      expect(FormValidator.validateUsername("a".repeat(31))).toBe(false);
    });

    test("debe rechazar usernames con caracteres especiales", () => {
      expect(FormValidator.validateUsername("user-name")).toBe(false);
      expect(FormValidator.validateUsername("user@name")).toBe(false);
      expect(FormValidator.validateUsername("user name")).toBe(false);
    });

    test("debe manejar espacios en blanco", () => {
      expect(FormValidator.validateUsername("  user123  ")).toBe(true);
    });
  });

  describe("validateName()", () => {
    test("debe validar nombres correctos", () => {
      expect(FormValidator.validateName("Juan")).toBe(true);
      expect(FormValidator.validateName("María José")).toBe(true);
      expect(FormValidator.validateName("José Luis")).toBe(true);
    });

    test("debe aceptar caracteres con tilde y ñ", () => {
      expect(FormValidator.validateName("José")).toBe(true);
      expect(FormValidator.validateName("María")).toBe(true);
      expect(FormValidator.validateName("Peña")).toBe(true);
    });

    test("debe rechazar nombres con números", () => {
      expect(FormValidator.validateName("Juan123")).toBe(false);
    });

    test("debe rechazar nombres muy cortos", () => {
      expect(FormValidator.validateName("J")).toBe(false);
    });

    test("debe rechazar nombres muy largos", () => {
      expect(FormValidator.validateName("a".repeat(51))).toBe(false);
    });
  });

  describe("validatePhone()", () => {
    test("debe validar teléfonos correctos", () => {
      expect(FormValidator.validatePhone("12345678")).toBe(true);
      expect(FormValidator.validatePhone("+1234567890")).toBe(true);
      expect(FormValidator.validatePhone("123 456 7890")).toBe(true);
    });

    test("debe rechazar teléfonos muy cortos", () => {
      expect(FormValidator.validatePhone("1234567")).toBe(false);
    });

    test("debe rechazar teléfonos muy largos", () => {
      expect(FormValidator.validatePhone("1234567890123456")).toBe(false);
    });

    test("debe manejar valores vacíos", () => {
      expect(FormValidator.validatePhone("")).toBe(false);
      expect(FormValidator.validatePhone(null)).toBe(false);
    });
  });

  describe("getErrorMessage()", () => {
    test("debe retornar mensajes de error apropiados", () => {
      expect(FormValidator.getErrorMessage("Email", "email")).toContain(
        "email válido"
      );
      expect(FormValidator.getErrorMessage("Password", "password")).toContain(
        "contraseña"
      );
      expect(FormValidator.getErrorMessage("Campo", "required")).toContain(
        "requerido"
      );
    });

    test("debe retornar mensaje genérico para tipo desconocido", () => {
      expect(FormValidator.getErrorMessage("Campo", "unknown")).toBe(
        "Campo inválido"
      );
    });
  });

  describe("validateForm()", () => {
    let form;

    beforeEach(() => {
      document.body.innerHTML = `
        <form id="testForm">
          <input name="email" value="">
          <input name="password" value="">
          <input name="username" value="">
        </form>
      `;
      form = document.getElementById("testForm");
    });

    test("debe validar formulario completo con reglas", () => {
      form.elements.email.value = "test@example.com";
      form.elements.password.value = "Test1234";
      form.elements.username.value = "testuser";

      const rules = {
        email: ["required", "email"],
        password: ["required", "password"],
        username: ["required", "username"],
      };

      const result = FormValidator.validateForm(form, rules);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    test("debe detectar errores en formulario", () => {
      form.elements.email.value = "invalid-email";
      form.elements.password.value = "weak";

      const rules = {
        email: ["required", "email"],
        password: ["required", "password"],
      };

      const result = FormValidator.validateForm(form, rules);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });

    test("debe validar campos requeridos vacíos", () => {
      form.elements.email.value = "";

      const rules = {
        email: ["required"],
      };

      const result = FormValidator.validateForm(form, rules);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });
  });

  describe("displayErrors()", () => {
    let form;

    beforeEach(() => {
      document.body.innerHTML = `
        <form id="testForm">
          <div>
            <input name="email" value="">
          </div>
          <div>
            <input name="password" value="">
          </div>
        </form>
      `;
      form = document.getElementById("testForm");
    });

    test("debe mostrar mensajes de error en el formulario", () => {
      const errors = {
        email: "Email inválido",
        password: "Contraseña débil",
      };

      FormValidator.displayErrors(form, errors);

      const emailError = form
        .querySelector('[name="email"]')
        .parentElement.querySelector(".error-message");
      const passwordError = form
        .querySelector('[name="password"]')
        .parentElement.querySelector(".error-message");

      expect(emailError).not.toBeNull();
      expect(emailError.textContent).toBe("Email inválido");
      expect(passwordError).not.toBeNull();
      expect(passwordError.textContent).toBe("Contraseña débil");
    });

    test("debe agregar clase is-invalid a campos con error", () => {
      const errors = {
        email: "Email inválido",
      };

      FormValidator.displayErrors(form, errors);

      const emailField = form.querySelector('[name="email"]');
      expect(emailField.classList.contains("is-invalid")).toBe(true);
    });

    test("debe limpiar errores previos antes de mostrar nuevos", () => {
      // Agregar errores iniciales
      const initialErrors = { email: "Error inicial" };
      FormValidator.displayErrors(form, initialErrors);

      // Agregar nuevos errores
      const newErrors = { password: "Error nuevo" };
      FormValidator.displayErrors(form, newErrors);

      // El error inicial no debería existir
      const emailError = form
        .querySelector('[name="email"]')
        .parentElement.querySelector(".error-message");
      expect(emailError).toBeNull();

      // El nuevo error debería existir
      const passwordError = form
        .querySelector('[name="password"]')
        .parentElement.querySelector(".error-message");
      expect(passwordError).not.toBeNull();
    });
  });
});
