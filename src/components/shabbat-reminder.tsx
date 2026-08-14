"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

type State = "cargando" | "no-soportado" | "apagado" | "encendido" | "bloqueado";

/** Qué puede hacer este navegador. Se resuelve una sola vez, al montar. */
async function detectar(): Promise<{ state: State; needsInstall: boolean }> {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  if (!supported) {
    // iOS solo expone PushManager cuando la web corre instalada.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    return { state: "no-soportado", needsInstall: isIOS && !standalone };
  }

  if (Notification.permission === "denied") {
    return { state: "bloqueado", needsInstall: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { state: subscription ? "encendido" : "apagado", needsInstall: false };
  } catch {
    return { state: "apagado", needsInstall: false };
  }
}

/**
 * Avisos de cierre por Shabat.
 *
 * Es lo único que una app instalada puede hacer y una pestaña de navegador no:
 * avisarte cuando no la estás mirando. En iOS solo funciona si el sitio está
 * agregado a la pantalla de inicio, así que ahí se explica cómo.
 */
export function ShabbatReminder({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("cargando");
  const [busy, setBusy] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detectar().then((result) => {
      if (cancelled) return;
      setState(result.state);
      setNeedsInstall(result.needsInstall);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function encender() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "bloqueado" : "apagado");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const response = await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("alta rechazada");

      setState("encendido");
    } catch (error) {
      console.error("[push] no se pudo activar", error);
      setState("apagado");
    } finally {
      setBusy(false);
    }
  }

  async function apagar() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/suscribir", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("apagado");
    } catch (error) {
      console.error("[push] no se pudo desactivar", error);
    } finally {
      setBusy(false);
    }
  }

  if (state === "cargando") return null;

  if (state === "no-soportado") {
    if (!needsInstall) return null;
    return (
      <Card className="border-brand-200 bg-brand-50">
        <CardContent className="flex gap-3 pt-5">
          <Bell className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-ink-900">{copy.reminders.title}</p>
            <p className="mt-1 text-ink-600">{copy.reminders.iosInstall}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={state === "encendido" ? "border-brand-200 bg-brand-50" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-3">
          {state === "encendido" ? (
            <Check className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
          ) : (
            <Bell className="mt-0.5 size-5 shrink-0 text-ink-400" aria-hidden="true" />
          )}
          <div className="text-sm">
            <p className="font-medium text-ink-900">
              {state === "encendido" ? copy.reminders.onTitle : copy.reminders.title}
            </p>
            <p className="mt-1 text-ink-600">
              {state === "bloqueado"
                ? copy.reminders.blocked
                : state === "encendido"
                  ? copy.reminders.onBody
                  : copy.reminders.body}
            </p>
          </div>
        </div>

        {state !== "bloqueado" ? (
          <Button
            variant={state === "encendido" ? "outline" : "primary"}
            onClick={state === "encendido" ? apagar : encender}
            disabled={busy}
            className="shrink-0"
          >
            {state === "encendido" ? (
              <>
                <BellOff aria-hidden="true" />
                {copy.reminders.turnOff}
              </>
            ) : (
              <>
                <Bell aria-hidden="true" />
                {busy ? copy.reminders.turningOn : copy.reminders.turnOn}
              </>
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** La clave VAPID viaja en base64url; `subscribe` la pide como bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Buffer explícito: `BufferSource` no acepta un Uint8Array que podría estar
  // respaldado por un SharedArrayBuffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
