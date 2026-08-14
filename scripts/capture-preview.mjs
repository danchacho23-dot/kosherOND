/**
 * Captura las páginas ya renderizadas por el build real y las guarda como un
 * espejo estático, para poder navegarlas sin base de datos ni servidor.
 *
 * No es un rediseño: es el HTML y el CSS que produce la app, con los scripts
 * quitados.
 */
import { chromium, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3100";

const PAGES = [
  { id: "home", url: "/", title: "Inicio", group: "Público", frame: "phone" },
  { id: "directorio", url: "/directorio", title: "Directorio", group: "Público", frame: "phone" },
  {
    id: "directorio-abierto",
    url: "/directorio?abierto=1",
    title: "Directorio · abierto ahora",
    group: "Público",
    frame: "phone",
  },
  {
    id: "directorio-categoria",
    url: "/directorio?categoria=carniceria",
    title: "Directorio · carnicerías",
    group: "Público",
    frame: "phone",
  },
  {
    id: "busqueda",
    url: "/directorio?q=carniceria",
    title: "Búsqueda «carniceria»",
    group: "Público",
    frame: "phone",
  },
  {
    id: "vacio",
    url: "/directorio?q=zzzzz",
    title: "Búsqueda sin resultados",
    group: "Público",
    frame: "phone",
  },
  {
    id: "comercio-supervisado",
    url: "/comercio/demo-carniceria-hamaor",
    title: "Comercio con supervisión",
    group: "Público",
    frame: "phone",
  },
  {
    id: "comercio-abierto",
    url: "/comercio/demo-restaurante-tavlin",
    title: "Comercio abierto ahora",
    group: "Público",
    frame: "phone",
  },
  {
    id: "comercio-sin-supervision",
    url: "/comercio/demo-panaderia-shalom",
    title: "Comercio sin supervisión",
    group: "Público",
    frame: "phone",
  },
  { id: "aplicar", url: "/aplicar", title: "Sumá tu comercio", group: "Público", frame: "phone" },
  { id: "terminos", url: "/legal/terminos", title: "Términos", group: "Público", frame: "phone" },
  {
    id: "privacidad",
    url: "/legal/privacidad",
    title: "Privacidad",
    group: "Público",
    frame: "phone",
  },
  {
    id: "login",
    url: "/admin/login",
    title: "Entrar al panel",
    group: "Panel",
    frame: "desktop",
    admin: false,
  },
  { id: "admin", url: "/admin", title: "Resumen", group: "Panel", frame: "desktop", admin: true },
  {
    id: "admin-solicitudes",
    url: "/admin/solicitudes",
    title: "Cola de solicitudes",
    group: "Panel",
    frame: "desktop",
    admin: true,
  },
  {
    id: "admin-comercios",
    url: "/admin/comercios",
    title: "Comercios",
    group: "Panel",
    frame: "desktop",
    admin: true,
  },
  {
    id: "admin-metricas",
    url: "/admin/metricas",
    title: "Métricas",
    group: "Panel",
    frame: "desktop",
    admin: true,
  },
  {
    id: "admin-categorias",
    url: "/admin/categorias",
    title: "Categorías",
    group: "Panel",
    frame: "desktop",
    admin: true,
  },
  {
    id: "admin-auditoria",
    url: "/admin/auditoria",
    title: "Auditoría",
    group: "Panel",
    frame: "desktop",
    admin: true,
  },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const publicCtx = await browser.newContext({
  ...devices["Pixel 7"],
  locale: "es-PA",
  timezoneId: "America/Panama",
});
const adminCtx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "es-PA",
  timezoneId: "America/Panama",
  storageState: "tests/e2e/.auth/admin.json",
});

const cssHrefs = new Set();
const captured = [];

for (const spec of PAGES) {
  const ctx = spec.admin ? adminCtx : spec.frame === "desktop" ? adminCtx : publicCtx;
  const page = await ctx.newPage();
  await page.goto(BASE + spec.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);

  for (const href of await page.$$eval('link[rel="stylesheet"]', (nodes) =>
    nodes.map((n) => n.getAttribute("href")),
  )) {
    if (href) cssHrefs.add(href);
  }

  // Se quitan los scripts y los marcadores internos de Next: lo que queda es
  // markup puro que se puede volver a montar en cualquier lado.
  const html = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone
      .querySelectorAll('script, template, next-route-announcer, [id^="__next"], noscript')
      .forEach((n) => n.remove());
    clone.querySelectorAll("[data-next-hide-fouc]").forEach((n) => n.remove());
    return clone.innerHTML;
  });

  captured.push({ ...spec, html });
  console.log("✓", spec.id, `(${(html.length / 1024).toFixed(0)} KB)`);
  await page.close();
}

let css = "";
for (const href of cssHrefs) {
  const res = await fetch(BASE + href);
  css += `\n/* ${href} */\n` + (await res.text());
}
console.log(`CSS: ${(css.length / 1024).toFixed(0)} KB de ${cssHrefs.size} archivo(s)`);

writeFileSync(
  ".screenshots/captured.json",
  JSON.stringify({ capturedAt: new Date().toISOString(), css, pages: captured }),
);

await browser.close();
console.log("listo →", ".screenshots/captured.json");
