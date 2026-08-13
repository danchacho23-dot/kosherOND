"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApplicationForm } from "@/components/application-form";
import { Card, CardContent } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface Option {
  slug: string;
  name: string;
}

/**
 * Envuelve el formulario para poder mostrar la confirmación sin navegar:
 * el código de seguimiento se pierde si redirigimos y el usuario recarga.
 */
export function ApplicationFormShell({
  categories,
  neighborhoods,
}: {
  categories: Option[];
  neighborhoods: Option[];
}) {
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  if (trackingCode) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-brand-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-ink-900">
            {copy.apply.successTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            {copy.apply.successBody}
          </p>
          <p className="mt-4 text-sm text-ink-500">
            {copy.apply.successCode}:{" "}
            <span className="font-mono font-semibold text-ink-900">{trackingCode}</span>
          </p>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-5" })}>
            {copy.apply.backHome}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ApplicationForm
      categories={categories}
      neighborhoods={neighborhoods}
      onSuccess={setTrackingCode}
    />
  );
}
