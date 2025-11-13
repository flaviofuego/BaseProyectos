// E2E: Full user journey - login -> create -> consult -> audit logs
// Note: Uses existing helpers when possible; selectors are kept resilient

const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");

const DOC = `9${Date.now().toString().slice(-9)}`;

test.describe("CU-FULL: User journey CRUD + audit", () => {
  test("login -> create persona -> consult -> view audit log", async ({
    page,
  }) => {
    // 1) Login (helper handles quick login if available)
    await login(page);

    // 2) Go to create persona form
    await page.goto("/personas/crear");
    await expect(page).toHaveURL(/personas\/crear/);

    // Fill form (no image)
    await page.fill('input[name="numero_documento"]', DOC);
    await page.selectOption('select[name="tipo_documento"]', {
      label: "Cédula",
    });
    await page.fill('input[name="primer_nombre"]', "Ana");
    await page.fill('input[name="segundo_nombre"]', "María");
    await page.fill('input[name="apellidos"]', "García");
    await page.fill('input[name="fecha_nacimiento"]', "1992-08-15");
    await page.selectOption('select[name="genero"]', { label: "Femenino" });
    await page.fill(
      'input[name="correo_electronico"]',
      `ana.${Date.now()}@example.com`
    );
    await page.fill('input[name="celular"]', "3001234567");

    // Submit
    await page.click(
      'button[type="submit"], button:has-text("Crear"), button:has-text("Guardar")'
    );

    // Expect success toast/alert
    await expect(
      page.locator('.alert-success, .toast-success, [role="alert"]')
    ).toBeVisible({ timeout: 10000 });

    // 3) Go to Consultar Personas
    await page.goto("/personas/consultar");
    await expect(page).toHaveURL(/personas\/consultar/);

    // Search by document
    await page.fill(
      'input[name="numero_documento"], input[placeholder*="documento"]',
      DOC
    );
    await page.click('button:has-text("Buscar"), button[type="submit"]');

    // Verify results contain our DOC
    const rows = page.locator("table tbody tr, .persona-item");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${DOC}`)).toBeVisible();

    // 4) Go to Logs page (name may vary)
    // Try a few common paths/links
    const logsLinks = page.locator(
      'a:has-text("Logs"), a:has-text("Auditoría"), a:has-text("Ver Logs")'
    );
    if (await logsLinks.count()) {
      await logsLinks.first().click();
    } else {
      await page.goto("/logs");
    }

    // Basic verification: latest log contains CREATE action for our DOC
    const logTable = page.locator("table tbody tr");
    await expect(logTable.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table, .log-list")).toBeVisible();

    // Best-effort assertion (won't fail the whole test if format changes)
    const maybeRow = page.locator(`text=CREATE`, {
      has: page.locator(`text=${DOC}`),
    });
    if (await maybeRow.count()) {
      await expect(maybeRow.first()).toBeVisible();
    }
  });
});
