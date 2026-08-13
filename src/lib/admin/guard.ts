import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/env";

/**
 * Punto único de control de acceso al panel.
 *
 * No hay middleware de auth a propósito: la sesión vive en la base de datos y
 * el borde no puede consultarla sin arrastrar Prisma al runtime edge. La
 * frontera real es esta función, y la llama **cada** layout, server action y
 * route handler del panel. Ver DECISIONS.md.
 */

export interface AdminSession extends Session {
  user: NonNullable<Session["user"]>;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  if (!isAdminEmail(session.user.email)) return null;
  if (session.user.isActive === false) return null;
  return session as AdminSession;
}

/** Para server components y server actions: redirige si no hay sesión válida. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Para route handlers: lanza una respuesta 401 en lugar de redirigir. */
export class UnauthorizedError extends Error {
  constructor() {
    super("No autorizado");
    this.name = "UnauthorizedError";
  }
}

export async function requireAdminApi(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
