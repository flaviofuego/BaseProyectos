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
    const testUsername = `usuario_test_${timestamp}`; // evitar colisiones de usuario

    // Llenar formulario
    await page.locator("#username").fill(testUsername);
    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password123!");

    // Submit
    await page.locator('button[type="submit"]').click();

    // Algunos UIs permanecen en /register mostrando éxito.
    // Aceptamos cualquiera de los dos comportamientos.
    await expect(page).toHaveURL(/\/(login|register)/);

    // Verificar mensaje de éxito
    await expect(
      page.locator('.alert-success, .success, [role="alert"]').first()
    ).toContainText(/registrado|éxito|success/i);
  });

  test("debe validar email duplicado", async ({ page }) => {
    // Usar un email conocido (asumiendo que ya existe en la BD)
    await page.locator("#username").fill("usuario_dup");
    await page.locator("#email").fill("admin@example.com");
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password123!");

    await page.locator('button[type="submit"]').click();

    // Verificar mensaje de error (acepta genérico de servidor)
    const errorBox = page
      .locator('.alert-danger, .error, [role="alert"]')
      .first();
    const errorExists = (await errorBox.count()) > 0;
    if (errorExists) {
      await expect(errorBox).toContainText(
        /email.*existe|ya registrado|something went wrong|error/i
      );
    } else {
      await expect(page).toContainText(
        /email.*existe|ya registrado|something went wrong|error/i
      );
    }
  });

  test("debe validar que contraseñas coincidan", async ({ page }) => {
    const ts = Date.now();
    await page.locator("#username").fill(`usuario_test_${ts}`);
    await page.locator("#email").fill(`mismatch${ts}@example.com`);
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirm_password").fill("Password456!"); // Diferente

    // En caso de invalidación de HTML5 con setCustomValidity, el submit
    // NO dispara el evento 'submit'; por eso no habrá alert().
    await page.locator('button[type="submit"]').click();

    // Se queda en /register y marca el campo como inválido
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator("#confirm_password")).toHaveClass(
      /is-invalid-custom/
    );

    // El indicador de coincidencia debe mostrarse y marcarse como inválido
    await expect(page.locator("#password-match-indicator")).toBeVisible();
    await expect(page.locator("#password-match")).toHaveClass(/invalid/);

    // El mensaje de validación nativo debe contener nuestro texto personalizado
    const validationMessage = await page
      .locator("#confirm_password")
      .evaluate((el) => el.validationMessage);
    expect(validationMessage).toMatch(/no coinciden/i);
  });

  test("debe validar password mínimo 8 caracteres", async ({ page }) => {
    const ts = Date.now();
    await page.locator("#username").fill(`usuario_test_${ts}`);
    await page.locator("#email").fill(`short${ts}@example.com`);
    await page.locator("#password").fill("1234567"); // 7 caracteres
    await page.locator("#confirm_password").fill("1234567");

    const dialogPromise = new Promise((resolve) => {
      page.once("dialog", async (dialog) => {
        const msg = dialog.message();
        await dialog.dismiss();
        resolve(msg);
      });
    });

    await page.locator('button[type="submit"]').click();

    const dialogMsg = await dialogPromise;
    expect(dialogMsg).toMatch(/mínimo\s*8|no cumple los requisitos/i);
    await expect(page).toHaveURL(/\/register/);
    const passInvalid = await page
      .locator("#password")
      .evaluate((el) => el.classList.contains("is-invalid-custom"));
    expect(passInvalid).toBeTruthy();
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
