import { z } from "zod";

/**
 * Validación de entorno. Se evalúa de forma perezosa: `next build` no debe
 * fallar por variables que solo hacen falta en runtime.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET debe tener al menos 16 caracteres"),
  AUTH_URL: z.string().url().optional(),

  // Lista de emails autorizados a entrar al panel. Separados por coma.
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS es obligatoria"),

  // Email transaccional (proveedor único).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Destino de los avisos internos (nueva solicitud, vencimiento de supervisión).
  ADMIN_NOTIFICATION_EMAIL: z.string().optional(),

  // Almacenamiento de objetos.
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Protege el endpoint de cron de vencimientos.
  CRON_SECRET: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuración de entorno inválida — ${detail}`);
  }
  cached = parsed.data;
  return cached;
}

/** URL pública del sitio. Usada por metadata, sitemap y links de email. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Emails con acceso al panel de admin. Comparación en minúsculas. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
