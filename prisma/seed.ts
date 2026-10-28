// Development-only sample data. Refuses to run in production.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const DAY = 86400_000;
const daysAgo = (n: number, hour = 11) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 15, 0, 0);
  return d;
};

export const DEMO = {
  buyer: { email: "buyer@shopsphere.test", password: "Buyer@12345", name: "Hira Khan" },
  seller: { email: "seller@shopsphere.test", password: "Seller@12345", name: "Ahmed Raza" },
  pendingSeller: { email: "newseller@shopsphere.test", password: "Seller@12345", name: "Usman Tariq" },
  admin: { email: "admin@shopsphere.test", password: "Admin@12345", name: "Ayesha Admin" },
  rider: { email: "rider@shopsphere.test", password: "Rider@12345", name: "Kamran Rider" },
};

async function wipe() {
  // Delete in dependency order so the seed can be re-run.
  const t = prisma;
  await t.ticketMessage.deleteMany();
  await t.supportTicket.deleteMany();
  await t.ledgerEntryRevision.deleteMany();
  await t.ledgerEntry.deleteMany();
  await t.khataParty.deleteMany();
  await t.expense.deleteMany();
  await t.listingReport.deleteMany();
  await t.review.deleteMany();
  await t.returnRequest.deleteMany();
  await t.refund.deleteMany();
  await t.shipmentEvent.deleteMany();
  await t.shipment.deleteMany();
  await t.payment.deleteMany();
  await t.orderStatusEvent.deleteMany();
  await t.orderItem.deleteMany();
  await t.order.deleteMany();
  await t.cartItem.deleteMany();
  await t.cart.deleteMany();
  await t.wishlistItem.deleteMany();
  await t.recentlyViewed.deleteMany();
  await t.coupon.deleteMany();
  await t.campaign.deleteMany();
  await t.productImage.deleteMany();
  await t.productVariant.deleteMany();
  await t.product.deleteMany();
  await t.category.deleteMany();
  await t.shop.deleteMany();
  await t.address.deleteMany();
  await t.notification.deleteMany();
  await t.auditLog.deleteMany();
  await t.session.deleteMany();
  await t.user.deleteMany();
  await t.platformSetting.deleteMany();
}

