"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import type { OrderChannel } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface OrderActionsProps {
  merchantPublicId: string;
  merchantId: string;
  merchantSlug: string;
  channels: OrderChannel[];
  phoneHref: string | null;
}

const CHANNEL_META: Record<
  OrderChannel,
  { label: string; icon: typeof MessageCircle; variant: "whatsapp" | "primary" | "outline" }
> = {
  WHATSAPP: { label: copy.order.whatsapp, icon: MessageCircle, variant: "whatsapp" },
  WEBSITE: { label: copy.order.website, icon: ExternalLink, variant: "primary" },
  PICKUP: { label: copy.order.pickup, icon: MapPin, variant: "outline" },
  PHONE: { label: copy.order.phone, icon: Phone, variant: "outline" },
};

/** Orden de aparición: lo que más se usa, primero. */
const CHANNEL_ORDER: OrderChannel[] = ["WHATSAPP", "WEBSITE", "PHONE", "PICKUP"];

export function OrderActions({
  merchantPublicId,
  merchantId,
  merchantSlug,
  channels,
  phoneHref,
}: OrderActionsProps) {
  const [pending, setPending] = useState<{ href: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  const ordered = CHANNEL_ORDER.filter((channel) => channels.includes(channel));

  if (ordered.length === 0) {
    return <p className="text-sm text-ink-500">{copy.order.noChannels}</p>;
  }

  function beacon(type: string) {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(
        "/api/eventos",
        new Blob(
          [JSON.stringify({ type, merchantId, path: `/comercio/${merchantSlug}` })],
          { type: "application/json" },
        ),
      );
    } catch {
      // Una métrica perdida no cambia nada para el cliente.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {ordered.map((channel) => {
          const meta = CHANNEL_META[channel];
          const Icon = meta.icon;

          // El teléfono enlaza directo: un 302 hacia `tel:` no es confiable.
          if (channel === "PHONE") {
            if (!phoneHref) return null;
            return (
              <a
                key={channel}
                href={phoneHref}
                onClick={() => beacon("PHONE_CLICK")}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-4 text-[0.95rem] font-medium text-ink-800 hover:bg-ink-100"
              >
                <Icon className="size-4" aria-hidden="true" />
                {meta.label}
              </a>
            );
          }

          const href = `/ir?m=${encodeURIComponent(merchantPublicId)}&c=${channel}`;
          return (
            <a
              key={channel}
              href={href}
              rel="nofollow noopener"
              onClick={(event) => {
                // Sin JS el enlace navega igual y el aviso estático de abajo
                // sigue visible; con JS mostramos el aviso antes de salir.
                event.preventDefault();
                setPending({ href });
              }}
              className={buttonVariants({ variant: meta.variant, size: "lg", block: true })}
            >
              <Icon className="size-4" aria-hidden="true" />
              {meta.label}
            </a>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-ink-500">{copy.order.leavingBody}</p>

      <dialog
        ref={dialogRef}
        aria-labelledby="aviso-salida-titulo"
        onClose={() => setPending(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setPending(null);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--radius-card)] border border-ink-200 bg-white p-0 backdrop:bg-ink-900/40"
      >
        <div className="p-5">
          <h2 id="aviso-salida-titulo" className="text-base font-semibold text-ink-900">
            {copy.order.leavingTitle}
          </h2>
          <p className="mt-2 text-sm text-ink-600">{copy.order.leavingBody}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setPending(null)}>
              {copy.order.leavingCancel}
            </Button>
            <Button
              autoFocus
              onClick={() => {
                if (pending) window.location.href = pending.href;
              }}
            >
              {copy.order.leavingConfirm}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
