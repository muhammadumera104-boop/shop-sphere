// Capture screenshots of all 38 pages for visual review (development only).
// Usage: npm run start (in another terminal), then `node scripts/screenshots.mjs`. Output: screenshots/*.png
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const prisma = new PrismaClient();
const seller = await prisma.user.findUniqueOrThrow({ where: { email: "seller@shopsphere.test" }, include: { shop: true } });
const product = await prisma.product.findFirstOrThrow({ where: { shopId: seller.shop.id, sku: "AE-EB-01" } });
const ali = await prisma.khataParty.findFirstOrThrow({ where: { shopId: seller.shop.id, name: "Ali Raza" } });
const ofd = await prisma.shipment.findFirst({ where: { status: "OUT_FOR_DELIVERY" }, include: { order: true } });
await prisma.$disconnect();

const pages = {
  guest: [["01-home", "/"], ["02-category", "/category/electronics"], ["03-search", "/search?q=earbuds"], ["04-product", "/product/wireless-earbuds-pro"], ["05-shop", "/shop/ahmed-electronics"], ["06-login", "/login"]],
  buyer: [["07-cart", "/cart"], ["08-checkout", "/checkout"], ["09-profile", "/account/profile"], ["10-addresses", "/account/addresses"], ["11-orders", "/account/orders"], ["12-tracking", "/account/orders/1042"], ["13-wishlist", "/account/wishlist"], ["14-reviews", "/account/reviews"], ["15-returns", "/account/returns"], ["16-notifications", "/account/notifications"]],
  seller: [["17-seller-dashboard", "/seller"], ["18-products", "/seller/products"], ["19-product-edit", `/seller/products/${product.id}`], ["20-inventory", "/seller/inventory"], ["21-seller-orders", "/seller/orders?tab=ALL"], ["22-promotions", "/seller/promotions"], ["23-khata-customers", "/seller/khata/customers"], ["24-khata-ledger", `/seller/khata/ledger/${ali.id}`], ["25-expenses", "/seller/khata/expenses"], ["26-reports", "/seller/reports"], ["27-shop-settings", "/seller/settings"]],
  admin: [["28-admin", "/admin"], ["29-sellers", "/admin/sellers"], ["30-listings", "/admin/listings"], ["31-categories", "/admin/categories"], ["32-disputes", "/admin/disputes?tab=disputes"], ["33-admin-promotions", "/admin/promotions"], ["34-audit", "/admin/audit"], ["35-settings", "/admin/settings"]],
  rider: [["36-deliveries", "/delivery"], ["37-update-status", "/delivery/1042"], ...(ofd ? [["38-confirm", `/delivery/${ofd.order.number}/confirm`]] : [])],
};
const creds = { buyer: ["buyer@shopsphere.test", "Buyer@12345"], seller: ["seller@shopsphere.test", "Seller@12345"], admin: ["admin@shopsphere.test", "Admin@12345"], rider: ["rider@shopsphere.test", "Rider@12345"] };

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
for (const [role, list] of Object.entries(pages)) {
  const mobile = role === "rider";
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (creds[role]) {
    await page.goto(BASE + "/login");
    await page.waitForLoadState("networkidle");
    const form = page.getByRole("form", { name: "Login" });
    await form.getByLabel("Email").fill(creds[role][0]);
    await form.getByLabel("Password", { exact: true }).fill(creds[role][1]);
    await form.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }
  for (const [name, path] of list) {
    await page.goto(BASE + path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
    console.log("saved", name);
  }
  await ctx.close();
}
await browser.close();
