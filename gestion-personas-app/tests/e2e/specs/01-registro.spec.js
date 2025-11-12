const { test, expect } = require("@playwright/test");

/**
 * CU-001: Registrarse
 * Prioridad: Alta
 *
 * Flujo:
 * 1. Usuario accede a /register
 * 2. Completa formulario con datos válidos
 * 3. Sistema crea cuenta
 * 4. Redirige a login con mensaje de éxito
 */

test.describe("CU-001: Registro de Usuario", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("debe mostrar formulario de registro", async ({ page }) => {
    await expect(page).toHaveTitle(/Registro|Register/i);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirm_password")).toBeVisible();
  });

  test("debe registrar usuario con datos válidos", async ({ page }) => {
    // Generar email único para evitar conflictos
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    // Llenar formulario
    await page.locator("#username").fill("usuario_test");
    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password123!");

    // Submit
    await page.locator('button[type="submit"]').click();

    // Verificar redirección a login
    await expect(page).toHaveURL(/\/login/);

    // Verificar mensaje de éxito
    await expect(
      page.locator('.alert-success, .success, [role="alert"]')
    ).toContainText(/registrado|éxito|success/i);
  });

  test("debe validar email duplicado", async ({ page }) => {
    // Usar un email conocido (asumiendo que ya existe en la BD)
    await page.locator("#username").fill("usuario_dup");
    await page.locator("#email").fill("admin@example.com");
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password123!");

    await page.locator('button[type="submit"]').click();

    // Verificar mensaje de error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/email.*existe|ya registrado/i);
  });

  test("debe validar que contraseñas coincidan", async ({ page }) => {
    await page.locator("#username").fill("usuario_test");
    await page.locator("#email").fill("test@example.com");
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password456!"); // Diferente

    await page.locator('button[type="submit"]').click();

    // Verificar mensaje de error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/contraseñas.*coinciden|passwords.*match/i);
  });

  test("debe validar password mínimo 8 caracteres", async ({ page }) => {
    await page.locator("#username").fill("usuario_test");
    await page.locator("#email").fill("test@example.com");
    await page.locator("#password").fill("1234567"); // 7 caracteres
    await page.locator("#confirm_password").fill("1234567");

    await page.locator('button[type="submit"]').click();

    // Verificar mensaje de error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/mínimo 8|at least 8/i);
  });

  test("debe validar formato de email", async ({ page }) => {
    await page.locator("#username").fill("usuario_test");
    await page.locator("#email").fill("emailinvalido"); // Sin @
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password123!");

    // El navegador debería mostrar validación HTML5
    const emailInput = page.locator("#email");
    const validationMessage = await emailInput.evaluate(
      (el) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test("debe validar campos requeridos", async ({ page }) => {
    // Intentar submit sin llenar campos
    await page.locator('button[type="submit"]').click();

    // Verificar que no se envió el formulario
    await expect(page).toHaveURL(/\/register/);

    // Verificar validación HTML5
    const usernameInput = page.locator("#username");
    const validationMessage = await usernameInput.evaluate(
      (el) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });
});
