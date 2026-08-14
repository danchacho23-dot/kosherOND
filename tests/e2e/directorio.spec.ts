import { expect, test } from "@playwright/test";

/**
 * Camino 1: descubrimiento. Si el directorio no filtra ni busca, el producto
 * no sirve para nada.
 */
test.describe("Directorio", () => {
  test("navega, filtra y busca comercios", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Comercios kosher en Panamá/i })).toBeVisible();

    // Desde la home hacia el directorio completo.
    await page.getByRole("link", { name: "Directorio", exact: true }).first().click();
    await expect(page).toHaveURL(/\/directorio/);

    const results = page.locator("article");
    await expect(results.first()).toBeVisible();
    const total = await results.count();
    expect(total).toBeGreaterThan(1);

    // Filtro por categoría: quedan menos comercios que en el total.
    await page.getByLabel("Categoría").selectOption("panaderia");
    await expect(page).toHaveURL(/categoria=panaderia/);
    await expect(results).toHaveCount(1);
    await expect(page.getByText("Panadería Shalom")).toBeVisible();

    // Limpiar filtros devuelve el listado completo.
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(results).toHaveCount(total);

    // El chip de "abierto ahora" filtra sin recargar la página entera.
    await page.getByRole("button", { name: "Abierto ahora" }).click();
    await expect(page).toHaveURL(/abierto=1/);

    // Búsqueda sin acentos: "carniceria" tiene que encontrar "Carnicería".
    await page.goto("/directorio");
    await page.getByRole("searchbox", { name: /Buscar comercios/i }).fill("carniceria");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/q=carniceria/);
    await expect(results).toHaveCount(1);
    await expect(page.getByText(/Carnicería HaMaor/)).toBeVisible();

    // Una búsqueda sin resultados muestra el estado vacío, no una lista rota.
    await page.goto("/directorio?q=zzzzznoexiste");
    await expect(page.getByText("No encontramos comercios con esos filtros.")).toBeVisible();
    await expect(results).toHaveCount(0);
  });

  test("la ficha del comercio muestra horario y estado calculado en servidor", async ({
    page,
  }) => {
    await page.goto("/comercio/demo-panaderia-shalom");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Panadería Shalom");
    await expect(page.getByRole("heading", { name: "Horarios" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Continuar el pedido" })).toBeVisible();

    // El sábado nunca tiene horario cargado: el comercio cierra por Shabat.
    const sabado = page.getByRole("row").filter({ hasText: "Sábado" });
    await expect(sabado).toContainText("Cerrado hoy");

    // Aviso de que no somos parte de la transacción.
    await expect(page.getByText(/no procesa el pedido ni el pago/i).first()).toBeVisible();
  });
});

/**
 * Producto mobile-first: ninguna página puede forzar scroll horizontal.
 *
 * Este test existe porque el header lo hacía en TODOS los anchos de teléfono, y
 * no se veía en las capturas de página completa (que se expanden al ancho del
 * contenido, y por eso lo tapan).
 */
test.describe("Sin desborde horizontal", () => {
  const ANCHOS = [320, 360, 390, 412];
  const RUTAS = ["/", "/directorio", "/comercio/demo-panaderia-shalom", "/aplicar"];

  for (const width of ANCHOS) {
    test(`a ${width}px de ancho`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      for (const ruta of RUTAS) {
        await page.goto(ruta);
        const medidas = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(
          medidas.scroll,
          `${ruta} desborda ${medidas.scroll - medidas.client}px a ${width}px de ancho`,
        ).toBeLessThanOrEqual(medidas.client);
      }
    });
  }
});
