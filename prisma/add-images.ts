// Adds demo product photos to an EXISTING dev database without resetting it.
// Only products that have no image yet are touched. Usage: npx tsx prisma/add-images.ts
import { PrismaClient } from "@prisma/client";
import { productImageUrl } from "./product-images";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to add demo images in production.");
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ where: { images: { none: {} } }, select: { id: true, sku: true } });
    let added = 0;
    for (const p of products) {
      const url = productImageUrl(p.sku);
      if (!url) continue;
      await prisma.productImage.create({ data: { productId: p.id, url, sortOrder: 0 } });
      added++;
    }
    console.log(`Added ${added} product photos (${products.length - added} products had no matching photo).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
