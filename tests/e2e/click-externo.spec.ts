import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Camino 3: la salida hacia el comercio.
 *
 * Dos cosas tienen que pasar sí o sí: el cliente ve el aviso de que sigue el
 * pedido por fuera, y el click queda registrado. Ese registro es lo que después
 * dice a qué comercio le conviene el pedido nativo.
 */
test("el click a WhatsApp avisa, sale con atribución y queda registrado", async ({ page }) => {
  const merchant = await prisma.merchant.findUniqueOrThrow({
    where: { slug: "demo-carniceria-hamaor" },
  });

  const before = await prisma.analyticsEvent.count({
    where: { type: "WHATSAPP_CLICK", merchantId: merchant.id },
  });

  // WhatsApp no se abre de verdad: se intercepta para poder afirmar sobre la URL.
  let whatsappUrl: string | null = null;
  await page.route("https://wa.me/**", async (route) => {
    whatsappUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" });
  });

  await page.goto(`/comercio/${merchant.slug}`);

  await page.getByRole("link", { name: "Pedir por WhatsApp" }).click();

  // Antes de salir, el aviso.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Vas a continuar tu pedido directamente con el comercio");

  // Cancelar no navega ni registra nada.
  await dialog.getByRole("button", { name: "Volver" }).click();
  await expect(dialog).toBeHidden();
  expect(whatsappUrl).toBeNull();

  // Confirmar sí.
  await page.getByRole("link", { name: "Pedir por WhatsApp" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();

  await expect.poll(() => whatsappUrl, { timeout: 15_000 }).not.toBeNull();

  const url = new URL(whatsappUrl!);
  expect(url.host).toBe("wa.me");
  expect(url.pathname).toBe(`/507${merchant.phone}`);

  const text = url.searchParams.get("text") ?? "";
  expect(text).toContain(merchant.name);
  // Identificador corto de origen: el comercio sabe de dónde vino el pedido.
  expect(text).toContain(merchant.publicId);

  await expect
    .poll(
      () =>
        prisma.analyticsEvent.count({
          where: { type: "WHATSAPP_CLICK", merchantId: merchant.id },
        }),
      { timeout: 15_000 },
    )
    .toBe(before + 1);
});

test("un canal que el comercio no habilitó no abre nada", async ({ page }) => {
  const merchant = await prisma.merchant.findUniqueOrThrow({
    where: { slug: "demo-carniceria-hamaor" },
  });
  expect(merchant.orderChannels).not.toContain("WEBSITE");

  // Aunque se arme la URL a mano, vuelve a la ficha del comercio.
  await page.goto(`/ir?m=${merchant.publicId}&c=WEBSITE`);
  await expect(page).toHaveURL(new RegExp(`/comercio/${merchant.slug}$`));
});
