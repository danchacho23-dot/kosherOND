import { Resend } from "resend";

/**
 * Un solo proveedor de email transaccional, sin cola ni reintentos.
 * El MVP manda tres cosas: enlace de acceso al panel, "recibimos tu solicitud"
 * y "fuiste aprobado". Si un envío falla, se registra y sigue — ningún flujo
 * de usuario se bloquea por un email.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

let client: Resend | null = null;

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "KosherOnDemand <onboarding@resend.dev>";
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const api = resend();

  if (!api) {
    // En desarrollo sin API key: el contenido va a la consola del servidor.
    // Nunca en producción — ahí la falta de key es un error de configuración.
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY no configurada; se omitió el envío", {
        to: message.to,
        subject: message.subject,
      });
      return { ok: false, skipped: true, error: "RESEND_API_KEY no configurada" };
    }
    console.info(
      `\n[email:dev] Para: ${message.to}\nAsunto: ${message.subject}\n\n${message.text}\n`,
    );
    return { ok: true, skipped: true };
  }

  try {
    const { error } = await api.emails.send({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      console.error("[email] fallo de envío", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] excepción de envío", error);
    return { ok: false, error: error instanceof Error ? error.message : "desconocido" };
  }
}
