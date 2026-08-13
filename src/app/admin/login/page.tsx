import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { getAdminSession } from "@/lib/admin/guard";
import { isAdminEmail } from "@/lib/env";
import { Alert, Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.admin.signInTitle,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function requestMagicLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Una cuenta no autorizada recibe exactamente la misma respuesta que una
  // autorizada: el formulario no sirve para descubrir quién es admin.
  if (!email || !isAdminEmail(email)) {
    redirect("/admin/login?enviado=1");
  }

  try {
    await signIn("resend", { email, redirect: false, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/login?error=envio");
    }
    throw error;
  }

  redirect("/admin/login?enviado=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  const params = await searchParams;
  const sent = Boolean(params.enviado);
  const error = params.error;

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-ink-900">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white"
          >
            K
          </span>
          <span className="text-lg font-semibold">
            Kosher<span className="text-brand-700">OnDemand</span>
          </span>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold text-ink-900">{copy.admin.signInTitle}</h1>
            <p className="mt-1 text-sm text-ink-600">{copy.admin.signInBody}</p>

            {sent ? (
              <div className="mt-4">
                <Alert variant="success">{copy.admin.signInSent}</Alert>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4">
                <Alert variant="danger">
                  No pudimos enviar el enlace. Revisá la configuración de email e intentá de
                  nuevo.
                </Alert>
              </div>
            ) : null}

            <form action={requestMagicLink} className="mt-5 space-y-4">
              <Field id="email" label="Email" required>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vos@ejemplo.com"
                />
              </Field>
              <Button type="submit" block size="lg">
                {copy.admin.signInAction}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">
            Volver al directorio
          </Link>
        </p>
      </div>
    </main>
  );
}
