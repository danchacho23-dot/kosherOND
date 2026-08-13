/**
 * Seed de desarrollo.
 *
 * TODO dato que crea este script queda marcado con `isSeedData: true` y con el
 * prefijo "[DEMO]" en el nombre del comercio. El gate de lanzamiento exige que
 * no quede ninguno: `npm run db:seed:clear` los borra.
 *
 * Estos comercios NO existen. Los teléfonos no son de nadie.
 */
import { PrismaClient, type OrderChannel } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "[DEMO]";

const CATEGORIES = [
  { slug: "carniceria", name: "Carnicería", icon: "beef", sortOrder: 10 },
  { slug: "panaderia", name: "Panadería", icon: "croissant", sortOrder: 20 },
  { slug: "restaurante", name: "Restaurante", icon: "utensils", sortOrder: 30 },
  { slug: "supermercado", name: "Supermercado", icon: "basket", sortOrder: 40 },
  { slug: "reposteria", name: "Repostería", icon: "cake", sortOrder: 50 },
  { slug: "catering", name: "Catering", icon: "salad", sortOrder: 60 },
  { slug: "vinos", name: "Vinos", icon: "wine", sortOrder: 70 },
];

const NEIGHBORHOODS = [
  { slug: "punta-pacifica", name: "Punta Pacífica", sortOrder: 10 },
  { slug: "costa-del-este", name: "Costa del Este", sortOrder: 20 },
  { slug: "san-francisco", name: "San Francisco", sortOrder: 30 },
  { slug: "obarrio", name: "Obarrio", sortOrder: 40 },
  { slug: "paitilla", name: "Paitilla", sortOrder: 50 },
  { slug: "el-cangrejo", name: "El Cangrejo", sortOrder: 60 },
];

/** Lunes a jueves 08–18, viernes 08–14, domingo 09–15. Sábado nunca. */
const STANDARD_HOURS = [
  { dayOfWeek: 0, opensAt: 9 * 60, closesAt: 15 * 60 },
  { dayOfWeek: 1, opensAt: 8 * 60, closesAt: 18 * 60 },
  { dayOfWeek: 2, opensAt: 8 * 60, closesAt: 18 * 60 },
  { dayOfWeek: 3, opensAt: 8 * 60, closesAt: 18 * 60 },
  { dayOfWeek: 4, opensAt: 8 * 60, closesAt: 18 * 60 },
  { dayOfWeek: 5, opensAt: 8 * 60, closesAt: 14 * 60 },
];

interface DemoMerchant {
  slug: string;
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  categorySlug: string;
  neighborhoodSlug: string;
  addressLine: string;
  phone: string;
  dietTag: "MEAT" | "DAIRY" | "PAREVE" | "MIXED" | null;
  offersDelivery: boolean;
  deliveryAreaText: string | null;
  orderChannels: OrderChannel[];
  websiteUrl: string | null;
  isFeatured: boolean;
  products?: Array<{ name: string; priceCents: number | null; dietTag?: "MEAT" | "DAIRY" | "PAREVE" }>;
}