async function main() {
  await wipe();
  const hash = (p: string) => bcrypt.hash(p, 10);

  // ---------- Users ----------
  const buyer = await prisma.user.create({ data: { name: DEMO.buyer.name, email: DEMO.buyer.email, phone: "0300 1234567", passwordHash: await hash(DEMO.buyer.password) } });
  const seller = await prisma.user.create({ data: { name: DEMO.seller.name, email: DEMO.seller.email, phone: "0321 7654321", passwordHash: await hash(DEMO.seller.password) } });
  const admin = await prisma.user.create({ data: { name: DEMO.admin.name, email: DEMO.admin.email, role: "ADMIN", passwordHash: await hash(DEMO.admin.password) } });
  const rider = await prisma.user.create({ data: { name: DEMO.rider.name, email: DEMO.rider.email, phone: "0333 1112223", role: "DELIVERY", passwordHash: await hash(DEMO.rider.password) } });
  const pendingOwner = await prisma.user.create({ data: { name: DEMO.pendingSeller.name, email: DEMO.pendingSeller.email, passwordHash: await hash(DEMO.pendingSeller.password) } });
  const otherPw = await hash("Demo@12345");
  const mkUser = (name: string, email: string) => prisma.user.create({ data: { name, email, passwordHash: otherPw } });
  const [sara, bilal, hina, ali, owner2, owner3, owner4, owner5, owner6] = await Promise.all([
    mkUser("Sara Khan", "sara@shopsphere.test"),
    mkUser("Bilal Ahmed", "bilal@shopsphere.test"),
    mkUser("Hina Malik", "hina@shopsphere.test"),
    mkUser("Ali Raza", "ali@shopsphere.test"),
    mkUser("Sana Iqbal", "sana@shopsphere.test"),
    mkUser("Farhan Sheikh", "farhan@shopsphere.test"),
    mkUser("Nadia Hussain", "nadia@shopsphere.test"),
    mkUser("Zain Abbas", "zain@shopsphere.test"),
    mkUser("Rabia Noor", "rabia@shopsphere.test"),
  ]);

  // ---------- Shops ----------
  const ahmed = await prisma.shop.create({
    data: {
      ownerId: seller.id, name: "Ahmed Electronics", slug: "ahmed-electronics", status: "APPROVED", city: "Karachi", phone: "0321 7654321",
      description: "Trusted gadgets, audio and accessories since 2015. Fast dispatch from Saddar, Karachi.",
      pickupAddress: "Shop 12, Electronics Market, Saddar, Karachi", cnic: "42101-1234567-1",
    },
  });
  const fashion = await prisma.shop.create({ data: { ownerId: owner2.id, name: "Sana Fashion House", slug: "sana-fashion-house", status: "APPROVED", city: "Lahore", phone: "0300 5550001", description: "Hand-picked kurtas, lawn and everyday wear.", pickupAddress: "Liberty Market, Lahore", cnic: "35202-1234567-2" } });
  const home = await prisma.shop.create({ data: { ownerId: owner3.id, name: "Home Nest", slug: "home-nest", status: "APPROVED", city: "Islamabad", phone: "0300 5550002", description: "Lamps, kitchenware and cosy home decor.", pickupAddress: "F-7 Markaz, Islamabad", cnic: "61101-1234567-3" } });
  const grocer = await prisma.shop.create({ data: { ownerId: owner4.id, name: "Green Grocer", slug: "green-grocer", status: "APPROVED", city: "Karachi", phone: "0300 5550003", description: "Pantry staples, dry fruits and beauty basics.", pickupAddress: "Bahadurabad, Karachi", cnic: "42201-1234567-4" } });
  await prisma.shop.create({ data: { ownerId: pendingOwner.id, name: "Usman Traders", slug: "usman-traders", status: "PENDING", city: "Faisalabad", phone: "0300 5550004", description: "Wholesale home and kitchen supplies.", pickupAddress: "Clock Tower, Faisalabad", cnic: "33100-1234567-5", createdAt: daysAgo(2) } });
  await prisma.shop.create({ data: { ownerId: owner5.id, name: "Book Corner", slug: "book-corner", status: "PENDING", city: "Lahore", phone: "0300 5550005", description: "New and used books.", pickupAddress: "Urdu Bazaar, Lahore", cnic: "35202-7654321-6", createdAt: daysAgo(1) } });
  await prisma.shop.create({ data: { ownerId: owner6.id, name: "Glow Beauty", slug: "glow-beauty", status: "PENDING", city: "Multan", phone: "0300 5550006", description: "Skincare and cosmetics.", pickupAddress: "Hussain Agahi, Multan", cnic: "36302-7654321-7", createdAt: daysAgo(0, 9) } });

  // ---------- Categories ----------
  const cat = async (name: string, slug: string, sortOrder: number, parentId?: string) =>
    prisma.category.create({ data: { name, slug, sortOrder, parentId } });
  const electronics = await cat("Electronics", "electronics", 1);
  const fashionC = await cat("Fashion", "fashion", 2);
  const homeC = await cat("Home", "home", 3);
  const groceryC = await cat("Grocery", "grocery", 4);
  const beautyC = await cat("Beauty", "beauty", 5);
  const booksC = await cat("Books", "books", 6);
  const audio = await cat("Audio", "audio", 1, electronics.id);
  const wearables = await cat("Wearables", "wearables", 2, electronics.id);
  const accessories = await cat("Accessories", "accessories", 3, electronics.id);
  const men = await cat("Men", "men", 1, fashionC.id);
  const women = await cat("Women", "women", 2, fashionC.id);
  const lighting = await cat("Lighting", "lighting", 1, homeC.id);
  const kitchen = await cat("Kitchen", "kitchen", 2, homeC.id);

  // ---------- Products ----------
  type P = { shopId: string; categoryId: string; title: string; brand: string; price: number; sale?: number; sku: string; g: number; variants: [string, number][]; rating?: number; count?: number; featured?: boolean; status?: string; specs?: [string, string][]; desc?: string };
  const products: P[] = [
    { shopId: ahmed.id, categoryId: audio.id, title: "Wireless Earbuds Pro", brand: "SoundMax", price: 4999, sale: 3499, sku: "AE-EB-01", g: 0, variants: [["Black", 18], ["White", 9], ["Blue", 4]], rating: 4.6, count: 312, featured: true, specs: [["Battery", "30 hours with case"], ["Bluetooth", "5.3"], ["Water resistance", "IPX5"], ["Warranty", "6 months"]], desc: "Crystal-clear sound with active noise cancellation, touch controls and a pocket-size charging case." },
    { shopId: ahmed.id, categoryId: wearables.id, title: "Smart Watch Active", brand: "Pulse", price: 7500, sale: 5990, sku: "AE-SW-02", g: 4, variants: [["Black", 12], ["Silver", 3]], rating: 4.4, count: 128, featured: true, specs: [["Display", "1.8 inch AMOLED"], ["Battery", "7 days"]], desc: "Heart rate, sleep tracking, 100+ sport modes and call alerts." },
    { shopId: ahmed.id, categoryId: accessories.id, title: "Fast Charger 25W", brand: "VoltX", price: 1800, sale: 1499, sku: "AE-CH-03", g: 2, variants: [["Default", 40]], rating: 4.3, count: 86 },
    { shopId: ahmed.id, categoryId: audio.id, title: "Bluetooth Speaker Mini", brand: "SoundMax", price: 3200, sku: "AE-SP-04", g: 3, variants: [["Red", 3], ["Black", 2]], rating: 4.5, count: 64 },
    { shopId: ahmed.id, categoryId: accessories.id, title: "Power Bank 20000mAh", brand: "VoltX", price: 4500, sale: 3799, sku: "AE-PB-05", g: 5, variants: [["Default", 22]], rating: 4.2, count: 51 },
    { shopId: ahmed.id, categoryId: audio.id, title: "Over-Ear Headphones", brand: "Bassline", price: 6200, sale: 4990, sku: "AE-HP-06", g: 0, variants: [["Black", 7]], rating: 4.7, count: 203, featured: true },
    { shopId: ahmed.id, categoryId: accessories.id, title: "USB-C Cable 2m", brand: "VoltX", price: 650, sku: "AE-CB-07", g: 1, variants: [["Default", 0]], rating: 4.0, count: 22 },
    { shopId: ahmed.id, categoryId: wearables.id, title: "Fitness Band Lite", brand: "Pulse", price: 2900, sale: 2399, sku: "AE-FB-08", g: 2, variants: [["Black", 14], ["Pink", 6]], rating: 4.1, count: 37 },
    { shopId: ahmed.id, categoryId: audio.id, title: "Neckband Earphones", brand: "Bassline", price: 1999, sku: "AE-NB-09", g: 4, variants: [["Default", 2]], rating: 3.9, count: 18, status: "PAUSED" },
    { shopId: ahmed.id, categoryId: accessories.id, title: "Wireless Mouse", brand: "Clicky", price: 1500, sale: 1199, sku: "AE-MS-10", g: 3, variants: [["Default", 30]], rating: 4.4, count: 45, status: "DRAFT" },
    { shopId: fashion.id, categoryId: men.id, title: "Cotton Kurta", brand: "Sana", price: 2400, sale: 1899, sku: "SF-KU-01", g: 1, variants: [["S", 10], ["M", 14], ["L", 8]], rating: 4.5, count: 96, featured: true },
    { shopId: fashion.id, categoryId: women.id, title: "Embroidered Lawn Suit", brand: "Sana", price: 5500, sale: 4400, sku: "SF-LW-02", g: 3, variants: [["Unstitched", 20]], rating: 4.8, count: 140 },
    { shopId: fashion.id, categoryId: men.id, title: "Classic Polo Shirt", brand: "Urban", price: 1800, sku: "SF-PO-03", g: 4, variants: [["M", 12], ["L", 9]], rating: 4.2, count: 33 },
    { shopId: fashion.id, categoryId: women.id, title: "Printed Dupatta", brand: "Sana", price: 1200, sale: 950, sku: "SF-DU-04", g: 5, variants: [["Default", 25]], rating: 4.3, count: 41 },
    { shopId: home.id, categoryId: lighting.id, title: "Study Desk Lamp", brand: "Lumo", price: 1250, sku: "HN-LA-01", g: 1, variants: [["White", 16], ["Black", 8]], rating: 4.6, count: 77, featured: true },
    { shopId: home.id, categoryId: kitchen.id, title: "Non-Stick Fry Pan", brand: "ChefPro", price: 3600, sale: 2990, sku: "HN-FP-02", g: 3, variants: [["24 cm", 11], ["28 cm", 6]], rating: 4.4, count: 59 },
    { shopId: home.id, categoryId: kitchen.id, title: "Steel Water Bottle", brand: "ChefPro", price: 1100, sale: 899, sku: "HN-WB-03", g: 2, variants: [["Default", 35]], rating: 4.5, count: 88 },
    { shopId: home.id, categoryId: lighting.id, title: "LED Fairy Lights", brand: "Lumo", price: 900, sku: "HN-FL-04", g: 5, variants: [["Warm", 40]], rating: 4.1, count: 26 },
    { shopId: grocer.id, categoryId: groceryC.id, title: "Premium Basmati Rice 5kg", brand: "Harvest", price: 2600, sale: 2350, sku: "GG-RI-01", g: 1, variants: [["Default", 50]], rating: 4.7, count: 210 },
    { shopId: grocer.id, categoryId: groceryC.id, title: "Mixed Dry Fruits 500g", brand: "Harvest", price: 2200, sku: "GG-DF-02", g: 3, variants: [["Default", 18]], rating: 4.6, count: 70 },
    { shopId: grocer.id, categoryId: beautyC.id, title: "Aloe Vera Face Wash", brand: "Pure", price: 750, sale: 599, sku: "GG-FW-03", g: 2, variants: [["Default", 60]], rating: 4.3, count: 132 },
    { shopId: grocer.id, categoryId: beautyC.id, title: "Herbal Hair Oil", brand: "Pure", price: 650, sku: "GG-HO-04", g: 4, variants: [["Default", 44]], rating: 4.2, count: 54 },
    { shopId: grocer.id, categoryId: booksC.id, title: "Urdu Story Collection", brand: "Readers", price: 1400, sale: 1150, sku: "GG-BK-05", g: 0, variants: [["Paperback", 12]], rating: 4.8, count: 19 },
    { shopId: grocer.id, categoryId: booksC.id, title: "Kids Learning Workbook", brand: "Readers", price: 800, sku: "GG-BK-06", g: 5, variants: [["Default", 25]], rating: 4.5, count: 31 },
  ];
  const created: Record<string, { id: string; variants: { id: string; name: string }[]; price: number; title: string; shopId: string }> = {};
  for (const [i, p] of products.entries()) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const prod = await prisma.product.create({
      data: {
        shopId: p.shopId, categoryId: p.categoryId, title: p.title, slug, brand: p.brand, price: p.price, salePrice: p.sale ?? null, sku: p.sku,
        status: p.status ?? "ACTIVE", gradient: p.g, ratingAvg: p.rating ?? 0, ratingCount: p.count ?? 0, featured: p.featured ?? false,
        description: p.desc ?? `${p.title} by ${p.brand}. Quality checked by the seller and delivered with Cash on Delivery.`,
        specs: JSON.stringify((p.specs ?? [["Brand", p.brand], ["Condition", "New"]]).map(([key, value]) => ({ key, value }))),
        createdAt: daysAgo(30 - i),
        variants: { create: p.variants.map(([name, stockQuantity]) => ({ name, stockQuantity })) },
      },
      include: { variants: true },
    });
    created[p.sku] = { id: prod.id, variants: prod.variants, price: p.sale ?? p.price, title: p.title, shopId: p.shopId };
  }

  // ---------- Addresses ----------
  const home1 = await prisma.address.create({ data: { userId: buyer.id, label: "Home", fullName: "Hira Khan", phone: "0300 1234567", line1: "House 45, Street 7, Block 13-D, Gulshan-e-Iqbal", city: "Karachi", province: "Sindh", isDefault: true } });
  await prisma.address.create({ data: { userId: buyer.id, label: "Work", fullName: "Hira Khan", phone: "0300 1234567", line1: "Office 302, Clifton Centre, Block 5", city: "Karachi", province: "Sindh" } });
  const extraAddr = async (u: { id: string; name: string }) =>
    prisma.address.create({ data: { userId: u.id, label: "Home", fullName: u.name, phone: "0300 0000000", line1: "Street 1, Model Town", city: "Lahore", province: "Punjab", isDefault: true } });
  const addrs = { [sara.id]: await extraAddr(sara), [bilal.id]: await extraAddr(bilal), [hina.id]: await extraAddr(hina), [ali.id]: await extraAddr(ali), [buyer.id]: home1 };

  // ---------- Orders ----------
  const FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];
  let number = 1029;
  type O = { buyer: typeof buyer; items: [string, number, number?][]; status: string; ago: number; shipStatus?: string };
  const orderSpecs: O[] = [
    { buyer: bilal, items: [["AE-SW-02", 1]], status: "DELIVERED", ago: 9 },
    { buyer: sara, items: [["AE-EB-01", 2]], status: "DELIVERED", ago: 8 },
    { buyer: buyer, items: [["SF-KU-01", 1, 1]], status: "DELIVERED", ago: 8 },
    { buyer: hina, items: [["AE-CH-03", 2]], status: "DELIVERED", ago: 7 },
    { buyer: ali, items: [["AE-HP-06", 1]], status: "DELIVERED", ago: 6 },
    { buyer: buyer, items: [["HN-LA-01", 1]], status: "DELIVERED", ago: 6 },
    { buyer: sara, items: [["AE-PB-05", 1]], status: "CANCELLED", ago: 5 },
    { buyer: bilal, items: [["AE-EB-01", 1, 1]], status: "DELIVERED", ago: 5 },
    { buyer: buyer, items: [["AE-FB-08", 1]], status: "DELIVERED", ago: 4 },
    { buyer: hina, items: [["AE-HP-06", 1]], status: "SHIPPED", ago: 3, shipStatus: "OUT_FOR_DELIVERY" },
    { buyer: ali, items: [["AE-SP-04", 1]], status: "DELIVERED", ago: 3 },
    { buyer: bilal, items: [["AE-SW-02", 1]], status: "SHIPPED", ago: 2, shipStatus: "PICKED_UP" },
    { buyer: buyer, items: [["AE-EB-01", 1]], status: "SHIPPED", ago: 2, shipStatus: "ASSIGNED" }, // #1042
    { buyer: sara, items: [["AE-CH-03", 1], ["AE-FB-08", 1]], status: "PACKED", ago: 1 },
    { buyer: hina, items: [["AE-PB-05", 1]], status: "CONFIRMED", ago: 1 },
    { buyer: ali, items: [["AE-EB-01", 1]], status: "PENDING", ago: 0 },
    { buyer: bilal, items: [["AE-HP-06", 1]], status: "PENDING", ago: 0 },
    { buyer: buyer, items: [["GG-RI-01", 1], ["GG-FW-03", 2]], status: "PENDING", ago: 0 },
  ];
  for (const spec of orderSpecs) {
    number++;
    const lines = spec.items.map(([sku, qty, vi]) => {
      const c = created[sku];
      const v = c.variants[vi ?? 0];
      return { c, v, qty };
    });
    const shopId = lines[0].c.shopId;
    const subtotal = lines.reduce((s, l) => s + l.c.price * l.qty, 0);
    const deliveryFee = subtotal >= 5000 ? 0 : 150;
    const created_at = daysAgo(spec.ago, 10 + (number % 8));
    const a = addrs[spec.buyer.id];
    const reached = spec.status === "CANCELLED" ? ["PENDING", "CANCELLED"] : FLOW.slice(0, FLOW.indexOf(spec.status) + 1);
    const order = await prisma.order.create({
      data: {
        number, checkoutGroup: `seed-${number}`, buyerId: spec.buyer.id, shopId,
        addressText: `${a.line1}, ${a.city}`, addressName: a.fullName, addressPhone: a.phone,
        subtotal, discount: 0, deliveryFee, total: subtotal + deliveryFee, status: spec.status, deliveryCode: String(4000 + number).slice(-4),
        createdAt: created_at,
        items: { create: lines.map((l) => ({ productId: l.c.id, variantId: l.v.id, titleSnapshot: l.c.title, variantName: l.v.name, unitPrice: l.c.price, quantity: l.qty, lineTotal: l.c.price * l.qty })) },
        events: { create: reached.map((s, i) => ({ status: s, note: i === 0 ? "Order placed (Cash on Delivery)" : "", createdAt: new Date(created_at.getTime() + i * 5 * 3600_000) })) },
        payment: { create: { method: "COD", amount: subtotal + deliveryFee, status: spec.status === "DELIVERED" ? "PAID" : spec.status === "CANCELLED" ? "FAILED" : "PENDING", collectedAt: spec.status === "DELIVERED" ? new Date(created_at.getTime() + 2 * DAY) : null } },
      },
    });
    // Keep stock bookkeeping consistent: open orders hold a reservation, shipped/delivered already left the shelf.
    for (const l of lines) {
      if (["PENDING", "CONFIRMED", "PACKED"].includes(spec.status)) await prisma.productVariant.update({ where: { id: l.v.id }, data: { reservedQuantity: { increment: l.qty } } });
    }
    if (spec.status === "SHIPPED" || spec.status === "DELIVERED") {
      const shipFlow = ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
      const final = spec.status === "DELIVERED" ? "DELIVERED" : spec.shipStatus ?? "ASSIGNED";
      await prisma.shipment.create({
        data: {
          orderId: order.id, deliveryPartnerId: rider.id, status: final, deliveredAt: final === "DELIVERED" ? new Date(created_at.getTime() + 2 * DAY) : null,
          events: { create: shipFlow.slice(0, shipFlow.indexOf(final) + 1).map((s, i) => ({ status: s, createdAt: new Date(created_at.getTime() + (20 + i * 6) * 3600_000) })) },
        },
      });
    }
  }

  // ---------- Reviews ----------
  const delivered = await prisma.orderItem.findMany({ where: { order: { status: "DELIVERED", buyerId: { not: buyer.id } } }, include: { order: true } });
  const comments = ["Great quality, fast delivery!", "Exactly as described. Recommended.", "Good value for the price.", "Packaging was excellent, works perfectly."];
  for (const [i, it] of delivered.entries()) {
    await prisma.review.create({ data: { productId: it.productId, userId: it.order.buyerId, orderItemId: it.id, rating: i % 3 === 0 ? 4 : 5, comment: comments[i % comments.length], verified: true, createdAt: it.order.createdAt } });
    await prisma.orderItem.update({ where: { id: it.id }, data: { reviewed: true } });
  }

  // ---------- Coupons & campaign ----------
  await prisma.coupon.createMany({
    data: [
      { shopId: ahmed.id, code: "EID20", type: "PERCENT", value: 20, startsAt: daysAgo(10), endsAt: daysAgo(-20), usageLimit: 100, usedCount: 45, minSpend: 2000 },
      { shopId: ahmed.id, code: "WELCOME500", type: "FIXED", value: 500, startsAt: daysAgo(30), endsAt: daysAgo(-60), usageLimit: 500, usedCount: 112, minSpend: 3000 },
      { shopId: ahmed.id, code: "FLASH10", type: "PERCENT", value: 10, startsAt: daysAgo(-5), endsAt: daysAgo(-7), usageLimit: 50, usedCount: 0, minSpend: 0 },
      { shopId: fashion.id, code: "KURTA15", type: "PERCENT", value: 15, startsAt: daysAgo(5), endsAt: daysAgo(-25), usageLimit: 200, usedCount: 20, minSpend: 1500 },
    ],
  });
  await prisma.campaign.createMany({
    data: [
      { name: "Mega Sale Week", description: "Up to 40% off across categories", startsAt: daysAgo(2), endsAt: daysAgo(-5), maxDiscount: 40, sellerCount: 86 },
      { name: "11.11 Flash Sale", description: "Hourly flash deals", startsAt: daysAgo(-14), endsAt: daysAgo(-14), maxDiscount: 50, isFlashSale: true, sellerCount: 42 },
    ],
  });

  // ---------- Wishlist / recently viewed / cart ----------
  for (const sku of ["AE-SW-02", "AE-HP-06", "SF-LW-02", "HN-FP-02", "AE-CB-07", "GG-DF-02"]) await prisma.wishlistItem.create({ data: { userId: buyer.id, productId: created[sku].id } });
  for (const sku of ["AE-SP-04", "HN-WB-03", "SF-PO-03", "GG-BK-05"]) await prisma.recentlyViewed.create({ data: { userId: buyer.id, productId: created[sku].id } });
  await prisma.cart.create({
    data: {
      userId: buyer.id,
      items: { create: [{ variantId: created["AE-EB-01"].variants[0].id, quantity: 1 }, { variantId: created["SF-KU-01"].variants[1].id, quantity: 1 }] },
    },
  });

  // ---------- Notifications ----------
  await prisma.notification.createMany({
    data: [
      { userId: buyer.id, kind: "ORDER", title: "Order #1042 is on its way", body: "Your Wireless Earbuds Pro were handed to the courier.", link: "/account/orders/1042", createdAt: daysAgo(1) },
      { userId: buyer.id, kind: "OFFER", title: "Mega Sale Week is live", body: "Up to 40% off from verified sellers.", link: "/", createdAt: daysAgo(2) },
      { userId: buyer.id, kind: "ACCOUNT", title: "Welcome to ShopSphere", body: "Your account is ready. Add an address to check out faster.", link: "/account/addresses", createdAt: daysAgo(9), readAt: daysAgo(8) },
      { userId: buyer.id, kind: "ORDER", title: "Order #1037 delivered", body: "Tell others what you think. Write a review.", link: "/account/reviews", createdAt: daysAgo(3), readAt: daysAgo(3) },
    ],
  });

  // ---------- Returns, disputes, reports ----------
  const deliveredBuyer = await prisma.orderItem.findFirst({ where: { order: { buyerId: buyer.id, status: "DELIVERED", number: 1035 } }, include: { order: true } });
  if (deliveredBuyer) {
    await prisma.returnRequest.create({
      data: { orderId: deliveredBuyer.orderId, userId: buyer.id, orderItemId: deliveredBuyer.id, reason: "Damaged item", description: "The lamp switch is loose.", status: "APPROVED", history: JSON.stringify([{ status: "REQUESTED", at: daysAgo(4).toISOString() }, { status: "APPROVED", at: daysAgo(3).toISOString() }]), createdAt: daysAgo(4) },
    });
  }
  const disputeOrders = await prisma.order.findMany({ where: { number: { in: [1039, 1030, 1034] } } });
  const issues = ["Item not received", "Wrong item", "Damaged item"];
  for (const [i, o] of disputeOrders.entries()) {
    await prisma.supportTicket.create({
      data: {
        userId: o.buyerId, orderId: o.id, type: "DISPUTE", issue: issues[i % 3], createdAt: daysAgo(2 - i * 0.3),
        messages: { create: [{ authorId: o.buyerId, body: "I need help with this order. Please check.", createdAt: daysAgo(2) }, { authorId: seller.id, body: "We shipped the correct item, sharing the packing photo.", createdAt: daysAgo(1) }] },
      },
    });
  }
  await prisma.listingReport.createMany({
    data: [
      { productId: created["AE-PB-05"].id, reporterId: sara.id, reason: "Misleading capacity", createdAt: daysAgo(1) },
      { productId: created["SF-PO-03"].id, reporterId: bilal.id, reason: "Counterfeit brand", createdAt: daysAgo(2) },
      { productId: created["HN-FL-04"].id, reporterId: hina.id, reason: "Wrong category", createdAt: daysAgo(3) },
    ],
  });

  // ---------- Digital Khata (Ahmed Electronics) ----------
  const party = (name: string, phone: string, type = "CUSTOMER", reminderConsent = true) =>
    prisma.khataParty.create({ data: { shopId: ahmed.id, name, phone, type, reminderConsent } });
  const entry = (partyId: string, type: string, amount: number, ago: number, note: string) =>
    prisma.ledgerEntry.create({ data: { partyId, type, amount, date: daysAgo(ago), note, createdById: seller.id } });
  const pAli = await party("Ali Raza", "0301 2345678");
  await entry(pAli.id, "CREDIT", 2500, 16, "Goods on credit");
  await entry(pAli.id, "PAYMENT", 1000, 13, "Payment received");
  const edited = await entry(pAli.id, "CREDIT", 2700, 8, "Goods on credit");
  await prisma.ledgerEntryRevision.create({ data: { entryId: edited.id, editorId: seller.id, action: "EDIT", before: JSON.stringify({ type: "CREDIT", amount: 2500, note: "Goods on credit" }), after: JSON.stringify({ type: "CREDIT", amount: 2700, note: "Goods on credit" }), createdAt: daysAgo(7) } });
  const pSara = await party("Sara Khan", "0302 3456789");
  await entry(pSara.id, "CREDIT", 4150, 12, "Earbuds and cable on credit");
  await entry(pSara.id, "PAYMENT", 1000, 5, "Cash payment");
  const pBilal = await party("Bilal Ahmed", "0303 4567890", "CUSTOMER", false);
  await entry(pBilal.id, "CREDIT", 3000, 20, "Smart watch on credit");
  await entry(pBilal.id, "PAYMENT", 3000, 10, "Paid in full");
  const pHina = await party("Hina Malik", "0304 5678901");
  await entry(pHina.id, "CREDIT", 5400, 6, "Headphones and charger");
  const sUsman = await party("Usman Traders", "0305 6789012", "SUPPLIER", false);
  await entry(sUsman.id, "CREDIT", 15000, 25, "Stock received: earbuds x10");
  await entry(sUsman.id, "PAYMENT", 6800, 15, "Bank transfer");
  const sCity = await party("City Wholesale", "0306 7890123", "SUPPLIER", false);
  await entry(sCity.id, "CREDIT", 9000, 30, "Cables and chargers");
  await entry(sCity.id, "PAYMENT", 9000, 18, "Paid in full");

  const now = new Date();
  const thisMonth = (day: number) => new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), 12);
  const lastMonth = (day: number) => new Date(now.getFullYear(), now.getMonth() - 1, day, 12);
  await prisma.expense.createMany({
    data: [
      { shopId: ahmed.id, category: "RENT", amount: 30000, date: thisMonth(1), note: "Shop rent" },
      { shopId: ahmed.id, category: "SALARIES", amount: 20000, date: thisMonth(5), note: "Helper salary" },
      { shopId: ahmed.id, category: "TRANSPORT", amount: 5400, date: thisMonth(12), note: "Rickshaw and courier drop-offs" },
      { shopId: ahmed.id, category: "UTILITIES", amount: 4800, date: thisMonth(15), note: "Electricity bill" },
      { shopId: ahmed.id, category: "OTHER", amount: 2200, date: thisMonth(20), note: "Packaging material" },
      { shopId: ahmed.id, category: "RENT", amount: 30000, date: lastMonth(1), note: "Shop rent" },
      { shopId: ahmed.id, category: "SALARIES", amount: 20000, date: lastMonth(5), note: "Helper salary" },
      { shopId: ahmed.id, category: "TRANSPORT", amount: 3900, date: lastMonth(14), note: "Deliveries" },
      { shopId: ahmed.id, category: "UTILITIES", amount: 4200, date: lastMonth(16), note: "Electricity bill" },
    ],
  });

  // ---------- Audit log & settings ----------
  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: "SELLER_APPROVED", target: "Shop: Ahmed Electronics", ip: "127.0.0.1", userAgent: "Seed", createdAt: daysAgo(40) },
      { actorId: admin.id, action: "SELLER_APPROVED", target: "Shop: Sana Fashion House", ip: "127.0.0.1", userAgent: "Seed", createdAt: daysAgo(35) },
      { actorId: admin.id, action: "CATEGORY_CREATED", target: "Category: Books", ip: "127.0.0.1", userAgent: "Seed", createdAt: daysAgo(33) },
      { actorId: admin.id, action: "CAMPAIGN_CREATED", target: "Campaign: Mega Sale Week", ip: "127.0.0.1", userAgent: "Seed", createdAt: daysAgo(3) },
    ],
  });

  console.log("Seeded ShopSphere sample data (development only).");
  console.table(Object.entries(DEMO).map(([role, u]) => ({ role, email: u.email, password: u.password })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
