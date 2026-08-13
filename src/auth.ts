import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import { magicLinkEmail } from "@/lib/email/templates";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN";
      isActive: boolean;
    } & DefaultSession["user"];
  }
}

/**
 * Autenticación solo para administradores. Un rol, sin matriz de permisos.
 *
 * El acceso se controla por lista blanca de emails (`ADMIN_EMAILS`), evaluada
 * en el callback `signIn` — que corre tanto al pedir el enlace como al usarlo.
 * Un email fuera de la lista no recibe enlace y tampoco puede canjear uno.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 14 },
  trustHost: true,
  pages: {
    signIn: "/admin/login",
    verifyRequest: "/admin/login?enviado=1",
    error: "/admin/login",
  },
  providers: [
    Resend({
      // El envío real pasa por nuestro mailer, así el modo dev sin API key
      // imprime el enlace en consola en lugar de fallar.
      apiKey: process.env.RESEND_API_KEY ?? "dev-no-key",
      from: process.env.EMAIL_FROM ?? "KosherOnDemand <onboarding@resend.dev>",
      maxAge: 60 * 60 * 24,
      async sendVerificationRequest({ identifier, url }) {
        const result = await sendEmail(magicLinkEmail(identifier, url));
        if (!result.ok) {
          throw new Error("No se pudo enviar el enlace de acceso");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, email }) {
      const address = user.email ?? "";
      if (!isAdminEmail(address)) return false;

      // Al pedir el enlace todavía no hay fila de usuario; no hay nada que revisar.
      if (email?.verificationRequest) return true;

      const existing = await prisma.user.findUnique({
        where: { email: address.toLowerCase() },
        select: { isActive: true },
      });
      return existing ? existing.isActive : true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = "ADMIN";
        session.user.isActive = (user as { isActive?: boolean }).isActive ?? true;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Normaliza el email a minúsculas para que la lista blanca no dependa
      // de cómo lo haya tipeado la persona.
      if (user.email && user.email !== user.email.toLowerCase()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: user.email.toLowerCase() },
        });
      }
    },
  },
});
