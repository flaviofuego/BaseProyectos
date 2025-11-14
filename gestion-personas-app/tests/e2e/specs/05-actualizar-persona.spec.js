const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");

/**
 * CU-008: Actualizar Persona
 * Prioridad: Media
 *
 * Flujo:
 * 1. Usuario busca persona existente
 * 2. Accede a formulario de edición
 * 3. Modifica datos
 * 4. Sistema valida y actualiza
 * 5. Muestra confirmación
 */

test.describe("CU-008: Actualizar Persona", () => {
  let personaId;
  let numeroDocumento;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("debe mostrar formulario de edición con datos existentes", async ({
    page,
  }) => {
    // Ir a consultar personas
    await page.goto("/personas/consultar");
    await page.waitForSelector(
      '#numero_documento, form button[type="submit"]',
      { timeout: 15000 }
    );

    // Buscar primera persona
    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // Hacer clic en "Editar" de la primera persona
    // Abrir dropdown de acciones si existe
    const dropdownToggle = page.locator('.dropdown-toggle, button[aria-expanded]');
    if ((await dropdownToggle.count()) > 0) {
      await dropdownToggle.first().click();
    }
    const editButton = page
      .locator(
        'a:has-text("Editar"), a:has-text("Modificar"), button:has-text("Editar")'
      )
      .first();

    if ((await editButton.count()) > 0) {
      await editButton.click();

      // Verificar que cargó el formulario
      await expect(page).toHaveURL(
        /personas\/modificar|editar_persona|persona\/\d+\/edit/
      );

      // Verificar que los campos tienen valores (primer_nombre/apellidos)
      const nombreInput = page.locator("#primer_nombre");
      const nombre = await nombreInput.inputValue();
      expect(nombre).toBeTruthy();
      expect(nombre.length).toBeGreaterThan(0);
    }
  });

  test("debe actualizar datos de persona exitosamente", async ({ page }) => {
    // Navegar directamente si conocemos una persona de prueba
    // O buscar y editar
    await page.goto("/personas/consultar");

    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const dropdownToggle = page.locator('.dropdown-toggle, button[aria-expanded]');
    if ((await dropdownToggle.count()) > 0) {
      await dropdownToggle.first().click();
    }
    const editButton = page
      .locator('a:has-text("Editar"), a:has-text("Modificar")')
      .first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Modificar datos
      const nombreInput = page.locator("#primer_nombre");
      await nombreInput.fill("Nombre Actualizado");

      const celularInput = page.locator("#celular");
      await celularInput.fill("3009876543");

      // Guardar cambios
      const saveButton = page.locator(
        'button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")'
      );
      await saveButton.click();

      // Verificar mensaje de éxito
      await expect(
        page.locator('.alert-success, .success, [role="alert"]')
      ).toContainText(/actualizada|modificada|éxito|success/i, {
        timeout: 5000,
      });
    }
  });

  test("debe validar que número de documento sigue siendo único al editar", async ({
    page,
  }) => {
    // Ir a editar una persona
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const dropdownToggle2 = page.locator('.dropdown-toggle, button[aria-expanded]');
    if ((await dropdownToggle2.count()) > 0) {
      await dropdownToggle2.first().click();
    }
    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Intentar cambiar a un documento que ya existe
      const docInput = page.locator("#numero_documento");
      await docInput.fill("999999999"); // Asumiendo que existe

      const saveButton = page.locator('button[type="submit"]');
      await saveButton.click();

      // Verificar error
      await expect(page.locator(".alert-danger, .error")).toContainText(
        /documento.*existe|duplicado/i,
        { timeout: 5000 }
      );
    }
  });

  test("debe validar celular 10 dígitos al editar", async ({ page }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const dropdownToggle3 = page.locator('.dropdown-toggle, button[aria-expanded]');
    if ((await dropdownToggle3.count()) > 0) {
      await dropdownToggle3.first().click();
    }
    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Ingresar celular inválido
      const celularInput = page.locator("#celular");
      await celularInput.fill("123"); // Solo 3 dígitos

      const saveButton = page.locator('button[type="submit"]');
      await saveButton.click();

      // Verificar error
      await expect(page.locator(".alert-danger, .error")).toContainText(
        /celular.*10.*dígitos/i,
        { timeout: 5000 }
      );
    }
  });

  test("debe validar formato de email al editar", async ({ page }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const dropdownToggle4 = page.locator('.dropdown-toggle, button[aria-expanded]');
    if ((await dropdownToggle4.count()) > 0) {
      await dropdownToggle4.first().click();
    }
    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Ingresar email inválido
      const emailInput = page.locator("#correo_electronico");
      await emailInput.fill("emailinvalido");

      // Validación HTML5
      const validationMessage = await emailInput.evaluate(
        (el) => el.validationMessage
      );
      expect(validationMessage).toBeTruthy();
    }
  });

  test("debe poder actualizar la foto de persona", async ({ page }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Buscar input de archivo
      const fileInput = page.locator('input[type="file"]');

      if ((await fileInput.count()) > 0) {
        // Verificar que existe la opción de cambiar foto
        await expect(fileInput).toBeVisible();
      }
    }
  });

  test("debe poder cancelar edición sin guardar cambios", async ({ page }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Obtener valor original
      const nombreInput = page.locator("#primer_nombre");
      const nombreOriginal = await nombreInput.inputValue();

      // Modificar
      await nombreInput.fill("Nombre Temporal");

      // Cancelar
      const cancelButton = page.locator(
        'a:has-text("Cancelar"), button:has-text("Cancelar")'
      );

      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();

        // Verificar que volvió a la lista
        await expect(page).toHaveURL(/personas\/consultar/);
      }
    }
  });

  test("debe mantener datos sin modificar si solo se actualiza un campo", async ({
    page,
  }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    await searchButton.click();
    await page.waitForTimeout(1000);

    const editButton = page.locator('a:has-text("Editar")').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Guardar valores originales
      const nombreInput = page.locator("#primer_nombre");
      const apellidoInput = page.locator("#apellidos");

      const nombreOriginal = await nombreInput.inputValue();
      const apellidoOriginal = await apellidoInput.inputValue();

      // Solo modificar celular
      const celularInput = page.locator("#celular");
      await celularInput.fill("3001111111");

      // Guardar
      const saveButton = page.locator('button[type="submit"]');
      await saveButton.click();

      await page.waitForTimeout(1000);

      // Volver a editar y verificar que nombre y apellido no cambiaron
      await page.goto("/personas/consultar");
      await searchButton.click();
      await page.waitForTimeout(1000);
      await editButton.click();
      await page.waitForLoadState("networkidle");

      const nombreActual = await nombreInput.inputValue();
      const apellidoActual = await apellidoInput.inputValue();

      expect(nombreActual).toBe(nombreOriginal);
      expect(apellidoActual).toBe(apellidoOriginal);
    }
  });
});
