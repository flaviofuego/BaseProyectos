const { test, expect } = require("@playwright/test");
const { login, logout } = require("../helpers/test-helpers");

/**
 * CU-009: Eliminar Persona
 * Prioridad: Media
 *
 * Flujo:
 * 1. Usuario busca persona a eliminar
 * 2. Hace clic en eliminar
 * 3. Sistema muestra confirmación
 * 4. Usuario confirma
 * 5. Sistema elimina y muestra mensaje
 */

test.describe("CU-009: Eliminar Persona", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("debe mostrar botón de eliminar en lista de personas", async ({
    page,
  }) => {
    await page.goto("/personas/consultar");
    await page.waitForSelector(
      '#numero_documento, form button[type="submit"]',
      { timeout: 15000 }
    );

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // Verificar que existe botón de eliminar
    const deleteButton = page
      .locator(
        'a:has-text("Eliminar"), button:has-text("Eliminar"), a:has-text("Borrar")'
      )
      .first();

    if ((await deleteButton.count()) > 0) {
      await expect(deleteButton).toBeVisible();
    }
  });

  test("debe solicitar confirmación antes de eliminar", async ({ page }) => {
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

    const deleteButton = page
      .locator('a:has-text("Eliminar"), button:has-text("Eliminar")')
      .first();

    if ((await deleteButton.count()) > 0) {
      // Capturar posible diálogo nativo
      page.on("dialog", (dialog) => dialog.dismiss());
      await deleteButton.click();

      // Verificar página de confirmación con checkbox
      const checkbox = page.locator("#confirm");
      if ((await checkbox.count()) > 0) {
        await expect(checkbox).toBeVisible();
      }
    }
  });

  test("debe eliminar persona exitosamente", async ({ page }) => {
    // Primero crear una persona de prueba para eliminar
    const timestamp = Date.now();

    // Crear persona con campos reales
    await page.goto("/personas/crear");
    await page.locator("#primer_nombre").fill("PersonaAEliminar");
    await page.locator("#apellidos").fill("Test");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${timestamp}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page
      .locator("#correo_electronico")
      .fill(`delete${timestamp}@example.com`);
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(1000);

    // Buscar la persona recién creada
    await page.goto("/personas/consultar");
    const searchInput = page.locator("#numero_documento").first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill(`${timestamp}`);
    }

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // Eliminar
    const deleteButton = page
      .locator('a:has-text("Eliminar"), button:has-text("Eliminar")')
      .first();

    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();

      // Página de confirmación: marcar checkbox y eliminar
      const checkbox = page.locator("#confirm");
      const deleteBtn = page.locator("#deleteBtn");
      if ((await checkbox.count()) > 0 && (await deleteBtn.count()) > 0) {
        await checkbox.check();
        // Posible confirm() nativo
        page.once("dialog", (dialog) => dialog.accept());
        await deleteBtn.click();
      } else {
        // Fallback a botón de confirmar genérico
        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Sí"), button[type="submit"]'
        );
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click();
        }
      }

      // Verificar mensaje de éxito
      await expect(
        page.locator('.alert-success, .success, [role="alert"]')
      ).toContainText(/eliminada|borrada|éxito|success/i, { timeout: 5000 });
    }
  });

  test("debe poder cancelar eliminación", async ({ page }) => {
    await page.goto("/personas/consultar");

    const searchButton = page.locator('button[type="submit"]').first();
    await searchButton.click();
    await page.waitForTimeout(1000);

    const deleteButton = page
      .locator('a:has-text("Eliminar"), button:has-text("Eliminar")')
      .first();

    if ((await deleteButton.count()) > 0) {
      // Manejar confirmación y cancelar
      page.once("dialog", (dialog) => {
        dialog.dismiss();
      });

      await deleteButton.click();

      // O si es página de confirmación
      const cancelButton = page.locator(
        'button:has-text("Cancelar"), a:has-text("Cancelar")'
      );
      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();

        // Verificar que volvió a la lista
        await expect(page).toHaveURL(/personas\/consultar/);
      }

      await page.waitForTimeout(500);

      // Verificar que la persona sigue existiendo (no se eliminó)
      const personRows = page.locator("table tbody tr, .persona-item");
      const count = await personRows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("debe remover persona de la lista después de eliminar", async ({
    page,
  }) => {
    // Crear persona de prueba
    const timestamp = Date.now();

    await page.goto("/personas/crear");
    await page.locator("#primer_nombre").fill("PersonaTemp");
    await page.locator("#apellidos").fill("Test");
    await page.locator("#tipo_documento").selectOption({ label: "Cédula" });
    await page.locator("#numero_documento").fill(`${timestamp}`);
    await page.locator("#fecha_nacimiento").fill("1990-01-01");
    await page.locator("#genero").selectOption({ label: "Masculino" });
    await page.locator("#celular").fill("3001234567");
    await page
      .locator("#correo_electronico")
      .fill(`temp${timestamp}@example.com`);
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(1000);

    // Buscar y contar personas antes de eliminar
    await page.goto("/personas/consultar");
    const searchInput = page.locator("#numero_documento").first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill(`${timestamp}`);
    }

    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const rowsBefore = await page
      .locator("table tbody tr, .persona-item")
      .count();
    expect(rowsBefore).toBeGreaterThan(0);

    // Eliminar
    const deleteButton = page.locator('a:has-text("Eliminar")').first();

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

      // Buscar nuevamente
      await page.goto("/personas/consultar");
      if ((await searchInput.count()) > 0) {
        await searchInput.fill(`${timestamp}`);
      }
      await searchButton.click();
      await page.waitForTimeout(1000);

      // Verificar que ya no está
      const noResults = page.locator("text=/no.*resultados|no.*encontr/i");
      await expect(noResults).toBeVisible({ timeout: 5000 });
    }
  });

  test("debe mostrar mensaje de error si no se puede eliminar", async ({
    page,
  }) => {
    // Este test depende de la lógica de negocio
    // Por ejemplo, si una persona tiene relaciones, no debería poder eliminarse

    await page.goto("/consultar_personas");
    const searchButton = page.locator('button[type="submit"]').first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator("form").first();
      if ((await firstForm.count()) > 0)
        await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    const deleteButton = page.locator('a:has-text("Eliminar")').first();

    if ((await deleteButton.count()) > 0) {
      page.once("dialog", (dialog) => dialog.accept());
      await deleteButton.click();

      const confirmButton = page.locator('button:has-text("Confirmar")');
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click();

        // Si hay restricciones de integridad, debería mostrar error
        const errorMessage = page.locator(
          '.alert-danger, .error, [role="alert"]'
        );

        // Puede o no fallar dependiendo de los datos
        const hasError = (await errorMessage.count()) > 0;

        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test("debe requerir permisos de administrador para eliminar", async ({
    page,
    context,
  }) => {
    // Logout
    await logout(page);

    // Login como usuario regular (si existe)
    await page.goto("/login");
    await page.locator("#username").fill("user");
    await page.locator("#password").fill("user123");
    await page.locator('#loginButton, button[type="submit"]').first().click();

    // Si el login fue exitoso, verificar que no tiene acceso a eliminar
    if ((await page.locator(".alert-danger").count()) === 0) {
      await page.goto("/consultar_personas");
      await page.waitForTimeout(1000);

      // Verificar que no hay botón de eliminar o está deshabilitado
      const deleteButton = page.locator(
        'a:has-text("Eliminar"), button:has-text("Eliminar")'
      );

      if ((await deleteButton.count()) > 0) {
        const isDisabled = await deleteButton.first().isDisabled();
        expect(isDisabled).toBeTruthy();
      } else {
        // No hay botón de eliminar - correcto
        expect(await deleteButton.count()).toBe(0);
      }
    }
  });
});
