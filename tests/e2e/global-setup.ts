import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export const ADMIN_EMAIL = "admin.e2e@kosherondemand.test";
export const AUTH_STATE_PATH = "tests/e2e/.auth/admin.json";

/**
 * Prepara la base para los e2e y deja lista una sesión de admin.
 *
 * La sesión se crea insertando la fila directamente: el login real es por
 * magic link y depende de un email que sale de la aplicación. El camino de
 * autenticación en sí se prueba en los unitarios de control de acceso.
 */
async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Los e2e necesitan DATABASE_URL apuntando a una base de pruebas.");
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  const prisma = new PrismaClient();
  try {
    // Base limpia en cada corrida: los tests afirman sobre conteos.
    await prisma.$transaction([
      prisma.analyticsEvent.deleteMany(),
      prisma.adminActionLog.deleteMany(),
      prisma.certificationDocument.deleteMany(),
      prisma.kosherSupervision.deleteMany(),
      prisma.product.deleteMany(),
      prisma.holidayClosure.deleteMany(),
      prisma.merchantHours.deleteMany(),
      prisma.merchantApplication.deleteMany(),
      prisma.merchant.deleteMany(),
      prisma.category.deleteMany(),
      prisma.neighborhood.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

    const user = await prisma.user.create({
      data: { email: ADMIN_EMAIL, name: "Admin e2e", emailVerified: new Date() },
    });

    const sessionToken = randomUUID();
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    mkdirSync("tests/e2e/.auth", { recursive: true });
    writeFileSync(
      AUTH_STATE_PATH,
      JSON.stringify(
        {
          cookies: [
            {
              // Nombre del cookie de sesión de Auth.js v5 sobre http.
              name: "authjs.session-token",
              value: sessionToken,
              domain: "127.0.0.1",
              path: "/",
              expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
              httpOnly: true,
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