const MERCHANTS: DemoMerchant[] = [
  {
    slug: "demo-carniceria-hamaor",
    name: `${DEMO_PREFIX} Carnicería HaMaor`,
    legalName: "Carnicería HaMaor S.A.",
    tagline: "Cortes frescos y pollo, con entrega en la ciudad.",
    description:
      "Carnicería de barrio con cortes vacunos, pollo y embutidos. Pedidos por WhatsApp hasta las 13:00 para entrega el mismo día.",
    categorySlug: "carniceria",
    neighborhoodSlug: "punta-pacifica",
    addressLine: "Calle 53 Este, local 4",
    phone: "60000001",
    dietTag: "MEAT",
    offersDelivery: true,
    deliveryAreaText: "Punta Pacífica, Paitilla, Costa del Este y San Francisco.",
    orderChannels: ["WHATSAPP", "PHONE", "PICKUP"],
    websiteUrl: null,
    isFeatured: true,
    products: [
      { name: "Pechuga de pollo (kg)", priceCents: 890, dietTag: "MEAT" },
      { name: "Carne molida (kg)", priceCents: 1250, dietTag: "MEAT" },
      { name: "Pastrami (250 g)", priceCents: 950, dietTag: "MEAT" },
    ],
  },
  {
    slug: "demo-panaderia-shalom",
    name: `${DEMO_PREFIX} Panadería Shalom`,
    legalName: "Panadería Shalom S.A.",
    tagline: "Jalot los viernes, pan fresco toda la semana.",
    description:
      "Panadería familiar. Encargá tus jalot antes del jueves al mediodía para retirar el viernes.",
    categorySlug: "panaderia",
    neighborhoodSlug: "san-francisco",
    addressLine: "Vía Porras, edificio Sol, planta baja",
    phone: "60000002",
    dietTag: "PAREVE",
    offersDelivery: false,
    deliveryAreaText: null,
    orderChannels: ["WHATSAPP", "PICKUP"],
    websiteUrl: null,
    isFeatured: true,
    products: [
      { name: "Jalá chica", priceCents: 450, dietTag: "PAREVE" },
      { name: "Jalá grande", priceCents: 700, dietTag: "PAREVE" },
      { name: "Rugelaj (docena)", priceCents: 1100, dietTag: "PAREVE" },
    ],
  },
  {
    slug: "demo-restaurante-tavlin",
    name: `${DEMO_PREFIX} Tavlín`,
    legalName: "Tavlín Cocina S.A.",
    tagline: "Cocina israelí para comer acá o llevar.",
    description:
      "Falafel, shawarma y platos del día. Salón chico, mejor reservar para más de cuatro personas.",
    categorySlug: "restaurante",
    neighborhoodSlug: "obarrio",
    addressLine: "Calle 50 con Vía Brasil",
    phone: "60000003",
    dietTag: "MEAT",
    offersDelivery: true,
    deliveryAreaText: "Obarrio, El Cangrejo y Bella Vista.",
    orderChannels: ["WHATSAPP", "WEBSITE", "PHONE"],
    websiteUrl: "https://ejemplo-demo-tavlin.test",
    isFeatured: false,
  },
  {
    slug: "demo-super-hamigdal",
    name: `${DEMO_PREFIX} Súper HaMigdal`,
    legalName: "Distribuidora HaMigdal S.A.",
    tagline: "Góndola kosher completa, con importados.",
    description:
      "Almacén con productos importados, lácteos, congelados y vinos. Lista de precios por WhatsApp.",
    categorySlug: "supermercado",
    neighborhoodSlug: "costa-del-este",
    addressLine: "Ave. Centenario, plaza Este local 12",
    phone: "60000004",
    dietTag: "MIXED",
    offersDelivery: true,
    deliveryAreaText: "Toda la ciudad de Panamá, pedido mínimo B/. 50.",
    orderChannels: ["WHATSAPP", "WEBSITE", "PICKUP"],
    websiteUrl: "https://ejemplo-demo-hamigdal.test",
    isFeatured: false,
  },
  {
    slug: "demo-reposteria-dvash",
    name: `${DEMO_PREFIX} Dvash Repostería`,
    legalName: "Dvash Repostería S.A.",
    tagline: "Tortas por encargo, lácteo y pareve.",
    description: "Repostería por encargo con 72 horas de anticipación. Opciones sin gluten.",
    categorySlug: "reposteria",
    neighborhoodSlug: "paitilla",
    addressLine: "Ave. Italia, torre Mar, local 2",
    phone: "60000005",
    dietTag: "DAIRY",
    offersDelivery: true,
    deliveryAreaText: "Paitilla y alrededores.",
    orderChannels: ["WHATSAPP"],
    websiteUrl: null,
    isFeatured: false,
  },
  {
    slug: "demo-catering-simja",
    name: `${DEMO_PREFIX} Simjá Catering`,
    legalName: "Simjá Eventos S.A.",
    tagline: "Catering para eventos y jaguim.",
    description:
      "Servicio de catering para casamientos, britot y jaguim. Presupuesto a pedido.",
    categorySlug: "catering",
    neighborhoodSlug: "el-cangrejo",
    addressLine: "Calle Manuel María Icaza 8",
    phone: "60000006",
    dietTag: "MEAT",
    offersDelivery: true,
    deliveryAreaText: "Ciudad de Panamá y alrededores, con coordinación previa.",
    orderChannels: ["WHATSAPP", "PHONE"],
    websiteUrl: null,
    isFeatured: false,
  },
];

