/**
 * Helper utilities para tests E2E
 */

/**
 * Login helper - Reutilizable en todos los tests
 * Intenta usar el botón "Login Rápido (Desarrollo)" si existe.
 * Si no, usa login local con usuario/contraseña.
 */
async function login(
  page,
  username = "admin",
  password = "NuevaPassword456!!"
) {
  await page.goto("/login");

  // Si hay botón de Login Rápido, úsalo (más estable y rápido para E2E)
  const quickLogin = page.locator('a:has-text("Login Rápido")');
  if ((await quickLogin.count()) > 0) {
    await quickLogin.first().click();
    await page.waitForURL(/\/dashboard|\/home/i);
    return;
  }

  // Asegurar que estamos en el formulario de login (no en el de registro)
  const loginToggle = page.locator("#loginToggle");
  if ((await loginToggle.count()) > 0) {
    await loginToggle.click();
  }

  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  // Botón principal de login
  const submit = page.locator('#loginButton, button[type="submit"]');
  await submit.first().click();
  await page.waitForURL(/\/dashboard|\/home/i);
}

/**
 * Logout helper
 */
async function logout(page) {
  // Abrir menú de usuario si existe
  const userMenuToggle = page.locator("#userDropdown");
  if ((await userMenuToggle.count()) > 0) {
    await userMenuToggle.click();
  }
  const logoutButton = page.locator('a.dropdown-item[href*="logout"]');
  if ((await logoutButton.count()) > 0) {
    await logoutButton.click();
  }
}

/**
 * Crear persona de prueba
 */
async function crearPersonaPrueba(page, data = {}) {
  const timestamp = Date.now();
  const defaults = {
    primer_nombre: "Test",
    segundo_nombre: "",
    apellidos: "Usuario",
    tipo_documento: "Cédula",
    numero_documento: `${timestamp}`,
    fecha_nacimiento: "1990-01-01",
    genero: "Masculino",
    celular: "3001234567",
    correo_electronico: `test${timestamp}@example.com`,
  };

  const personaData = { ...defaults, ...data };

  await page.goto("/crear_persona");

  await page.locator("#primer_nombre").fill(personaData.primer_nombre);
  if (personaData.segundo_nombre !== undefined) {
    await page.locator("#segundo_nombre").fill(personaData.segundo_nombre);
  }
  await page.locator("#apellidos").fill(personaData.apellidos);
  await page
    .locator("#tipo_documento")
    .selectOption({ label: personaData.tipo_documento });
  await page.locator("#numero_documento").fill(personaData.numero_documento);
  await page.locator("#fecha_nacimiento").fill(personaData.fecha_nacimiento);
  await page.locator("#genero").selectOption({ label: personaData.genero });
  await page
    .locator("#correo_electronico")
    .fill(personaData.correo_electronico);
  await page.locator("#celular").fill(personaData.celular);

  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(1000);

  return personaData;
}

/**
 * Buscar persona por documento
 */
async function buscarPersonaPorDocumento(page, numeroDocumento) {
  await page.goto("/consultar_personas");

  const docInput = page.locator('input[name="numero_documento"]').first();

  if ((await docInput.count()) > 0) {
    await docInput.fill(numeroDocumento);
  }

  const searchButton = page.locator('button[type="submit"]').first();
  await searchButton.click();
  await page.waitForTimeout(1000);
}

/**
 * Esperar a que un elemento esté visible con timeout personalizado
 */
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, state: "visible" });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verificar que hay mensaje de éxito
 */
async function verificarMensajeExito(page) {
  const successMessage = page.locator(
    '.alert-success, .success, [role="alert"]'
  );
  await successMessage.first().waitFor({ state: "visible", timeout: 5000 });
  const text = await successMessage.first().textContent();
  return text.match(/éxito|success|creada|guardada|actualizada/i) !== null;
}

/**
 * Verificar que hay mensaje de error
 */
async function verificarMensajeError(page) {
  const errorMessage = page.locator('.alert-danger, .error, [role="alert"]');
  await errorMessage.first().waitFor({ state: "visible", timeout: 5000 });
  return true;
}

/**
 * Generar datos únicos para tests
 */
function generarDatosUnicos() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    timestamp,
    random,
    email: `test${timestamp}${random}@example.com`,
    documento: `${timestamp}${random}`,
    celular: `300${timestamp.toString().slice(-7)}`,
  };
}

/**
 * Limpiar datos de prueba (si hay endpoint disponible)
 */
async function limpiarDatosPrueba(page, numeroDocumento) {
  // Implementar si hay un endpoint de limpieza
  // O eliminar manualmente
  await buscarPersonaPorDocumento(page, numeroDocumento);

  const deleteButton = page
    .locator('a:has-text("Eliminar"), button:has-text("Eliminar")')
    .first();

  if ((await deleteButton.count()) > 0) {
    page.once("dialog", (dialog) => dialog.accept());
    await deleteButton.click();

    const confirmButton = page.locator(
      'button:has-text("Confirmar"), button:has-text("Sí")'
    );
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click();
    }

    await page.waitForTimeout(1000);
  }
}

/**
 * Screenshot helper
 */
async function tomarScreenshot(page, nombre) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `screenshots/${nombre}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Verificar que usuario está autenticado
 */
async function estaAutenticado(page) {
  const cookies = await page.context().cookies();
  return cookies.some(
    (c) =>
      c.name.includes("session") ||
      c.name.includes("token") ||
      c.name.includes("jwt")
  );
}

module.exports = {
  login,
  logout,
  crearPersonaPrueba,
  buscarPersonaPorDocumento,
  waitForElement,
  verificarMensajeExito,
  verificarMensajeError,
  generarDatosUnicos,
  limpiarDatosPrueba,
  tomarScreenshot,
  estaAutenticado,
};
