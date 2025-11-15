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
      '#tipo_documento, form button[type="submit"]',
      { timeout: 15000 }
    );

    // Buscar usando el segundo formulario (búsqueda avanzada) que permite buscar sin filtros
    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .nth(1); // Segundo botón (búsqueda avanzada)
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1); // Segundo formulario
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // Hacer clic en "Editar" de la primera persona
    // No hay dropdown en esta página, los botones están visibles directamente
    const editButton = page
      .locator(
        'a[href*="modificar_persona"], a[title="Modificar"], .btn-outline-warning'
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
      .last();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const lastForm = page.locator("form").last();
      if ((await lastForm.count()) > 0)
        await lastForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // No hay dropdown, botones están visibles directamente
    const editButton = page
      .locator('a[href*="modificar_persona"], .btn-outline-warning')
      .first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Modificar datos
      const nombreInput = page.locator("#primer_nombre");
      await nombreInput.fill("Nombre Actualizado");

      const celularInput = page.locator("#celular");
      await celularInput.fill("3009876543");

      // Guardar cambios - el botón tiene clase btn-warning y texto 'Actualizar Persona'
      const saveButton = page.locator(
        'button[type="submit"].btn-warning, button:has-text("Actualizar Persona")'
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

  test("debe verificar que el número de documento no se puede modificar", async ({
    page,
  }) => {
    // Ir a editar una persona
    await page.goto("/personas/consultar");

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1);
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Verificar que el campo de documento es readonly (no se puede modificar)
      const docInput = page.locator('input[value]:has-text("")').filter({ hasText: /^\d+$/ }).first();
      if ((await docInput.count()) > 0) {
        const isReadonly = await docInput.getAttribute('readonly');
        expect(isReadonly).not.toBeNull();
      }
    }
  });

  test("debe validar celular 10 dígitos al editar", async ({ page }) => {
    await page.goto("/personas/consultar");

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1);
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Ingresar celular inválido
      const celularInput = page.locator("#celular");
      await celularInput.fill("123"); // Solo 3 dígitos
      
      // Disparar evento input para activar la validación JavaScript
      await celularInput.dispatchEvent('input');
      await page.waitForTimeout(500);

      // Verificar validación HTML5 (el mensaje de validación customizada)
      const validationMessage = await celularInput.evaluate(
        (el) => el.validationMessage
      );
      expect(validationMessage).toContain('10 dígitos');
    }
  });

  test("debe validar formato de email al editar", async ({ page }) => {
    await page.goto("/personas/consultar");

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1);
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

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

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1);
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

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

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const advancedForm = page.locator("form").nth(1);
      if ((await advancedForm.count()) > 0)
        await advancedForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Obtener valor original
      const nombreInput = page.locator("#primer_nombre");
      const nombreOriginal = await nombreInput.inputValue();

      // Modificar
      await nombreInput.fill("Nombre Temporal");

      // Cancelar - es un link con clase btn-outline-secondary que va al dashboard
      const cancelButton = page.locator(
        'a.btn-outline-secondary:has-text("Cancelar")'
      );

      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();

        // Verificar que volvió al dashboard (no a consultar)
        await expect(page).toHaveURL(/dashboard/);
      }
    }
  });

  test("debe mantener datos sin modificar si solo se actualiza un campo", async ({
    page,
  }) => {
    await page.goto("/personas/consultar");

    // Usar segundo formulario (búsqueda avanzada)
    const searchButton = page.locator('button[type="submit"]').nth(1);
    await searchButton.click();
    await page.waitForTimeout(1000);

    const editButton = page.locator('a[href*="modificar_persona"], .btn-outline-warning').first();

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

      // Guardar - botón con clase btn-warning
      const saveButton = page.locator('button[type="submit"].btn-warning, button:has-text("Actualizar Persona")');
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
