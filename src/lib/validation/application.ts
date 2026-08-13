import { z } from "zod";
import { labelToMinutes } from "@/lib/utils";

/**
 * Zod en todo borde de entrada externa. Este es el borde más expuesto del MVP:
 * un formulario público sin autenticación.
 */

const phoneRegex = /^[\d\s()+-]{7,20}$/;

const timeLabel = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, "Usá el formato HH:MM")
  .refine((value) => labelToMinutes(value) !== null, "Hora inválida");

const optionalUrl = z.union([z.literal(""), z.url("Ingresá una URL válida (https://…)").max(300)]);

export const hourRangeSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    opensAt: timeLabel,
    closesAt: timeLabel,
  })
  .refine(
    (range) => range.opensAt !== range.closesAt,
    "La hora de apertura y la de cierre no pueden ser iguales",
  );

export const applicationSchema = z.object({
  legalName: z.string().trim().min(2, "Ingresá la razón social").max(160),
  name: z.string().trim().min(2, "Ingresá el nombre público").max(120),
  contactName: z.string().trim().min(2, "Ingresá el nombre del responsable").max(120),
  phone: z.string().trim().regex(phoneRegex, "Teléfono inválido"),
  whatsappPhone: z.union([z.literal(""), z.string().trim().regex(phoneRegex, "WhatsApp inválido")]),
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),

  categorySlug: z.string().trim().min(1, "Elegí una categoría"),
  neighborhoodSlug: z.string().trim().min(1, "Elegí un barrio"),

  addressLine: z.string().trim().min(5, "Ingresá la dirección").max(240),
  description: z.string().trim().max(1200),

  dietTag: z.union([z.literal(""), z.enum(["MEAT", "DAIRY", "PAREVE", "MIXED"])]),

  offersDelivery: z.boolean(),
  offersPickup: z.boolean(),
  deliveryAreaText: z.string().trim().max(400),

  orderChannels: z
    .array(z.enum(["WHATSAPP", "WEBSITE", "PHONE", "PICKUP"]))
    .min(1, "Elegí al menos un canal de pedido"),

  websiteUrl: optionalUrl,
  logoUrl: optionalUrl,
  coverUrl: optionalUrl,

  hours: z.array(hourRangeSchema).max(21, "Demasiados turnos"),

  consent: z.literal(true, {
    error: "Necesitamos tu confirmación para publicar el comercio",
  }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Reglas cruzadas: un canal elegido tiene que venir con el dato que necesita. */
export const applicationSchemaWithChannelRules = applicationSchema
  .refine((data) => !data.orderChannels.includes("WEBSITE") || Boolean(data.websiteUrl), {
    message: "Ingresá la URL del sitio si elegiste ese canal",
    path: ["websiteUrl"],
  })
  .refine(
    (data) => !data.orderChannels.includes("WHATSAPP") || Boolean(data.whatsappPhone || data.phone),
    { message: "Ingresá el WhatsApp si elegiste ese canal", path: ["whatsappPhone"] },
  )
  .refine((data) => data.offersDelivery || data.offersPickup, {
    message: "Marcá al menos delivery o retiro en el local",
    path: ["offersPickup"],
  });

/** Convierte los rangos con etiqueta "HH:MM" a minutos desde medianoche. */
export function hoursToMinutes(
  hours: ApplicationInput["hours"],
): Array<{ dayOfWeek: number; opensAt: number; closesAt: number }> {
  return hours.flatMap((range) => {
    const opensAt = labelToMinutes(range.opensAt);
    const closesAt = labelToMinutes(range.closesAt);
    if (opensAt === null || closesAt === null) return [];
    return [{ dayOfWeek: range.dayOfWeek, opensAt, closesAt }];
  });
}

/** Aplana los errores de Zod a `{ campo: mensaje }` para pintarlos en el form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
