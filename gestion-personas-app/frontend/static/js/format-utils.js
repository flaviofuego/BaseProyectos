/**
 * Utilidades de formateo
 * Funciones para formatear fechas, texto, números, etc.
 */

class FormatUtils {
  /**
   * Formatea una fecha en formato legible
   * @param {Date|string} date - Fecha a formatear
   * @param {string} format - Formato ('short', 'long', 'time', 'datetime')
   * @returns {string}
   */
  static formatDate(date, format = "short") {
    if (!date) return "";

    const d = typeof date === "string" ? new Date(date) : date;

    if (isNaN(d.getTime())) return "";

    const options = {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      long: { year: "numeric", month: "long", day: "numeric" },
      time: { hour: "2-digit", minute: "2-digit" },
      datetime: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      },
    };

    const locale = "es-ES";
    return d.toLocaleDateString(locale, options[format] || options.short);
  }

  /**
   * Formatea texto a título (Primera Letra Mayúscula)
   * @param {string} text - Texto a formatear
   * @returns {string}
   */
  static toTitleCase(text) {
    if (!text) return "";

    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Capitaliza la primera letra de un texto
   * @param {string} text - Texto a capitalizar
   * @returns {string}
   */
  static capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Formatea número con separadores de miles
   * @param {number|string} number - Número a formatear
   * @returns {string}
   */
  static formatNumber(number) {
    if (number === null || number === undefined) return "";

    const num = typeof number === "string" ? parseFloat(number) : number;

    if (isNaN(num)) return "";

    return num.toLocaleString("es-ES");
  }

  /**
   * Formatea número como moneda
   * @param {number|string} amount - Cantidad a formatear
   * @param {string} currency - Código de moneda (default: 'USD')
   * @returns {string}
   */
  static formatCurrency(amount, currency = "USD") {
    if (amount === null || amount === undefined) return "";

    const num = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(num)) return "";

    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(num);
  }

  /**
   * Formatea teléfono en formato legible
   * @param {string} phone - Número de teléfono
   * @returns {string}
   */
  static formatPhone(phone) {
    if (!phone) return "";

    // Remover caracteres no numéricos
    const cleaned = phone.replace(/\D/g, "");

    // Formatear según longitud
    if (cleaned.length === 10) {
      // Formato: (XXX) XXX-XXXX
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    } else if (cleaned.length === 11) {
      // Formato: X (XXX) XXX-XXXX
      return `${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(
        4,
        7
      )}-${cleaned.slice(7)}`;
    }

    return phone; // Retornar original si no coincide formato esperado
  }

  /**
   * Trunca texto a una longitud específica
   * @param {string} text - Texto a truncar
   * @param {number} maxLength - Longitud máxima
   * @param {string} suffix - Sufijo (default: '...')
   * @returns {string}
   */
  static truncate(text, maxLength, suffix = "...") {
    if (!text) return "";
    if (text.length <= maxLength) return text;

    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Formatea bytes a tamaño legible
   * @param {number} bytes - Bytes a formatear
   * @param {number} decimals - Decimales a mostrar (default: 2)
   * @returns {string}
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    if (!bytes) return "";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * Formatea porcentaje
   * @param {number} value - Valor a formatear
   * @param {number} decimals - Decimales (default: 1)
   * @returns {string}
   */
  static formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined) return "";

    const num = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(num)) return "";

    return `${num.toFixed(decimals)}%`;
  }

  /**
   * Formatea tiempo relativo (ej: "hace 5 minutos")
   * @param {Date|string} date - Fecha
   * @returns {string}
   */
  static formatRelativeTime(date) {
    if (!date) return "";

    const d = typeof date === "string" ? new Date(date) : date;

    if (isNaN(d.getTime())) return "";

    const nowMs = Date.now();
    const diffMs = nowMs - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "hace un momento";
    if (diffMin < 60)
      return `hace ${diffMin} minuto${diffMin !== 1 ? "s" : ""}`;
    if (diffHour < 24)
      return `hace ${diffHour} hora${diffHour !== 1 ? "s" : ""}`;
    if (diffDay < 7) return `hace ${diffDay} día${diffDay !== 1 ? "s" : ""}`;

    return this.formatDate(d, "short");
  }

  /**
   * Sanitiza HTML para prevenir XSS
   * @param {string} html - HTML a sanitizar
   * @returns {string}
   */
  static sanitizeHTML(html) {
    if (!html) return "";

    const temp = document.createElement("div");
    temp.textContent = html;
    return temp.innerHTML;
  }

  /**
   * Convierte texto a slug (URL-friendly)
   * @param {string} text - Texto a convertir
   * @returns {string}
   */
  static slugify(text) {
    if (!text) return "";

    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

// Exponer para uso global
if (typeof window !== "undefined") {
  window.FormatUtils = FormatUtils;
}

// Exportar para tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = FormatUtils;
}
