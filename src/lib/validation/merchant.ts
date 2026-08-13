import { z } from "zod";

/** Esquemas del panel. El admin puede editar cualquier campo del comercio. */

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const optionalUrlField = z.union([z.literal(""), z.url("URL inválida").max(300)]);

export const merchantAdminSchema = z.object({
  legalName: z.string().trim().min(2, "Obligatorio").max(160),
  name: z.string().trim().min(2, "Obligatorio").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Obligatorio")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  tagline: optionalText(160),
  description: optionalText(2000),

  contactName: z.string().trim().min(2, "Obligatorio").max(120),
  phone: z.string().trim().min(7, "Obligatorio").max(20),
  whatsappPhone: optionalText(20),
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),

  categoryId: z.string().min(1, "Elegí una categoría"),
  neighborhoodId: z.string().min(1, "Elegí un barrio"),

  addressLine: z.string().trim().min(5, "Obligatorio").max(240),
  addressNote: optionalText(240),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),

  deliveryAreaText: optionalText(400),
  offersDelivery: z.boolean().default(false),
  offersPickup: z.boolean().default(true),

  dietTag: z.union([z.literal(""), z.enum(["MEAT", "DAIRY", "PAREVE", "MIXED"])]).default(""),
  tags: z.array(z.string().trim().max(40)).max(12).default([]),

  orderChannels: z.array(z.enum(["WHATSAPP", "WEBSITE", "PHONE", "PICKUP"])).default([]),
  websiteUrl: optionalUrlField.default(""),
  whatsappGreeting: optionalText(300),

  logoUrl: optionalUrlField.default(""),
  coverUrl: optionalUrlField.default(""),

  observesShabbat: z.boolean().default(true),
  shabbatCloseOffsetMinutes: z.coerce.number().int().min(0).max(600).default(90),
  havdalahReopenOffsetMinutes: z.coerce.number().int().min(0).max(600).default(60),

  status: z.enum(["DRAFT", "APPROVED", "SUSPENDED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  sortWeight: z.coerce.number().int().min(-100).max(100).default(0),
});

export type MerchantAdminInput = z.infer<typeof merchantAdminSchema>;

export const hoursAdminSchema = z.object({
  merchantId: z.string().min(1),
  ranges: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        opensAt: z.number().int().min(0).max(1439),
        closesAt: z.number().int().min(0).max(1439),
      }),
    )
    .max(21),
});

export const closureSchema = z.object({
  merchantId: z.string().min(1),
  startsAt: z.string().min(1, "Obligatorio"),
  endsAt: z.string().min(1, "Obligatorio"),
  reason: optionalText(200),
});

export const supervisionSchema = z.object({
  merchantId: z.string().min(1),
  authority: z.string().trim().min(2, "Ingresá la autoridad certificante").max(160),
  certificateId: optionalText(80),
  verifiedAt: z.string().min(1, "Ingresá la fecha de verificación"),
  expiresAt: optionalText(30),
  notes: optionalText(1000),
  isActive: z.boolean().default(true),
});

export const taxonomySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Obligatorio").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "Obligatorio")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  icon: optionalText(40),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  merchantId: z.string().min(1),
  id: z.string().optional(),
  name: z.string().trim().min(1, "Obligatorio").max(120),
  description: optionalText(300),
  priceCents: z.coerce.number().int().min(0).max(10_000_00).nullable().optional(),
  dietTag: z.union([z.literal(""), z.enum(["MEAT", "DAIRY", "PAREVE", "MIXED"])]).default(""),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const applicationDecisionSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"]),
  reviewNotes: optionalText(1000),
  rejectionReason: optionalText(500),
});
