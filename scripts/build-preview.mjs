/**
 * Arma un archivo HTML único y autocontenido con todas las pantallas
 * capturadas, navegable sin servidor ni base de datos.
 *
 * El CSS de la app se incrusta tal cual, dentro de sus capas. La chapa del
 * visor va sin capa y con prefijo `pv-`, así gana el cascade sin pisar ninguna
 * clase de Tailwind.
 */
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(".screenshots/captured.json", "utf8"));

/** Ruta → id de pantalla, para reescribir los links internos. */
const routeToId = new Map(data.pages.map((p) => [p.url, p.id]));

function rewriteLinks(html) {
  return html.replace(/href="(\/[^"]*)"/g, (match, href) => {
    const id = routeToId.get(href);
    if (id) return `href="#${id}"`;
    // Rutas capturadas sin querystring: /directorio?x=1 cae en /directorio.
    const base = href.split("?")[0];
    const baseId = routeToId.get(base);
    if (baseId) return `href="#${baseId}" data-approx="${href}"`;
    return `href="#" data-uncaptured="${href}"`;
  });
}

/**
 * Los breakpoints de Tailwind responden al viewport, no al ancho del marco.
 * Dentro de un marco de 412px en una pantalla grande, `lg:grid-cols-3` se
 * activaría igual y la vista de celular mostraría tres columnas. Sacando las
 * variantes responsive del markup queda fija la versión móvil, que es la que
 * el marco promete.
 */
function lockMobileLayout(html) {
  return html.replace(/class="([^"]*)"/g, (match, value) => {
    const kept = value
      .split(/\s+/)
      .filter((token) => token && !/^(sm|md|lg|xl|2xl):/.test(token));
    return `class="${kept.join(" ")}"`;
  });
}

const pages = data.pages.map((p) => ({
  ...p,
  html: rewriteLinks(p.frame === "phone" ? lockMobileLayout(p.html) : p.html),
}));

// `<` escapado para que ningún `</script>` del markup capturado corte el bloque;
// U+2028/29 escapados porque son saltos de línea válidos en JS pero no en JSON.
const payload = JSON.stringify({ capturedAt: data.capturedAt, pages })
  .replace(/</g, "\\u003c")
  .replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

const capturedLabel = new Intl.DateTimeFormat("es-PA", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Panama",
}).format(new Date(data.capturedAt));

const groups = [...new Set(pages.map((p) => p.group))];

const rail = groups
  .map(
    (group) => `
      <div class="pv-group">
        <p class="pv-group-name">${group}</p>
        <ul class="pv-list">
          ${pages
            .filter((p) => p.group === group)
            .map(
              (p) => `<li>
                <button type="button" class="pv-item" data-target="${p.id}">
                  <span class="pv-item-title">${p.title}</span>
                  <span class="pv-item-route">${p.url}</span>
                </button>
              </li>`,
            )
            .join("")}
        </ul>
      </div>`,
  )
  .join("");

