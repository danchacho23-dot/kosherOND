import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Control de acceso al panel.
 *
 * No hay middleware de auth: la frontera es `getAdminSession`/`requireAdmin`, y
 * la llama cada layout, server action y route handler del panel. Si esto se
 * rompe, se rompe todo el panel a la vez — de ahí que tenga tests propios.
 */

const authMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));

const { getAdminSession, requireAdmin, requireAdminApi, UnauthorizedError } = await import(
  "@/lib/admin/guard"
);
const { isAdminEmail, adminEmails } = await import("@/lib/env");

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

beforeEach(() => {
  process.env.ADMIN_EMAILS = "ana@kosherondemand.test, Beto@KosherOnDemand.test";
  authMock.mockReset();
  redirectMock.mockClear();
});

afterEach(() => {
  process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
});

function session(email: string | null, isActive = true) {
  return { user: email ? { id: "u1", email, isActive } : {} };
}

describe("lista blanca de administradores", () => {
  it("normaliza mayúsculas y espacios", () => {
    expect(adminEmails()).toEqual(["ana@kosherondemand.test", "beto@kosherondemand.test"]);
    expect(isAdminEmail("ANA@kosherondemand.test")).toBe(true);
    expect(isAdminEmail("  beto@kosherondemand.test ")).toBe(true);
  });

  it("rechaza a cualquiera que no esté en la lista", () => {
    expect(isAdminEmail("otro@kosherondemand.test")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("no deja pasar con la lista vacía", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("ana@kosherondemand.test")).toBe(false);
  });
});

describe("getAdminSession", () => {
  it("devuelve la sesión de un admin activo", async () => {
    authMock.mockResolvedValue(session("ana@kosherondemand.test"));
    const result = await getAdminSession();
    expect(result?.user.email).toBe("ana@kosherondemand.test");
  });

  it("rechaza cuando no hay sesión", async () => {
    authMock.mockResolvedValue(null);
    expect(await getAdminSession()).toBeNull();
  });

  it("rechaza una sesión sin email", async () => {
    authMock.mockResolvedValue(session(null));
    expect(await getAdminSession()).toBeNull();
  });

  it("rechaza a un usuario que salió de la lista blanca", async () => {
    // Caso real: se saca a alguien de ADMIN_EMAILS pero su sesión sigue viva.
    authMock.mockResolvedValue(session("exadmin@kosherondemand.test"));
    expect(await getAdminSession()).toBeNull();
  });

  it("rechaza a un usuario desactivado", async () => {
    authMock.mockResolvedValue(session("ana@kosherondemand.test", false));
    expect(await getAdminSession()).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("redirige al login si no hay sesión válida", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });

  it("deja pasar a un admin válido", async () => {
    authMock.mockResolvedValue(session("ana@kosherondemand.test"));
    const result = await requireAdmin();
    expect(result.user.email).toBe("ana@kosherondemand.test");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireAdminApi", () => {
  it("lanza UnauthorizedError en lugar de redirigir", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdminApi()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("deja pasar a un admin válido", async () => {
    authMock.mockResolvedValue(session("beto@kosherondemand.test"));
    await expect(requireAdminApi()).resolves.toBeTruthy();
  });
});
