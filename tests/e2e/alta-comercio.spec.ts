import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { AUTH_STATE_PATH } from "./global-setup";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Camino 2: alta de comercio con aprobación de admin.
 *
 * Es el camino que llena el catálogo. Va de punta a punta: formulario público
 * como invitado, cola de aprobación como admin, y la página pública viva.
 */
test("un comercio aplica, el admin aprueba y la página queda publicada", async ({
  page,
  browser,
}) => {
  const nombre = `Quesos del Istmo ${Date.now()}`;

  // --- 1. El comercio aplica, sin cuenta ---------------------------------
  await page.goto("/aplicar");
  await expect(page.getByRole("heading", { name: /Sumá tu comercio/i })).toBeVisible();

  await page.getByLabel("Nombre público").fill(nombre);
  await page.getByLabel("Razón social").fill("Quesos del Istmo S.A.");
  await page.getByLabel("Categoría").selectOption("supermercado");
  await page.getByLabel("Descripción").fill("Quesos frescos y madurados, corte diario.");

  await page.getByLabel("Responsable").fill("Rivka Pérez");
  await page.getByLabel("Teléfono").fill("60001234");
  // Por rol: "WhatsApp" como subcadena también matchea el checkbox de canal.
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("60001234");
  await page.getByLabel("Email").fill("alta.e2e@example.test");

  await page.getByLabel("Barrio").selectOption("obarrio");
  await page.getByLabel("Dirección").fill("Calle 55 Este, local 3");

  await page.getByLabel(/represento a este comercio/i).check();
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page.getByText("Recibimos tu solicitud")).toBeVisible();
  const codigo = await page.locator("span.font-mono").first().textContent();
  expect(codigo?.trim()).toHaveLength(8);

  const application = await prisma.merchantApplication.findFirstOrThrow({
    where: { name: nombre },
  });
  expect(application.status).toBe("SUBMITTED");

  // --- 2. El admin la revisa y la aprueba --------------------------------
  const adminContext = await browser.newContext({ storageState: AUTH_STATE_PATH });
  const adminPage = await adminContext.newPage();

  await adminPage.goto("/admin/solicitudes");
  await expect(adminPage.getByRole("heading", { name: "Solicitudes" })).toBeVisible();
  await expect(adminPage.getByText(nombre)).toBeVisible();

  await adminPage.goto(`/admin/solicitudes/${application.id}`);
  await expect(adminPage.getByRole("heading", { level: 1 })).toContainText(nombre);

  adminPage.once("dialog", (dialog) => dialog.accept());
  await adminPage.getByRole("button", { name: "Aprobar y publicar" }).click();

  // La aprobación redirige a la ficha del comercio recién creado.
  await adminPage.waitForURL(/\/admin\/comercios\/.+/);

  const merchant = await prisma.merchant.findFirstOrThrow({ where: { name: nombre } });
  expect(merchant.status).toBe("APPROVED");

  const refreshed = await prisma.merchantApplication.findUniqueOrThrow({
    where: { id: application.id },
  });
  expect(refreshed.status).toBe("APPROVED");
  expect(refreshed.merchantId).toBe(merchant.id);

  // La acción queda en la auditoría: actor, objeto y cambio.
  const logEntry = await prisma.adminActionLog.findFirstOrThrow({
    where: { action: "application.approve", entityId: application.id },
  });
  expect(logEntry.actorEmail).toBe("admin.e2e@kosherondemand.test");

  await adminContext.close();

  // --- 3. Ya se ve en el directorio público ------------------------------
  await page.goto(`/comercio/${merchant.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(nombre);

  // Sin verificación de admin, la página no dice NADA sobre supervisión kosher.
  await expect(page.getByRole("heading", { name: "Supervisión kosher" })).toHaveCount(0);

  await page.goto("/directorio?categoria=supermercado");
  await expect(page.getByText(nombre)).toBeVisible();
});

test("el formulario no acepta una solicitud incompleta", async ({ page }) => {
  await page.goto("/aplicar");

  await page.getByLabel("Nombre público").fill("Sin consentimiento");
  await page.getByLabel("Razón social").fill("Sin consentimiento S.A.");
  await page.getByLabel("Categoría").selectOption("supermercado");
  await page.getByLabel("Responsable").fill("Alguien");
  await page.getByLabel("Teléfono").fill("60009999");
  await page.getByLabel("Email").fill("sin.consentimiento@example.test");
  await page.getByLabel("Barrio").selectOption("obarrio");
  await page.getByLabel("Dirección").fill("Una dirección cualquiera 123");

  // Falta tildar el consentimiento.
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page.getByText(/Revisá los campos marcados/i).first()).toBeVisible();
  expect(
    await prisma.merchantApplication.count({ where: { name: "Sin consentimiento" } }),
  ).toBe(0);
});
