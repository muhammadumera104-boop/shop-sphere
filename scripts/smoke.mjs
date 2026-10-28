// Development smoke test: logs in as each demo role (via a temporary DB session) and requests every page.
// Usage: start the app (npm run start), then `node scripts/smoke.mjs [baseUrl]`. Never run against production.
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("Smoke test is for development only.");
const BASE = process.argv[2] ?? "http://localhost:3000";
const prisma = new PrismaClient();
const created = [];

async function sessionFor(email) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const token = crypto.randomBytes(32).toString("base64url");
  const s = await prisma.session.create({
    data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600_000) },
  });
  created.push(s.id);
  return `ss_session=${token}`;
}

async function hit(path, cookie, expect) {
  const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  const loc = res.headers.get("location") ?? "";
  let ok;
  if (expect === 200) ok = res.status === 200 && !body.includes("Something went wrong");
  else if (expect === "login") ok = [302, 303, 307].includes(res.status) && loc.includes("/login");
  else if (expect === "forbidden") ok = ([302, 303, 307].includes(res.status) && loc.includes("/forbidden")) || res.status === 404 || res.status === 403;
  // Pages under a loading.tsx boundary stream, so notFound() renders the 404 UI with status 200.
  else if (expect === 404) ok = res.status === 404 || (res.status === 200 && body.includes("Page not found"));
  else ok = res.status === expect;
  return { path, status: res.status, loc, ok, expect };
}

const seller = await prisma.user.findUniqueOrThrow({ where: { email: "seller@shopsphere.test" }, include: { shop: true } });
const product = await prisma.product.findFirstOrThrow({ where: { shopId: seller.shop.id } });
const party = await prisma.khataParty.findFirstOrThrow({ where: { shopId: seller.shop.id } });
const outForDelivery = await prisma.shipment.findFirst({ where: { status: "OUT_FOR_DELIVERY" }, include: { order: true } });
const otherShopProduct = await prisma.product.findFirstOrThrow({ where: { shopId: { not: seller.shop.id } } });

const cookies = {
  buyer: await sessionFor("buyer@shopsphere.test"),
  seller: await sessionFor("seller@shopsphere.test"),
  admin: await sessionFor("admin@shopsphere.test"),
  rider: await sessionFor("rider@shopsphere.test"),
};

const plan = [
  // Public (guest)
  ...["/", "/category/electronics", "/search?q=earbuds", "/search?q=earbuds&max=5000&rating=4&sort=price_asc", "/product/wireless-earbuds-pro", "/shop/ahmed-electronics", "/login", "/cart", "/help"].map((p) => [p, null, 200]),
  ["/checkout", null, "login"],
  ["/account/profile", null, "login"],
  ["/seller", null, "login"],
  ["/admin", null, "login"],
  ["/delivery", null, "login"],
  ["/product/does-not-exist", null, 404],
  ["/shop/usman-traders", null, 404], // pending shop is not public
  // Buyer
  ...["/", "/cart", "/checkout", "/account/profile", "/account/addresses", "/account/orders", "/account/orders?tab=shipped", "/account/orders/1042", "/account/wishlist", "/account/reviews", "/account/reviews?tab=mine", "/account/returns", "/account/notifications", "/open-shop"].map((p) => [p, cookies.buyer, 200]),
  ["/account/orders/1030", cookies.buyer, 404], // someone else's order
  ["/seller", cookies.buyer, 307], // -> /open-shop
  ["/admin", cookies.buyer, "forbidden"],
  ["/delivery", cookies.buyer, "forbidden"],
  // Seller
  ...[
    "/seller",
    "/seller/products",
    "/seller/products?status=OUT_OF_STOCK",
    "/seller/products/new",
    `/seller/products/${product.id}`,
    "/seller/inventory",
    "/seller/inventory?bulk=1",
    "/seller/orders",
    "/seller/orders?tab=ALL",
    "/seller/orders?tab=RETURNS",
    "/seller/promotions",
    "/seller/khata/customers",
    "/seller/khata/customers?type=SUPPLIER",
    `/seller/khata/ledger/${party.id}`,
    `/seller/khata/ledger/${party.id}/statement`,
    "/seller/khata/expenses",
    "/seller/reports",
    "/seller/reports/export?from=2026-10-01&to=2026-10-28",
    "/seller/settings",
  ].map((p) => [p, cookies.seller, 200]),
  [`/seller/products/${otherShopProduct.id}`, cookies.seller, 404],
  ["/admin", cookies.seller, "forbidden"],
  // Admin
  ...["/admin", "/admin/sellers", "/admin/sellers?tab=APPROVED", "/admin/listings", "/admin/listings?tab=new", "/admin/categories", "/admin/disputes", "/admin/disputes?tab=disputes", "/admin/disputes?tab=refunds", "/admin/disputes?tab=exceptions", "/admin/promotions", "/admin/audit", "/admin/audit/export", "/admin/settings", "/admin/settings?tab=payments"].map((p) => [p, cookies.admin, 200]),
  ["/seller", cookies.admin, "forbidden"],
  ["/account/profile", cookies.admin, "forbidden"],
  // Delivery
  ["/delivery", cookies.rider, 200],
  ["/delivery?view=history", cookies.rider, 200],
  ["/delivery/1042", cookies.rider, 200],
  ...(outForDelivery ? [[`/delivery/${outForDelivery.order.number}/confirm`, cookies.rider, 200]] : []),
  ["/admin", cookies.rider, "forbidden"],
];

let failed = 0;
try {
  for (const [path, cookie, expect] of plan) {
    const r = await hit(path, cookie, expect);
    const who = Object.entries(cookies).find(([, c]) => c === cookie)?.[0] ?? "guest";
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${who.padEnd(6)} ${String(r.status).padEnd(4)} ${path}${r.loc ? ` -> ${r.loc}` : ""}${r.ok ? "" : `  (expected ${expect})`}`);
  }
} finally {
  await prisma.session.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
}
console.log(`\n${plan.length - failed}/${plan.length} checks passed`);
process.exit(failed ? 1 : 0);
