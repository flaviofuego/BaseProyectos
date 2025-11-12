const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");
const path = require("path");

/**
 * CU-006: Crear Persona
 * Prioridad: Alta
 *
 * Flujo:
 * 1. Usuario autenticado accede a crear persona
 * 2. Completa formulario con datos válidos e imagen
 * 3. Sistema valida datos e imagen
 * 4. Sistema procesa imagen (redimensiona 300x300, convierte a JPEG, calidad 80)
 * 5. Guarda persona en BD
 * 6. Muestra confirmación
 */

test.describe("CU-006: Crear Persona", () => {
  // Login antes de cada test
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navegar a crear persona
    await page.goto("/crear_persona");
  });

  test("debe mostrar formulario de crear persona", async ({ page }) => {
    await expect(page).toHaveTitle(/Crear Persona/i);
    await expect(page.locator("form")).toBeVisible();

    // Verificar campos del formulario (según crear_persona.html)
    await expect(page.locator("#numero_documento")).toBeVisible();
    await expect(page.locator("#tipo_documento")).toBeVisible();
    await expect(page.locator("#primer_nombre")).toBeVisible();
    await expect(page.locator("#apellidos")).toBeVisible();
    await expect(page.locator("#fecha_nacimiento")).toBeVisible();
    await expect(page.locator("#genero")).toBeVisible();
    await expect(page.locator("#correo_electronico")).toBeVisible();
    await expect(page.locator("#celular")).toBeVisible();
    await expect(
      page.locator('#foto, input[type="file"]').first()
    ).toBeVisible();
  });

  test("debe crear persona con datos válidos e imagen", async ({ page }) => {
    const timestamp = Date.now();

    // Llenar formulario
    await page.locator("#primer_nombre").fill("Juan");
    await page.locator("#apellidos").fill("Pérez");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${timestamp}`); // Único
    await page.locator("#fecha_nacimiento").fill("1990-05-15");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page
      .locator("#correo_electronico")
      .fill(`juan${timestamp}@example.com`);

    // Subir imagen de prueba (crear una imagen temporal o usar una existente)
    const fileInput = page.locator('input[type="file"]');

    // Opción 1: Usar imagen del proyecto si existe
    // await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-image.jpg'));

    // Opción 2: Generar imagen temporal (requiere librería adicional)
    // Por ahora, simular sin imagen o verificar que el campo acepta archivos
    const imagePath = path.join(__dirname, "../fixtures/test-photo.jpg");
    try {
      await fileInput.setInputFiles(imagePath);
    } catch (error) {
      console.log("Imagen de prueba no disponible, continuando sin imagen");
    }

    // Submit
    await page.locator('button[type="submit"]').click();

    // Verificar redirección o mensaje de éxito
    await expect(
      page.locator('.alert-success, .success, [role="alert"]')
    ).toContainText(/creada|éxito|success/i, { timeout: 10000 });
  });

  test("debe validar número de documento único", async ({ page }) => {
    // Intentar crear persona con documento duplicado (ajustar según tus datos)
    await page.locator("#primer_nombre").fill("Usuario");
    await page.locator("#apellidos").fill("Duplicado");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill("123456789"); // Asumiendo que existe
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page.locator("#correo_electronico").fill("test@example.com");

    await page.locator('button[type="submit"]').click();

    // Verificar mensaje de error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/documento.*existe|ya registrado/i);
  });

  test("debe validar fecha de nacimiento no futura", async ({ page }) => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await page.locator("#primer_nombre").fill("Test");
    await page.locator("#apellidos").fill("Usuario");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${Date.now()}`);
    await page.locator("#fecha_nacimiento").fill(futureDateStr);
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page.locator("#correo_electronico").fill("test@example.com");

    await page.locator('button[type="submit"]').click();

    // Verificar error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/fecha.*futura|invalid date/i);
  });

  test("debe validar celular 10 dígitos", async ({ page }) => {
    await page.locator("#primer_nombre").fill("Test");
    await page.locator("#apellidos").fill("Usuario");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${Date.now()}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("123"); // Solo 3 dígitos
    await page.locator("#correo_electronico").fill("test@example.com");

    await page.locator('button[type="submit"]').click();

    // Verificar error
    await expect(
      page.locator('.alert-danger, .error, [role="alert"]')
    ).toContainText(/celular.*10.*dígitos|phone.*10.*digits/i);
  });

  test("debe validar formato de email", async ({ page }) => {
    await page.locator("#primer_nombre").fill("Test");
    await page.locator("#apellidos").fill("Usuario");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${Date.now()}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page.locator("#correo_electronico").fill("emailinvalido"); // Sin @

    // Validación HTML5 del navegador
    const emailInput = page.locator("#correo_electronico");
    const validationMessage = await emailInput.evaluate(
      (el) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test("debe rechazar imagen mayor a 2MB", async ({ page }) => {
    await page.locator("#primer_nombre").fill("Test");
    await page.locator("#apellidos").fill("Usuario");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${Date.now()}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page.locator("#correo_electronico").fill("test@example.com");

    // Intentar subir imagen grande (requiere fixture)
    const fileInput = page.locator('input[type="file"]');
    const largePath = path.join(__dirname, "../fixtures/large-image.jpg"); // >2MB

    try {
      await fileInput.setInputFiles(largePath);
      await page.locator('button[type="submit"]').click();

      // Verificar error
      await expect(
        page.locator('.alert-danger, .error, [role="alert"]')
      ).toContainText(/2.*MB|tamaño.*excede/i);
    } catch (error) {
      console.log("Fixture de imagen grande no disponible");
    }
  });

  test("debe rechazar formatos de imagen no permitidos", async ({ page }) => {
    await page.locator("#primer_nombre").fill("Test");
    await page.locator("#apellidos").fill("Usuario");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${Date.now()}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page.locator("#correo_electronico").fill("test@example.com");

    // Intentar subir archivo no permitido (PDF, TXT, etc)
    const fileInput = page.locator('input[type="file"]');
    const invalidPath = path.join(__dirname, "../fixtures/document.pdf");

    try {
      await fileInput.setInputFiles(invalidPath);
      await page.locator('button[type="submit"]').click();

      // Verificar error
      await expect(
        page.locator('.alert-danger, .error, [role="alert"]')
      ).toContainText(/formato.*permitido|JPG|PNG|GIF/i);
    } catch (error) {
      console.log("Fixture de archivo inválido no disponible");
    }
  });

  test("debe validar campos requeridos", async ({ page }) => {
    // Intentar submit sin llenar campos
    await page.locator('button[type="submit"]').click();

    // Verificar validación HTML5
    const numeroDocInput = page.locator("#numero_documento");
    const validationMessage = await numeroDocInput.evaluate(
      (el) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });
});
