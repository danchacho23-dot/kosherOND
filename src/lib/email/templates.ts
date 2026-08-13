import { copy } from "@/lib/copy";
import type { EmailMessage } from "./mailer";

/**
 * Plantillas en HTML plano. Sin imágenes remotas, sin tracking pixels,
 * sin dependencias de render — un email transaccional no necesita más.
 */

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;">
      <tr>
        <td style="padding:28px 28px 8px 28px;">
          <p style="margin:0;font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#0f766e;">
            ${escapeHtml(copy.brand.name)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px 28px;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td>
      </tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#78716c;text-align:center;">
      ${escapeHtml(copy.legal.disclaimerBody)}
    </p>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
      ${escapeHtml(label)}
    </a>
  </p>`;
}

// ---------------------------------------------------------------------------

export function magicLinkEmail(to: string, url: string): EmailMessage {
  const html = layout(
    "Entrar al panel",
    `<h1 style="margin:0 0 12px;font-size:20px;">Entrar al panel</h1>
     <p style="margin:0;">Este enlace te deja entrar al panel de administración. Vence en 24 horas y sirve una sola vez.</p>
     ${button(url, "Entrar al panel")}
     <p style="margin:0;color:#78716c;font-size:13px;">Si no pediste este acceso, ignorá este mensaje.</p>`,
  );
  return {
    to,
    subject: "Tu enlace de acceso a KosherOnDemand",
    html,
    text: `Entrar al panel de KosherOnDemand:\n\n${url}\n\nVence en 24 horas y sirve una sola vez. Si no pediste este acceso, ignorá este mensaje.`,
  };
}

export function applicationReceivedEmail(params: {
  to: string;
  merchantName: string;
  trackingCode: string;
}): EmailMessage {
  const html = layout(
    "Recibimos tu solicitud",
    `<h1 style="margin:0 0 12px;font-size:20px;">Recibimos tu solicitud</h1>
     <p style="margin:0 0 12px;">Gracias por querer sumar <strong>${escapeHtml(params.merchantName)}</strong> al directorio.</p>
     <p style="margin:0 0 12px;">La revisamos a mano. Te escribimos a este mismo email cuando esté lista. Si necesitamos algún dato más, te contactamos por WhatsApp.</p>
     <p style="margin:0;color:#78716c;">Código de seguimiento: <strong>${escapeHtml(params.trackingCode)}</strong></p>`,
  );
  return {
    to: params.to,
    subject: `Recibimos la solicitud de ${params.merchantName}`,
    html,
    text: `Recibimos tu solicitud para sumar ${params.merchantName} al directorio de KosherOnDemand.\n\nLa revisamos a mano y te escribimos cuando esté lista.\n\nCódigo de seguimiento: ${params.trackingCode}`,
  };
}

export function applicationApprovedEmail(params: {
  to: string;
  merchantName: string;
  merchantUrl: string;
}): EmailMessage {
  const html = layout(
    "Tu comercio ya está publicado",
    `<h1 style="margin:0 0 12px;font-size:20px;">Ya estás en el directorio</h1>
     <p style="margin:0 0 12px;"><strong>${escapeHtml(params.merchantName)}</strong> ya aparece en KosherOnDemand. Los clientes que te encuentren van a seguir el pedido directo con vos, por WhatsApp o por los canales que nos diste.</p>
     ${button(params.merchantUrl, "Ver tu página")}
     <p style="margin:0;">¿Cambió un horario, un teléfono o la zona de entrega? Escribinos y lo actualizamos.</p>`,
  );
  return {
    to: params.to,
    subject: `${params.merchantName} ya está en KosherOnDemand`,
    html,
    text: `${params.merchantName} ya aparece en el directorio de KosherOnDemand.\n\nTu página: ${params.merchantUrl}\n\nSi cambia un horario, un teléfono o la zona de entrega, escribinos y lo actualizamos.`,
  };
}

export function applicationRejectedEmail(params: {
  to: string;
  merchantName: string;
  reason?: string | null;
}): EmailMessage {
  const reasonHtml = params.reason
    ? `<p style="margin:0 0 12px;">Motivo: ${escapeHtml(params.reason)}</p>`
    : "";
  const html = layout(
    "Sobre tu solicitud",
    `<h1 style="margin:0 0 12px;font-size:20px;">Sobre tu solicitud</h1>
     <p style="margin:0 0 12px;">Por ahora no vamos a publicar <strong>${escapeHtml(params.merchantName)}</strong> en el directorio.</p>
     ${reasonHtml}
     <p style="margin:0;">Si creés que hay un error o querés volver a aplicar con datos actualizados, respondé este email.</p>`,
  );
  return {
    to: params.to,
    subject: `Sobre la solicitud de ${params.merchantName}`,
    html,
    text: `Por ahora no vamos a publicar ${params.merchantName} en el directorio de KosherOnDemand.${
      params.reason ? `\n\nMotivo: ${params.reason}` : ""
    }\n\nSi creés que hay un error, respondé este email.`,
  };
}

/** Aviso interno al admin: entró una solicitud nueva. */
export function newApplicationNoticeEmail(params: {
  to: string;
  merchantName: string;
  reviewUrl: string;
}): EmailMessage {
  const html = layout(
    "Solicitud nueva",
    `<h1 style="margin:0 0 12px;font-size:20px;">Solicitud nueva</h1>
     <p style="margin:0;"><strong>${escapeHtml(params.merchantName)}</strong> aplicó al directorio.</p>
     ${button(params.reviewUrl, "Revisar solicitud")}`,
  );
  return {
    to: params.to,
    subject: `Solicitud nueva: ${params.merchantName}`,
    html,
    text: `Solicitud nueva de ${params.merchantName}.\n\nRevisar: ${params.reviewUrl}`,
  };
}

/** Aviso interno al admin: falta un mes para el vencimiento de una supervisión. */
export function supervisionExpiringEmail(params: {
  to: string;
  merchants: Array<{ name: string; authority: string; expiresAt: Date; url: string }>;
}): EmailMessage {
  const rows = params.merchants
    .map(
      (m) =>
        `<li style="margin-bottom:8px;"><strong>${escapeHtml(m.name)}</strong> — ${escapeHtml(
          m.authority,
        )}, vence el ${m.expiresAt.toISOString().slice(0, 10)}. <a href="${escapeHtml(m.url)}">Revisar</a></li>`,
    )
    .join("");
  const html = layout(
    "Supervisiones por vencer",
    `<h1 style="margin:0 0 12px;font-size:20px;">Supervisiones por vencer</h1>
     <p style="margin:0 0 12px;">Estas certificaciones vencen dentro de los próximos 30 días. Si vence sin renovar, la página del comercio deja de mostrar la supervisión.</p>
     <ul style="margin:0;padding-left:18px;">${rows}</ul>`,
  );
  const text = params.merchants
    .map((m) => `- ${m.name} (${m.authority}) vence ${m.expiresAt.toISOString().slice(0, 10)}: ${m.url}`)
    .join("\n");
  return {
    to: params.to,
    subject: `${params.merchants.length} supervisión(es) por vencer`,
    html,
    text: `Supervisiones que vencen en los próximos 30 días:\n\n${text}`,
  };
}
