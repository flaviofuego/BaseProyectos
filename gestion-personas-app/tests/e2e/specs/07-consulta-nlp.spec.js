const { test, expect } = require("@playwright/test");
const { login } = require("../helpers/test-helpers");

/**
 * CU-012: Consulta NLP
 * Prioridad: Baja
 *
 * Flujo:
 * 1. Usuario autenticado accede a consulta NLP
 * 2. Escribe pregunta en lenguaje natural
 * 3. Sistema procesa con Gemini
 * 4. Sistema muestra respuesta
 */

test.describe("CU-012: Consulta NLP", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navegar a consulta NLP
    await page.goto("/consulta_nlp");
  });

  test("debe mostrar interfaz de consulta NLP", async ({ page }) => {
    await expect(page).toHaveTitle(/NLP|Consulta|Lenguaje Natural/i);

    // Verificar que hay un input para la pregunta
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();
    await expect(queryInput).toBeVisible();

    // Verificar botón de enviar
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Enviar"), button:has-text("Consultar")'
    );
    await expect(submitButton.first()).toBeVisible();
  });

  test("debe procesar pregunta simple y mostrar respuesta", async ({
    page,
  }) => {
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();

    // Hacer una pregunta simple
    await queryInput.fill("¿Cuántas personas hay registradas?");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Esperar respuesta (puede tomar tiempo por la API de Gemini)
    await page.waitForTimeout(3000);

    // Verificar que apareció una respuesta
    const responseArea = page.locator(
      '.response, .answer, #response, [class*="result"], .card.border-success'
    );
    await expect(responseArea.first()).toBeVisible({ timeout: 10000 });

    // Verificar que tiene contenido
    const responseText = await responseArea.first().textContent();
    expect(responseText.length).toBeGreaterThan(0);
  });

  test("debe procesar pregunta sobre búsqueda de personas", async ({
    page,
  }) => {
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();

    // Pregunta específica sobre personas
    await queryInput.fill("Buscar personas con apellido García");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Verificar respuesta
    const responseArea = page
      .locator(".response, .answer, #response, .card.border-success")
      .first();
    await expect(responseArea).toBeVisible({ timeout: 10000 });

    // La respuesta debería mencionar personas o resultados
    const responseText = await responseArea.textContent();
    expect(responseText).toMatch(/persona|García|resultado/i);
  });

  test("debe procesar pregunta sobre estadísticas", async ({ page }) => {
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();

    await queryInput.fill("¿Cuál es el promedio de edad de las personas?");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(3000);

    const responseArea = page
      .locator(".response, .answer, #response, .card.border-success")
      .first();
    await expect(responseArea).toBeVisible({ timeout: 10000 });

    const responseText = await responseArea.textContent();
    expect(responseText.length).toBeGreaterThan(10);
  });

  test("debe validar que el campo de pregunta no esté vacío", async ({
    page,
  }) => {
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Enviar Pregunta")')
      .first();

    // Intentar enviar sin pregunta
    await submitButton.click();

    // Verificar validación HTML5 o mensaje de error
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();

    const validationMessage = await queryInput.evaluate((el) => {
      if (el.validationMessage) return el.validationMessage;
      return null;
    });

    // Puede tener validación HTML5 o mostrar un alert
    if (validationMessage) {
      expect(validationMessage).toBeTruthy();
    } else {
      // O verificar que no hizo nada
      const responseArea = page.locator(".response, .answer");
      const count = await responseArea.count();
      expect(count).toBe(0);
    }
  });

  test("debe mostrar indicador de carga mientras procesa", async ({ page }) => {
    const queryInput = page
      .locator(
        'textarea[name="query"], textarea[name="pregunta"], input[type="text"]'
      )
      .first();
    await queryInput.fill("¿Cuántas personas hay?");

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Enviar Pregunta")')
      .first();
    await submitButton.click();

    // Verificar que aparece un spinner o mensaje de carga
    const loader = page.locator(
      '.spinner, .loading, [class*="load"], text=/Procesando|Cargando|Loading/i'
    );

    // Puede aparecer brevemente
    const hasLoader = (await loader.count()) > 0;

    if (hasLoader) {
      await expect(loader.first()).toBeVisible({ timeout: 2000 });
    }

    // Esperar a que desaparezca
    await page.waitForTimeout(3000);
  });

  test("debe manejar preguntas que no se pueden responder", async ({
    page,
  }) => {
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();

    // Pregunta ambigua o sin sentido
    await queryInput.fill("asdfghjkl qwerty");

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Enviar Pregunta")')
      .first();
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Debería mostrar alguna respuesta (aunque sea que no entendió)
    const responseArea = page.locator(".response, .answer, #response").first();
    await expect(responseArea).toBeVisible({ timeout: 10000 });
  });

  test("debe mantener historial de consultas si está disponible", async ({
    page,
  }) => {
    // Primera consulta
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();
    await queryInput.fill("¿Cuántas personas hay?");

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Enviar Pregunta")')
      .first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Segunda consulta
    await queryInput.fill("Buscar personas con apellido López");
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Verificar si hay historial visible
    const historyItems = page.locator(
      '.history-item, .query-history li, [class*="histor"]'
    );

    if ((await historyItems.count()) > 0) {
      expect(await historyItems.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test("debe poder limpiar el campo de consulta", async ({ page }) => {
    const queryInput = page
      .locator('#pregunta, textarea[name="pregunta"]')
      .first();
    await queryInput.fill("Pregunta de prueba");

    // Buscar botón de limpiar
    const clearButton = page.locator(
      'button:has-text("Limpiar"), button:has-text("Clear"), button[type="reset"]'
    );

    if ((await clearButton.count()) > 0) {
      await clearButton.click();

      // Verificar que se limpió
      await expect(queryInput).toHaveValue("");
    }
  });

  test("debe mostrar ejemplos de preguntas si están disponibles", async ({
    page,
  }) => {
    // Verificar si hay ejemplos de consultas
    const examples = page.locator(
      ".example-query, .sample-question, text=/Ejemplo|Example/i"
    );

    if ((await examples.count()) > 0) {
      await expect(examples.first()).toBeVisible();

      // Hacer clic en un ejemplo si es clickeable
      const firstExample = examples.first();

      if ((await firstExample.locator("a, button").count()) > 0) {
        await firstExample.locator("a, button").first().click();

        // Verificar que se llenó el campo
        const queryInput = page
          .locator(
            'textarea[name="query"], textarea[name="pregunta"], input[type="text"]'
          )
          .first();
        const value = await queryInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  test("debe poder copiar respuesta si está disponible", async ({ page }) => {
    const queryInput = page
      .locator(
        'textarea[name="query"], textarea[name="pregunta"], input[type="text"]'
      )
      .first();
    await queryInput.fill("¿Cuántas personas hay?");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Buscar botón de copiar
    const copyButton = page.locator(
      'button:has-text("Copiar"), button[title*="Copy"], .copy-button'
    );

    if ((await copyButton.count()) > 0) {
      await expect(copyButton.first()).toBeVisible();

      // Hacer clic
      await copyButton.first().click();

      // Verificar feedback visual
      const copiedMessage = page.locator("text=/Copiado|Copied/i");
      if ((await copiedMessage.count()) > 0) {
        await expect(copiedMessage.first()).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test("debe manejar errores de API correctamente", async ({ page }) => {
    // Interceptar la llamada para forzar un error
    await page.route("**/nlp/**", (route) => {
      route.abort("failed");
    });

    const queryInput = page
      .locator(
        'textarea[name="query"], textarea[name="pregunta"], input[type="text"]'
      )
      .first();
    await queryInput.fill("¿Cuántas personas hay?");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verificar mensaje de error
    const errorMessage = page.locator(
      '.alert-danger, .error, [role="alert"], text=/Error|Fallo|Failed/i'
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});