/** Copia de `normalizeText` — el seed corre fuera del bundle de la app. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PUBLIC_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function publicId(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PUBLIC_ID_ALPHABET[Math.floor(Math.random() * PUBLIC_ID_ALPHABET.length)];
  }
  return out;
}

async function main() {
  console.log("Sembrando datos de demostración…");

  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: { ...category, isSeedData: true },
      update: { name: category.name, icon: category.icon, sortOrder: category.sortOrder },
    });
  }

  for (const neighborhood of NEIGHBORHOODS) {
    await prisma.neighborhood.upsert({
      where: { slug: neighborhood.slug },
      create: { ...neighborhood, isSeedData: true },
      update: { name: neighborhood.name, sortOrder: neighborhood.sortOrder },
    });
  }

  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true, name: true } })).map((c) => [
      c.slug,
      c,
    ]),
  );
  const neighborhoodIds = new Map(
    (await prisma.neighborhood.findMany({ select: { id: true, slug: true, name: true } })).map(
      (n) => [n.slug, n],
    ),
  );

  for (const merchant of MERCHANTS) {
    const category = categoryIds.get(merchant.categorySlug)!;
    const neighborhood = neighborhoodIds.get(merchant.neighborhoodSlug)!;

    const searchText = normalize(
      [
        merchant.name,
        merchant.legalName,
        merchant.tagline,
        merchant.description,
        category.name,
        neighborhood.name,
      ].join(" "),
    );

    const created = await prisma.merchant.upsert({
      where: { slug: merchant.slug },
      update: {
        name: merchant.name,
        tagline: merchant.tagline,
        description: merchant.description,
        searchText,
      },
      create: {
        publicId: publicId(),
        slug: merchant.slug,
        name: merchant.name,
        legalName: merchant.legalName,
        tagline: merchant.tagline,
        description: merchant.description,
        contactName: "Contacto de demostración",
        phone: merchant.phone,
        whatsappPhone: merchant.phone,
        email: `demo+${merchant.slug}@example.test`,
        categoryId: category.id,
        neighborhoodId: neighborhood.id,
        addressLine: merchant.addressLine,
        deliveryAreaText: merchant.deliveryAreaText,
        offersDelivery: merchant.offersDelivery,
        offersPickup: true,
        dietTag: merchant.dietTag,
        orderChannels: merchant.orderChannels,
        websiteUrl: merchant.websiteUrl,
        status: "APPROVED",
        publishedAt: new Date(),
        isFeatured: merchant.isFeatured,
        searchText,
        isSeedData: true,
        hours: { createMany: { data: STANDARD_HOURS } },
      },
    });

    if (merchant.products?.length) {
      await prisma.product.deleteMany({ where: { merchantId: created.id } });
      await prisma.product.createMany({
        data: merchant.products.map((product, index) => ({
          merchantId: created.id,
          name: product.name,
          priceCents: product.priceCents,
          dietTag: product.dietTag ?? null,
          sortOrder: index,
          isSeedData: true,
        })),
      });
    }
  }

  // Una solicitud pendiente, para poder ver la cola de aprobación.
  await prisma.merchantApplication.upsert({
    where: { publicId: "DEMOAPP1" },
    update: {},
    create: {
      publicId: "DEMOAPP1",
      legalName: "Quesería Gan Eden S.A.",
      name: `${DEMO_PREFIX} Quesería Gan Eden`,
      contactName: "Solicitante de demostración",
      phone: "60000007",
      whatsappPhone: "60000007",
      email: "demo+solicitud@example.test",
      categoryId: categoryIds.get("supermercado")!.id,
      categorySlug: "supermercado",
      neighborhoodId: neighborhoodIds.get("san-francisco")!.id,
      neighborhoodSlug: "san-francisco",
      addressLine: "Calle 74 Este, casa 12",
      description: "Quesos frescos y madurados. Solicitud de demostración.",
      offersDelivery: true,
      offersPickup: true,
      deliveryAreaText: "San Francisco y Costa del Este.",
      dietTag: "DAIRY",
      orderChannels: ["WHATSAPP", "PICKUP"],
      hoursPayload: [
        { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00" },
        { dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00" },
        { dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00" },
        { dayOfWeek: 4, opensAt: "09:00", closesAt: "18:00" },
        { dayOfWeek: 5, opensAt: "09:00", closesAt: "13:00" },
      ],
      status: "SUBMITTED",
      isSeedData: true,
    },
  });

  console.log(
    `Listo: ${CATEGORIES.length} categorías, ${NEIGHBORHOODS.length} barrios, ${MERCHANTS.length} comercios de demostración y 1 solicitud.`,
  );
  console.log("Todo está marcado como isSeedData. Antes de lanzar: npm run db:seed:clear");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
