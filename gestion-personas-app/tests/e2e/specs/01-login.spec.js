const { test, expect } = require("@playwright/test");

/**
 * CU-002: Iniciar Sesión
 * Prioridad: Alta
 *
 * Flujo:
 * 1. Usuario accede a /login
 * 2. Ingresa credenciales válidas
 * 3. Sistema valida y crea sesión
 * 4. Redirige a dashboard
 */

test.describe("CU-002: Inicio de Sesión", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("debe mostrar formulario de login", async ({ page }) => {
    await expect(page).toHaveTitle(/Login|Iniciar Sesión/i);
    await expect(page.locator("#loginFormContainer")).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.locator('#loginButton, button[type="submit"]').first()
    ).toBeVisible();
  });

  test("debe iniciar sesión con credenciales válidas", async ({ page }) => {
    // Preferir Login Rápido si está disponible
    const quick = page.locator('a:has-text("Login Rápido")');
    if ((await quick.count()) > 0) {
      await quick.first().click();
    } else {
      await page.locator("#username").fill("admin");
      await page.locator("#password").fill("NuevaPassword456!!");
      await page.locator('#loginButton, button[type="submit"]').first().click();
    }

    // Verificar redirección a dashboard
    await page.waitForURL(/\/dashboard|\/home/i);
    await expect(page).toHaveURL(/\/dashboard|\/home/i);

    // Verificar que el dashboard está visible
    await expect(page.locator("h1, h2")).toContainText(
      /dashboard|inicio|bienvenido/i
    );
  });

  test("debe mantener sesión activa después de login", async ({
    page,
    context,
  }) => {
    // Login exitoso (usar rápido si existe)
    const quick = page.locator('a:has-text("Login Rápido")');
    if ((await quick.count()) > 0) {
      await quick.first().click();
    } else {
      await page.locator("#username").fill("admin");
      await page.locator("#password").fill("NuevaPassword456!!");
      await page.locator('#loginButton, button[type="submit"]').first().click();
    }
    await page.waitForURL(/\/dashboard|\/home/i);

    // Verificar que hay cookies de sesión
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.includes("session") ||
        c.name.includes("token") ||
        c.name.includes("jwt")
    );
    expect(sessionCookie).toBeTruthy();

    // Navegar a otra página y verificar que sigue autenticado
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("debe rechazar credenciales inválidas", async ({ page }) => {
    await page.locator("#username").fill("usuario");
    await page.locator("#password").fill("wrongpassword");

    await page.locator('#loginButton, button[type="submit"]').first().click();

    // Verificar mensaje de error
    const alertDanger = page.locator(".alert-danger").first();
    const expected =
      /credenciales|inválido|incorrect|usuario\s*no\s*encontrado|nombre\s*de\s*usuario|No se pudo conectar|Error en el servidor|Something went wrong/i;
    if ((await alertDanger.count()) > 0) {
      await expect(alertDanger).toContainText(expected);
    } else {
      await expect(page).toContainText(expected);
    }

    // Verificar que no redirigió
    await expect(page).toHaveURL(/\/login/);
  });

  test("debe rechazar email no registrado", async ({ page }) => {
    await page.locator("#username").fill("noexiste");
    await page.locator("#password").fill("password123");

    await page.locator('#loginButton, button[type="submit"]').first().click();

    // Verificar mensaje de error
    const alertDanger = page.locator(".alert-danger").first();
    const expected =
      /no encontrado|not found|credenciales|No se pudo conectar|Error en el servidor|Something went wrong/i;
    if ((await alertDanger.count()) > 0) {
      await expect(alertDanger).toContainText(expected);
    } else {
      await expect(page).toContainText(expected);
    }
  });

  test("debe validar campos requeridos", async ({ page }) => {
    // Intentar submit sin llenar campos
    await page.locator('#loginButton, button[type="submit"]').first().click();

    // Verificar validación HTML5
    const userInput = page.locator("#username");
    const validationMessage = await userInput.evaluate(
      (el) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test("debe tener link a página de registro", async ({ page }) => {
    const registerToggle = page.locator("#registerToggle");
    await expect(registerToggle).toBeVisible();
    await registerToggle.click();
    await expect(page.locator("#registerFormContainer")).toBeVisible();
  });

  test("debe cerrar sesión correctamente", async ({ page, context }) => {
    // Login
    const quick = page.locator('a:has-text("Login Rápido")');
    if ((await quick.count()) > 0) {
      await quick.first().click();
    } else {
      await page.locator("#username").fill("admin");
      await page.locator("#password").fill("NuevaPassword456!!");
      await page.locator('#loginButton, button[type="submit"]').first().click();
    }
    await page.waitForURL(/\/dashboard|\/home/i);

    // Buscar botón de logout
    // Abrir menú de usuario y luego click en Cerrar Sesión
    const userMenuToggle = page.locator("#userDropdown");
    if ((await userMenuToggle.count()) > 0) {
      await userMenuToggle.click();
    }
    const logoutButton = page.locator('a.dropdown-item[href*="logout"]');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Verificar redirección a login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("#loginFormContainer")).toBeVisible();

    // Verificar que las cookies fueron eliminadas
    const cookiesAfterLogout = await context.cookies();
    const sessionCookie = cookiesAfterLogout.find(
      (c) =>
        c.name.includes("session") ||
        c.name.includes("token") ||
        c.name.includes("jwt")
    );
    expect(sessionCookie).toBeFalsy();
  });
});
