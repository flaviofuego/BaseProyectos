const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");

/**
 * E2E: Auditoría / Logs
 * Requisitos guía: ≥1 flujo E2E para módulo Auditoría
 * Flujo: login → navegar a /logs → aplicar filtros básicos → verificar render
 */

test.describe("E2E: Auditoría - Consultar Logs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("debe cargar la página de logs y mostrar UI básica", async ({
    page,
  }) => {
    await page.goto("/logs");

    // Debe cargar algún indicador de página de logs
    await expect(page.locator("body")).toContainText(
      /logs|auditoría|auditoria|registro/i
    );

    // Formulario de filtros si existe
    const hasFilter = await page.locator("form").count();
    if (hasFilter > 0) {
      // Completar uno o dos filtros comunes si están presentes
      const statusSel = page.locator('select[name="status"]');
      if (await statusSel.count()) {
        await statusSel.selectOption({ label: "SUCCESS" }).catch(() => {});
      }

      const tipoSel = page.locator('select[name="transaction_type"]');
      if (await tipoSel.count()) {
        await tipoSel.selectOption({ label: "LOGIN" }).catch(() => {});
      }

      // Ejecutar búsqueda
      const buscarBtn = page
        .locator('button[type="submit"], button:has-text("Buscar")')
        .first();
      if (await buscarBtn.count()) {
        await buscarBtn.click();
      }
    }

    // Verificar resultados o mensaje vacío
    const results = page.locator(
      ".table, .list-group, .card, .alert, [role='table']"
    );
    await expect(results.first()).toBeVisible({ timeout: 10000 });
  });
});
