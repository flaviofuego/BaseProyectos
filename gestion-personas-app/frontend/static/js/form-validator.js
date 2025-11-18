/**
 * Utilidades de validación de formularios
 * Validación del lado del cliente
 */

class FormValidator {
  /**
   * Valida que un campo solo contenga números
   * @param {string} value - Valor a validar
   * @returns {boolean}
   */
  static isNumericOnly(value) {
    if (!value || value.trim() === "") return false;
    return /^\d+$/.test(value.trim());
  }

  /**
   * Valida número de documento (solo números, 8-15 dígitos)
   * @param {string} numeroDocumento - Número de documento
   * @returns {boolean}
   */
  static validateNumeroDocumento(numeroDocumento) {
    if (!numeroDocumento || numeroDocumento.trim() === "") return false;
    const cleaned = numeroDocumento.trim();
    return /^\d{8,15}$/.test(cleaned);
  }

  /**
   * Valida email según RFC 5322 simplificado
   * @param {string} email - Email a validar
   * @returns {boolean}
   */
  static validateEmail(email) {
    if (!email || email.trim() === "") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valida contraseña segura
   * Requisitos: mínimo 8 caracteres, una mayúscula, una minúscula, un número
   * @param {string} password - Contraseña a validar
   * @returns {boolean}
   */
  static validatePassword(password) {
    if (!password || password.length < 8) return false;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber;
  }

  /**
   * Valida que dos contraseñas coincidan
   * @param {string} password1 - Primera contraseña
   * @param {string} password2 - Segunda contraseña
   * @returns {boolean}
   */
  static passwordsMatch(password1, password2) {
    if (!password1 || !password2) return false;
    return password1 === password2;
  }

  /**
   * Valida username (3-30 caracteres, alfanumérico y guiones bajos)
   * @param {string} username - Username a validar
   * @returns {boolean}
   */
  static validateUsername(username) {
    if (!username || username.trim() === "") return false;
    const cleaned = username.trim();
    return /^[a-zA-Z0-9_]{3,30}$/.test(cleaned);
  }

  /**
   * Valida nombre o apellido (solo letras y espacios)
   * @param {string} name - Nombre a validar
   * @returns {boolean}
   */
  static validateName(name) {
    if (!name || name.trim() === "") return false;
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/.test(name.trim());
  }

  /**
   * Valida teléfono (8-15 dígitos, puede incluir + y espacios)
   * @param {string} phone - Teléfono a validar
   * @returns {boolean}
   */
  static validatePhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s-]/g, "");
    return /^\+?\d{8,15}$/.test(cleaned);
  }

  /**
   * Obtiene mensaje de error para un campo
   * @param {string} fieldName - Nombre del campo
   * @param {string} validationType - Tipo de validación
   * @returns {string}
   */
  static getErrorMessage(fieldName, validationType) {
    const messages = {
      required: `${fieldName} es requerido`,
      numeric: `${fieldName} debe contener solo números`,
      email: "Ingrese un email válido",
      password:
        "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
      passwordMatch: "Las contraseñas no coinciden",
      username: "Username debe tener 3-30 caracteres alfanuméricos",
      name: "Nombre debe contener solo letras",
      phone: "Ingrese un teléfono válido",
      numeroDocumento: "Número de documento debe tener 8-15 dígitos",
    };
    return messages[validationType] || "Campo inválido";
  }

  /**
   * Valida un formulario completo
   * @param {HTMLFormElement} form - Formulario a validar
   * @param {Object} rules - Reglas de validación
   * @returns {Object} - {valid: boolean, errors: Object}
   */
  static validateForm(form, rules) {
    const errors = {};
    let valid = true;

    Object.keys(rules).forEach((fieldName) => {
      const field = form.elements[fieldName];
      if (!field) return;

      const value = field.value;
      const fieldRules = rules[fieldName];

      fieldRules.forEach((rule) => {
        let isValid = true;

        switch (rule) {
          case "required":
            isValid = value && value.trim() !== "";
            break;
          case "email":
            isValid = this.validateEmail(value);
            break;
          case "password":
            isValid = this.validatePassword(value);
            break;
          case "numeric":
            isValid = this.isNumericOnly(value);
            break;
          case "numeroDocumento":
            isValid = this.validateNumeroDocumento(value);
            break;
          case "username":
            isValid = this.validateUsername(value);
            break;
          case "name":
            isValid = this.validateName(value);
            break;
          case "phone":
            isValid = this.validatePhone(value);
            break;
        }

        if (!isValid) {
          errors[fieldName] = this.getErrorMessage(fieldName, rule);
          valid = false;
        }
      });
    });

    return { valid, errors };
  }

  /**
   * Muestra errores en el formulario
   * @param {HTMLFormElement} form - Formulario
   * @param {Object} errors - Errores a mostrar
   */
  static displayErrors(form, errors) {
    // Limpiar errores previos
    form.querySelectorAll(".error-message").forEach((el) => el.remove());
    form
      .querySelectorAll(".is-invalid")
      .forEach((el) => el.classList.remove("is-invalid"));

    // Mostrar nuevos errores
    Object.keys(errors).forEach((fieldName) => {
      const field = form.elements[fieldName];
      if (field) {
        field.classList.add("is-invalid");

        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message text-danger small mt-1";
        errorDiv.textContent = errors[fieldName];

        field.parentElement.appendChild(errorDiv);
      }
    });
  }
}

// Exponer para uso global
if (typeof window !== "undefined") {
  window.FormValidator = FormValidator;
}

// Exportar para tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = FormValidator;
}