const html = `<title>KosherOnDemand</title>
<style>
/* ------------------------------------------------------------------ */
/* CSS real de la app, tal como lo emite el build.                      */
/* Vive dentro de @layer, así que la chapa del visor (sin capa) gana.   */
/* ------------------------------------------------------------------ */
${data.css}
</style>

<style>
/* ------------------------------------------------------------------ */
/* Chapa del visor. Todo con prefijo pv- para no chocar con Tailwind.  */
/* ------------------------------------------------------------------ */
:root {
  --pv-ground: #e8eae5;
  --pv-surface: #ffffff;
  --pv-surface-2: #f3f5f1;
  --pv-ink: #1a1d1b;
  --pv-muted: #5e6660;
  --pv-line: #d2d7d0;
  --pv-accent: #0f7f68;
  --pv-accent-soft: #d9efe8;
  --pv-shadow: 0 1px 2px rgba(20, 26, 22, 0.06), 0 8px 24px rgba(20, 26, 22, 0.06);
  --pv-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --pv-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --pv-rail: 16.5rem;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --pv-ground: #14171a;
    --pv-surface: #1d2125;
    --pv-surface-2: #232830;
    --pv-ink: #e7eae7;
    --pv-muted: #97a09a;
    --pv-line: #2c3239;
    --pv-accent: #3dbc9a;
    --pv-accent-soft: #123029;
    --pv-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35);
  }
}

:root[data-theme="dark"] {
  --pv-ground: #14171a;
  --pv-surface: #1d2125;
  --pv-surface-2: #232830;
  --pv-ink: #e7eae7;
  --pv-muted: #97a09a;
  --pv-line: #2c3239;
  --pv-accent: #3dbc9a;
  --pv-accent-soft: #123029;
  --pv-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35);
}

html body.pv-body {
  margin: 0;
  min-height: 100dvh;
  background: var(--pv-ground);
  color: var(--pv-ink);
  font-family: var(--pv-sans);
  -webkit-font-smoothing: antialiased;
}

.pv-shell {
  display: grid;
  grid-template-columns: var(--pv-rail) minmax(0, 1fr);
  min-height: 100dvh;
}

/* --- Rail ---------------------------------------------------------- */
.pv-rail {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
  background: var(--pv-surface);
  border-right: 1px solid var(--pv-line);
}

.pv-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.pv-brand-mark {
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 0.5rem;
  background: var(--pv-accent);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.pv-brand-name {
  font-size: 0.9375rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.pv-brand-sub {
  display: block;
  font-family: var(--pv-mono);
  font-size: 0.6875rem;
  color: var(--pv-muted);
  letter-spacing: 0.02em;
}

.pv-group { display: flex; flex-direction: column; gap: 0.5rem; }

.pv-group-name {
  margin: 0;
  font-family: var(--pv-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--pv-muted);
}

.pv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.pv-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  padding: 0.4375rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.pv-item:hover { background: var(--pv-surface-2); }

.pv-item[aria-current="true"] {
  background: var(--pv-accent-soft);
  box-shadow: inset 2px 0 0 var(--pv-accent);
}

.pv-item-title { font-size: 0.8125rem; font-weight: 550; }

.pv-item-route {
  font-family: var(--pv-mono);
  font-size: 0.6875rem;
  color: var(--pv-muted);
  overflow-wrap: anywhere;
}

.pv-item[aria-current="true"] .pv-item-route { color: var(--pv-accent); }

.pv-note {
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--pv-line);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--pv-muted);
}

.pv-note strong { color: var(--pv-ink); font-weight: 600; }

/* --- Stage --------------------------------------------------------- */
.pv-main { display: flex; flex-direction: column; min-width: 0; }

.pv-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1rem;
  padding: 0.875rem 1.5rem;
  background: color-mix(in srgb, var(--pv-ground) 88%, transparent);
  border-bottom: 1px solid var(--pv-line);
}

.pv-topbar-title { margin: 0; font-size: 0.9375rem; font-weight: 600; }

.pv-topbar-route {
  font-family: var(--pv-mono);
  font-size: 0.75rem;
  color: var(--pv-muted);
}

.pv-tag {
  margin-left: auto;
  font-family: var(--pv-mono);
  font-size: 0.6875rem;
  color: var(--pv-muted);
  border: 1px solid var(--pv-line);
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
}

.pv-stage {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 1.75rem 1.5rem 3rem;
  overflow-x: auto;
}

/* El contenido capturado es de tema claro: se le da su propio fondo para
   que no herede el del visor cuando el lector está en oscuro. */
.pv-canvas {
  background: #faf9f7;
  color: #1a1713;
  color-scheme: light;
}

.pv-canvas--phone {
  width: 412px;
  flex: 0 0 412px;
  border: 1px solid var(--pv-line);
  border-radius: 1.75rem;
  box-shadow: var(--pv-shadow);
  overflow: hidden;
}

.pv-canvas--desktop {
  width: 100%;
  max-width: 78rem;
  border: 1px solid var(--pv-line);
  border-radius: 0.875rem;
  box-shadow: var(--pv-shadow);
  overflow: hidden;
}

/* Los links a rutas no capturadas no llevan a ningún lado. */
.pv-canvas [data-uncaptured] { cursor: not-allowed; }

.pv-toast {
  position: fixed;
  left: 50%;
  bottom: 1.5rem;
  transform: translateX(-50%) translateY(0.5rem);
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  background: var(--pv-ink);
  color: var(--pv-ground);
  font-size: 0.8125rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 50;
}

.pv-toast[data-show="true"] { opacity: 1; transform: translateX(-50%) translateY(0); }

.pv-skip {
  position: absolute;
  left: -9999px;
}
.pv-skip:focus {
  left: 1rem;
  top: 1rem;
  z-index: 60;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  background: var(--pv-accent);
  color: #fff;
}

:focus-visible {
  outline: 2px solid var(--pv-accent);
  outline-offset: 2px;
}

@media (max-width: 60rem) {
  .pv-shell { grid-template-columns: 1fr; }
  .pv-rail {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--pv-line);
  }
  .pv-canvas--phone { flex: 0 0 auto; max-width: 100%; }
  .pv-stage { padding-inline: 1rem; }
}

@media (prefers-reduced-motion: reduce) {
  .pv-toast { transition: none; }
}
</style>

<body class="pv-body">
  <a class="pv-skip" href="#pv-stage">Saltar a la pantalla</a>

  <div class="pv-shell">
    <nav class="pv-rail" aria-label="Pantallas">
      <div class="pv-brand">
        <span class="pv-brand-mark" aria-hidden="true">K</span>
        <span>
          <span class="pv-brand-name">KosherOnDemand</span>
          <span class="pv-brand-sub">MVP Fase 1</span>
        </span>
      </div>

      ${rail}

      <p class="pv-note">
        <strong>Captura estática del build real.</strong> Es el HTML y el CSS que emite
        la app, no un maquetado aparte. Los botones de pedido abren el aviso de salida
        pero no salen a WhatsApp, y los formularios no envían nada.
        <br /><br />
        Comercios de demostración, marcados <code>[DEMO]</code>. No existen.
        <br /><br />
        Capturado el ${capturedLabel} (hora de Panamá). El estado
        abierto/cerrado es el que calculó el servidor en ese momento.
      </p>
    </nav>

    <div class="pv-main">
      <header class="pv-topbar">
        <h1 class="pv-topbar-title" id="pv-title">Inicio</h1>
        <span class="pv-topbar-route" id="pv-route">/</span>
        <span class="pv-tag" id="pv-frame">celular · 412px</span>
      </header>

      <main class="pv-stage" id="pv-stage" tabindex="-1">
        <div class="pv-canvas pv-canvas--phone" id="pv-canvas"></div>
      </main>
    </div>
  </div>

  <div class="pv-toast" id="pv-toast" role="status" aria-live="polite"></div>

  <script type="application/json" id="pv-data">${payload}</script>

  <script>
    (function () {
      "use strict";

      var data = JSON.parse(document.getElementById("pv-data").textContent);
      var byId = {};
      data.pages.forEach(function (p) { byId[p.id] = p; });

      var canvas = document.getElementById("pv-canvas");
      var stage = document.getElementById("pv-stage");
      var titleEl = document.getElementById("pv-title");
      var routeEl = document.getElementById("pv-route");
      var frameEl = document.getElementById("pv-frame");
      var toastEl = document.getElementById("pv-toast");
      var items = Array.prototype.slice.call(document.querySelectorAll(".pv-item"));

      var toastTimer;
      function toast(message) {
        toastEl.textContent = message;
        toastEl.setAttribute("data-show", "true");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
          toastEl.removeAttribute("data-show");
        }, 2600);
      }

      function show(id, keepScroll) {
        var page = byId[id];
        if (!page) return;

        canvas.className =
          "pv-canvas " + (page.frame === "phone" ? "pv-canvas--phone" : "pv-canvas--desktop");
        canvas.innerHTML = page.html;

        titleEl.textContent = page.title;
        routeEl.textContent = page.url;
        frameEl.textContent = page.frame === "phone" ? "celular · 412px" : "escritorio";

        items.forEach(function (item) {
          item.setAttribute("aria-current", item.dataset.target === id ? "true" : "false");
        });

        if (!keepScroll) window.scrollTo({ top: 0, behavior: "auto" });
        if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
      }

      items.forEach(function (item) {
        item.addEventListener("click", function () { show(item.dataset.target); });
      });

      // --- Interacciones dentro de la pantalla capturada ---------------
      canvas.addEventListener("click", function (event) {
        var link = event.target.closest("a");

        // El aviso antes de salir: se abre de verdad, pero no navega.
        if (link && link.hasAttribute("data-uncaptured")) {
          var target = link.getAttribute("data-uncaptured") || "";
          event.preventDefault();
          if (target.indexOf("/ir") === 0) {
            var dialog = canvas.querySelector("dialog");
            if (dialog && typeof dialog.showModal === "function") {
              dialog.showModal();
              return;
            }
          }
          toast("Pantalla no capturada: " + target);
          return;
        }

        if (link && link.hasAttribute("data-approx")) {
          toast("Se muestra " + link.getAttribute("href").slice(1) + " sin los filtros");
          return;
        }

        if (link && link.getAttribute("href") && link.getAttribute("href").charAt(0) === "#") {
          var id = link.getAttribute("href").slice(1);
          if (byId[id]) { event.preventDefault(); show(id); }
          return;
        }

        if (link && /^(https?|tel|mailto):/.test(link.getAttribute("href") || "")) {
          event.preventDefault();
          toast("Salida externa: " + link.getAttribute("href"));
          return;
        }

        // Botones del aviso de salida.
        var button = event.target.closest("button");
        if (button) {
          var openDialog = canvas.querySelector("dialog[open]");
          if (openDialog) {
            event.preventDefault();
            if (/continuar/i.test(button.textContent || "")) {
              openDialog.close();
              toast("En la app real, acá se abre WhatsApp con el mensaje ya escrito");
            } else {
              openDialog.close();
            }
          }
        }
      });

      canvas.addEventListener("submit", function (event) {
        event.preventDefault();
        toast("Los formularios no envían nada en esta vista estática");
      });

      // --- Teclado ------------------------------------------------------
      document.addEventListener("keydown", function (event) {
        if (event.target.closest("input, textarea, select")) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        var index = items.findIndex(function (item) {
          return item.getAttribute("aria-current") === "true";
        });
        if (index < 0) return;
        var next = event.key === "ArrowDown" ? index + 1 : index - 1;
        if (next < 0 || next >= items.length) return;
        event.preventDefault();
        show(items[next].dataset.target);
        items[next].focus();
      });

      window.addEventListener("hashchange", function () {
        var id = location.hash.slice(1);
        if (byId[id]) show(id, true);
      });

      var initial = location.hash.slice(1);
      show(byId[initial] ? initial : data.pages[0].id, true);
    })();
  </script>
</body>
`;

writeFileSync(".screenshots/preview.html", html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`preview.html → ${kb} KB, ${pages.length} pantallas`);
