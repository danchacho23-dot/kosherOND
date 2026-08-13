/**
 * Verifica la configuración de entorno antes de un deploy.
 *
 * No reemplaza a los gates de lanzamiento (ver DEPLOYMENT.md): solo responde
 * "¿están las variables que hacen falta y son coherentes entre sí?".
 *
 * Uso: npm run check:env
 */
import { getEnv, adminEmails, siteUrl } from "../src/lib/env";
import { isStorageConfigured } from "../src/lib/storage";

const OK = "✓";
const WARN = "!";
const FAIL = "✗";

let hasError = false;
let hasWarning = false;

function fail(message: string) {
  hasError = true;
  console.error(`${FAIL} ${message}`);
}

function warn(message: string) {
  hasWarning = true;
  console.warn(`${WARN} ${message}`);
}

function ok(message: string) {
  console.log(`${OK} ${message}`);
}

console.log("Verificando el entorno…\n");

// --- Obligatorias -----------------------------------------------------------
try {
  getEnv();
  ok("Variables obligatorias presentes (DATABASE_URL, AUTH_SECRET, ADMIN_EMAILS)");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const admins = adminEmails();
if (admins.length === 0) {
  fail("ADMIN_EMAILS está vacía: nadie puede entrar al panel");
} else {
  ok(`${admins.length} administrador(es) autorizado(s): ${admins.join(", ")}`);
}

// --- Producción -------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

const url = siteUrl();
if (url.startsWith("http://localhost")) {
  if (isProduction) {
    fail("NEXT_PUBLIC_SITE_URL no está definida: los emails y el sitemap van a apuntar a localhost");
  } else {
    warn(`URL del sitio: ${url} (definí NEXT_PUBLIC_SITE_URL para producción)`);
  }
} else {
  ok(`URL del sitio: ${url}`);
}

// --- Email ------------------------------------------------------------------
if (!process.env.RESEND_API_KEY) {
  const message =
    "RESEND_API_KEY no configurada: no se envía ningún email, incluido el enlace de acceso al panel";
  if (isProduction) {
    fail(message);
  } else {
    warn(`${message} (en desarrollo se imprimen en consola)`);
  }
} else if (!process.env.EMAIL_FROM) {
  warn("EMAIL_FROM no configurada: se usa el remitente de prueba de Resend");
} else {
  ok(`Email transaccional configurado (desde ${process.env.EMAIL_FROM})`);
}

if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
  warn(
    "ADMIN_NOTIFICATION_EMAIL no configurada: no llegan avisos de solicitudes nuevas ni de supervisiones por vencer",
  );
} else {
  ok(`Avisos internos a ${process.env.ADMIN_NOTIFICATION_EMAIL}`);
}

// --- Almacenamiento privado -------------------------------------------------
if (isStorageConfigured()) {
  ok("Almacenamiento privado de documentos configurado");
} else {
  warn(
    "Almacenamiento no configurado: no se pueden subir documentos de certificación (el resto funciona)",
  );
}

// --- Cron -------------------------------------------------------------------
if (!process.env.CRON_SECRET) {
  warn("CRON_SECRET no configurada: /api/cron/supervisiones queda sin protección");
} else {
  ok("Cron de vencimientos protegido");
}

// --- Coherencia -------------------------------------------------------------
if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
  warn("AUTH_SECRET es corto. Generá uno con: openssl rand -base64 32");
}

if (process.env.DATABASE_URL?.includes("localhost") && isProduction) {
  fail("DATABASE_URL apunta a localhost en producción");
}

console.log("");
if (hasError) {
  console.error("Hay problemas que impiden operar. Revisá los ✗ de arriba.");
  process.exit(1);
}
console.log(
  hasWarning
    ? "Sin errores bloqueantes, pero revisá las advertencias."
    : "Entorno completo.",
);
