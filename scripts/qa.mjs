// Browser QA sweep (development only): visits every route per role at desktop + mobile widths and reports
// console errors, failed requests, broken images and horizontal overflow. Screenshots go to screenshots/qa/.
// Usage: npm run dev (other terminal), then `node scripts/qa.mjs`. Optional: BASE=http://localhost:3000
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
  guest: ["/", "/category/electronics", "/search?q=earbuds", "/product/wireless-earbuds-pro", "/shop/ahmed-electronics", "/login", "/help", "/open-shop"],
  buyer: ["/cart", "/checkout", "/account/profile", "/account/addresses", "/account/orders", "/account/orders/1042", "/account/wishlist", "/account/reviews", "/account/returns", "/account/notifications"],
  seller: ["/seller", "/seller/products", `/seller/products/${product.id}`, "/seller/products/new", "/seller/inventory", "/seller/orders?tab=ALL", "/seller/promotions", "/seller/khata/customers", `/seller/khata/ledger/${ali.id}`, "/seller/khata/expenses", "/seller/reports", "/seller/settings"],
  admin: ["/admin", "/admin/sellers", "/admin/listings", "/admin/categories", "/admin/disputes?tab=disputes", "/admin/promotions", "/admin/audit", "/admin/settings"],
  rider: ["/delivery", "/delivery/1042", ...(ofd ? [`/delivery/${ofd.order.number}/confirm`] : [])],
};
const creds = { buyer: ["buyer@shopsphere.test", "Buyer@12345"], seller: ["seller@shopsphere.test", "Seller@12345"], admin: ["admin@shopsphere.test", "Admin@12345"], rider: ["rider@shopsphere.test", "Rider@12345"] };
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

fs.mkdirSync("screenshots/qa", { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
const problems = [];
let visited = 0;

for (const [sizeName, viewport] of Object.entries(sizes)) {
  for (const [role, list] of Object.entries(pages)) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);
    let current = "";
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) problems.push(`[${sizeName}/${role}] ${current} console.${m.type()}: ${m.text().slice(0, 200)}`);
    });
    page.on("pageerror", (e) => problems.push(`[${sizeName}/${role}] ${current} pageerror: ${e.message.slice(0, 200)}`));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("favicon")) problems.push(`[${sizeName}/${role}] ${current} HTTP ${r.status()} ${r.url().slice(0, 120)}`);
    });
    if (creds[role]) {
      await page.goto(BASE + "/login");
      await page.waitForLoadState("networkidle");
      const form = page.getByRole("form", { name: "Login" });
      await form.getByLabel("Email").fill(creds[role][0]);
      await form.getByLabel("Password", { exact: true }).fill(creds[role][1]);
      await form.getByRole("button", { name: "Login", exact: true }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    }
    for (const path of list) {
      current = path;
      const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
      visited++;
      if (!res || res.status() >= 400) problems.push(`[${sizeName}/${role}] ${path} status ${res?.status()}`);
      // scroll through so lazy images and reveals trigger
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(350);
      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 100)),
        hidden: document.querySelectorAll(".reveal:not(.in)").length,
      }));
      if (info.overflow > 1) problems.push(`[${sizeName}/${role}] ${path} horizontal overflow ${info.overflow}px`);
      for (const b of info.broken) problems.push(`[${sizeName}/${role}] ${path} broken image ${b}`);
      if (info.hidden > 0 && sizeName === "desktop") problems.push(`[${sizeName}/${role}] ${path} ${info.hidden} reveal blocks never became visible`);
      const name = `${sizeName}-${role}-${path.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}`;
      if (process.env.SHOTS) await page.screenshot({ path: `screenshots/qa/${name}.png`, fullPage: false });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`Visited ${visited} page loads.`);
if (problems.length) {
  const uniq = [...new Set(problems)];
  console.log(`${uniq.length} problem(s):\n` + uniq.join("\n"));
  process.exit(1);
}
console.log("No console errors, failed requests, broken images or horizontal overflow.");
