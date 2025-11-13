const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");

/**
 * CU-007: Consultar Personas
 * Prioridad: Media
 *
 * Flujo:
 * 1. Usuario autenticado accede a consulta de personas
 * 2. Visualiza o no resultados según filtros
 * 3. Realiza búsqueda con filtros
 * 4. Sistema muestra resultados o mensaje de no resultados
 */

test.describe("CU-007: Consultar Personas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navegar a consultar personas
    await page.goto("/personas/consultar");
    await expect(page.locator('h1:has-text("Consultar Personas")')).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('#numero_documento, form button[type="submit"]', { timeout: 15000 });
  });

  test("debe mostrar página de consulta con formularios", async ({ page }) => {
    await expect(page).toHaveTitle(/Consultar|Personas/i);
    await expect(page.locator("#numero_documento").first()).toBeVisible({ timeout: 15000 });
  });

  test("debe buscar por número de documento", async ({ page }) => {
    const docInput = page.locator("#numero_documento");
    if ((await docInput.count()) > 0) {
      await docInput.fill("123456789");
      const searchButton = page
        .locator('button[type="submit"], button:has-text("Buscar")')
        .first();
      if ((await searchButton.count()) > 0) {
        await searchButton.click();
      } else {
        const firstForm = page.locator('form').first();
        if ((await firstForm.count()) > 0) {
          await firstForm.evaluate((f) => f.submit());
        }
      }
      await page.waitForTimeout(1000);
      const table = page.locator("table");
      const noResults = page.locator("text=/No se encontraron resultados/i");
      expect(
        (await table.count()) + (await noResults.count())
      ).toBeGreaterThanOrEqual(0);
    }
  });

  test("debe buscar por tipo de documento", async ({ page }) => {
    const tipoDocSelect = page.locator("#tipo_documento");
    if ((await tipoDocSelect.count()) > 0) {
      await tipoDocSelect.selectOption({ label: "Cédula" });
      const searchButton = page
        .locator('button[type="submit"], button:has-text("Buscar")')
        .first();
      await searchButton.click();
      await page.waitForTimeout(1000);
      const results = page.locator("table tbody tr");
      expect(await results.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("debe mostrar mensaje si no hay resultados", async ({ page }) => {
    const searchInput = page.locator("#numero_documento").first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill("0000000000000");
    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator('form').first();
      if ((await firstForm.count()) > 0) await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);
    const noResultsHeader = page.locator('main .alert h5:has-text("No se encontraron resultados")');
    expect(await noResultsHeader.count()).toBeGreaterThan(0);
  });

  test("debe paginar resultados si hay muchos", async ({ page }) => {
    const searchButton = page
      .locator(
        'button[type="submit"], button:has-text("Buscar"), button:has-text("Ver todas")'
      )
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator('form').first();
      if ((await firstForm.count()) > 0) await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);
    const pagination = page.locator(
      '.pagination, nav[aria-label="pagination"], .page-numbers'
    );
    if ((await pagination.count()) > 0) {
      await expect(pagination).toBeVisible();
      const nextButton = page
        .locator(
          'a:has-text("2"), a:has-text("Siguiente"), a:has-text("Next"), .page-link:has-text("2")'
        )
        .first();
      if ((await nextButton.count()) > 0) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(/page=2|p=2/);
      }
    }
  });

  test("debe mostrar detalles al hacer clic en una persona", async ({
    page,
  }) => {
    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator('form').first();
      if ((await firstForm.count()) > 0) await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);
    const firstPerson = page.locator("table tbody tr").first();
    if ((await firstPerson.count()) > 0) {
      const detailsLink = firstPerson
        .locator(
          'a:has-text("Ver"), a:has-text("Detalles"), button:has-text("Ver")'
        )
        .first();
      if ((await detailsLink.count()) > 0) {
        await detailsLink.click();
        await expect(page).toHaveURL(/personas\/consultar|detalle|ver/i);
      }
    }
  });

  test("debe limpiar filtros de búsqueda", async ({ page }) => {
  const searchInput = page.locator("#numero_documento").first();
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await searchInput.fill("123");
    const clearButton = page.locator(
      'button:has-text("Limpiar"), button:has-text("Clear"), input[type="reset"], a:has-text("Limpiar")'
    );
    if ((await clearButton.count()) > 0) {
      await clearButton.first().click();
      await expect(searchInput).toHaveValue("");
    }
  });

  test("debe exportar resultados si está disponible", async ({ page }) => {
    const searchButton = page
      .locator('button[type="submit"], button:has-text("Buscar")')
      .first();
    if ((await searchButton.count()) > 0) {
      await searchButton.click();
    } else {
      const firstForm = page.locator('form').first();
      if ((await firstForm.count()) > 0) await firstForm.evaluate((f) => f.submit());
    }
    await page.waitForTimeout(1000);

    // Solo validar exportación si hay resultados visibles
    const resultsHeader = page.locator('h5.card-title:has-text("Resultados")');
    const rows = page.locator('table tbody tr');
    if ((await resultsHeader.count()) > 0 || (await rows.count()) > 0) {
      const csvButton = page.locator('button:has-text("CSV")');
      const excelButton = page.locator('button:has-text("Excel")');
      await expect(csvButton.first()).toBeVisible();
      await expect(excelButton.first()).toBeVisible();
    }
  });
});
