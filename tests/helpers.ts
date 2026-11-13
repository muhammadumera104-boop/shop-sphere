import { prisma } from "@/lib/db";
import { assertSafeTestDatabase } from "./safety";

let n = 0;
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

export async function resetDb() {
  assertSafeTestDatabase(process.env.TEST_DATABASE_URL);
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("DATABASE_URL is not the test database.");
  const tables = [
    "TicketMessage", "SupportTicket", "LedgerEntryRevision", "LedgerEntry", "KhataParty", "Expense", "ListingReport", "Review",
    "ReturnRequest", "Refund", "ShipmentEvent", "Shipment", "Payment", "OrderStatusEvent", "OrderItem", "Order", "CartItem", "Cart",
    "WishlistItem", "RecentlyViewed", "Coupon", "Campaign", "ProductImage", "ProductVariant", "Product", "Category", "Shop", "Address",
    "Notification", "AuditLog", "Session", "User", "PlatformSetting",
  ];
  for (const t of tables) await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
}

export async function makeUser(role = "BUYER", name = "Test User") {
  return prisma.user.create({ data: { name, email: `${uid()}@test.local`, passwordHash: "x", role }, include: { shop: true } });
}

export async function makeShop(status = "APPROVED") {
  const owner = await makeUser("BUYER", "Seller");
  const shop = await prisma.shop.create({ data: { ownerId: owner.id, name: `Shop ${uid()}`, slug: `shop-${uid()}`, status } });
  const category = await prisma.category.create({ data: { name: `Cat ${uid()}`, slug: `cat-${uid()}` } });
  const actor = { ...owner, shop };
  return { owner: actor, shop, category };
}

export async function makeProduct(shopId: string, categoryId: string, opts: { price?: number; salePrice?: number | null; stock?: number; status?: string } = {}) {
  return prisma.product.create({
    data: {
      shopId,
      categoryId,
      title: `Product ${uid()}`,
      slug: `p-${uid()}`,
      sku: `SKU-${uid()}`,
      price: opts.price ?? 1000,
      salePrice: opts.salePrice ?? null,
      status: opts.status ?? "ACTIVE",
      variants: { create: [{ name: "Default", stockQuantity: opts.stock ?? 10 }] },
    },
    include: { variants: true },
  });
}

export async function makeBuyerWithCart(items: { variantId: string; quantity: number }[], couponCode?: string) {
  const buyer = await makeUser("BUYER", "Buyer");
  const address = await prisma.address.create({ data: { userId: buyer.id, fullName: "Buyer", phone: "03001234567", line1: "House 1, Street 2", city: "Karachi", isDefault: true } });
  await prisma.cart.create({ data: { userId: buyer.id, couponCode, items: { create: items } } });
  return { buyer, address };
}
