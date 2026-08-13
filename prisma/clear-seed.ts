/**
 * Borra los datos ficticios de demostración.
 *
 * Gate de lanzamiento: ningún comercio inventado puede quedar publicado.
 *
 * Las categorías y los barrios reciben otro trato. Son taxonomía genérica
 * —"Carnicería", "Punta Pacífica"— y en cuanto el admin aprueba un comercio
 * real dentro de una de ellas, dejan de ser datos de demostración: pasan a ser
 * parte del catálogo. Por eso solo se borran las que quedaron sin usar; las
 * que están en uso se desmarcan como seed y se quedan.
 *
 * Es idempotente: se puede correr las veces que haga falta.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedMerchants = await prisma.merchant.findMany({
    where: { isSeedData: true },
    select: { id: true, name: true },
  });

  // Horarios, cierres, supervisión, documentos y productos caen en cascada
  // desde `Merchant`. Los eventos de analítica quedan con `merchantId: null`,
  // así que los totales históricos no se falsean.
  const [products, applications, merchants] = await prisma.$transaction([
    prisma.product.deleteMany({ where: { isSeedData: true } }),
    prisma.merchantApplication.deleteMany({ where: { isSeedData: true } }),
    prisma.merchant.deleteMany({ where: { isSeedData: true } }),
  ]);

  console.log("Datos ficticios eliminados:");
  console.log(`  comercios:    ${merchants.count}`);
  for (const merchant of seedMerchants) console.log(`                - ${merchant.name}`);
  console.log(`  productos:    ${products.count}`);
  console.log(`  solicitudes:  ${applications.count}`);

  // --- Taxonomía -----------------------------------------------------------
  const [unusedCategories, unusedNeighborhoods] = await prisma.$transaction([
    prisma.category.deleteMany({ where: { isSeedData: true, merchants: { none: {} } } }),
    prisma.neighborhood.deleteMany({ where: { isSeedData: true, merchants: { none: {} } } }),
  ]);

  const [keptCategories, keptNeighborhoods] = await prisma.$transaction([
    prisma.category.updateMany({ where: { isSeedData: true }, data: { isSeedData: false } }),
    prisma.neighborhood.updateMany({
      where: { isSeedData: true },
      data: { isSeedData: false },
    }),
  ]);

  console.log(`  categorías sin uso eliminadas: ${unusedCategories.count}`);
  console.log(`  barrios sin uso eliminados:    ${unusedNeighborhoods.count}`);
  if (keptCategories.count > 0 || keptNeighborhoods.count > 0) {
    console.log(
      `\n  ${keptCategories.count} categoría(s) y ${keptNeighborhoods.count} barrio(s) están en uso por comercios reales.`,
    );
    console.log("  Se conservan y dejan de figurar como datos de demostración.");
  }

  // --- Verificación --------------------------------------------------------
  const remaining = await prisma.merchant.count({ where: { isSeedData: true } });
  if (remaining > 0) {
    console.error(`\nQuedaron ${remaining} comercios de seed. Revisá a mano.`);
    process.exit(1);
  }

  const realMerchants = await prisma.merchant.count({ where: { deletedAt: null } });
  console.log(`\nNo queda ningún dato ficticio. Comercios reales en la base: ${realMerchants}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
