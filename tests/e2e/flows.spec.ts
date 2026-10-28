import { expect, test } from "@playwright/test";
import { login, ready, rupees } from "./helpers";

test("guest can browse, search and filter; checkout asks to log in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Featured Deals" })).toBeVisible();
  const search = page.getByPlaceholder("Search products, shops, brands...").first();
  await search.fill("earbuds");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=earbuds/);
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await ready(page);
  await page.getByRole("link", { name: "Under Rs. 5,000" }).click();
  await expect(page).toHaveURL(/max=5000/);
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
});

test("buyer adds to cart, places a COD order and sees its status", async ({ page }) => {
  await login(page, "buyer");
  await page.goto("/product/fast-charger-25w");
  await ready(page);
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("status")).toContainText("Added to cart");

  await page.goto("/cart");
  await expect(page.getByTestId("cart-line").filter({ hasText: "Fast Charger 25W" })).toBeVisible();
  const cartTotal = rupees(await page.getByTestId("cart-total").textContent());
  expect(cartTotal).toBeGreaterThan(0);

  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await ready(page);
  expect(rupees(await page.getByTestId("checkout-total").textContent())).toBe(cartTotal);
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/account\/orders\/\d+\?placed=1/);
  await expect(page.getByText("Order placed!")).toBeVisible();
  await expect(page.getByText("Pending").first()).toBeVisible();
  await page.goto("/account/orders");
  await expect(page.getByTestId("order-card").first()).toBeVisible();
});

test("seller accepts and packs a new order", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/seller/orders?tab=NEW");
  await ready(page);
  const row = page.getByTestId("seller-order-row").first();
  await expect(row).toBeVisible();
  const number = (await row.getByRole("link").first().textContent())!.trim();
  await row.getByRole("button", { name: "Accept" }).click();
  // The accepted order leaves the "New" tab.
  await expect(page.getByTestId("seller-order-row").filter({ hasText: number })).toHaveCount(0);
  await page.goto("/seller/orders?tab=PROCESSING");
  await ready(page);
  const accepted = page.getByTestId("seller-order-row").filter({ hasText: number });
  await expect(accepted).toBeVisible();
  await accepted.getByRole("button", { name: "Mark packed" }).click();
  await expect(accepted).toHaveCount(0);
  await page.goto("/seller/orders?tab=PACKED");
  await expect(page.getByTestId("seller-order-row").filter({ hasText: number })).toBeVisible();
});

test("seller updates stock from inventory", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/seller/inventory");
  await ready(page);
  const row = page.getByRole("row").filter({ hasText: "Power Bank 20000mAh" });
  const before = Number((await row.getByRole("cell").nth(2).textContent())!.match(/\d+/)![0]);
  await row.getByRole("button", { name: "Increase stock by 10" }).click();
  await expect(row.getByRole("cell").nth(2)).toContainText(String(before + 10));
});

test("shopkeeper adds credit, records a payment and sees the right balance", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/seller/khata/customers");
  await page.getByTestId("khata-party").filter({ hasText: "Ali Raza" }).click();
  await ready(page);
  const balance = page.getByTestId("ledger-balance");
  const start = rupees(await balance.textContent());

  await page.locator("summary", { hasText: "You gave" }).click();
  const gave = page.locator("details[open] form").first();
  await gave.getByLabel("Amount (Rs.)").fill("1500");
  await gave.getByRole("button", { name: "Save" }).click();
  await expect(balance).toHaveText(new RegExp(`Rs\\. ${(start + 1500).toLocaleString("en-PK")}`));

  await page.reload();
  await ready(page);
  await page.locator("summary", { hasText: "You got" }).click();
  const got = page.locator("details[open] form").first();
  await got.getByLabel("Amount (Rs.)").fill("700");
  await got.getByRole("button", { name: "Save" }).click();
  await expect(balance).toHaveText(new RegExp(`Rs\\. ${(start + 800).toLocaleString("en-PK")}`));

  const res = await page.request.get(page.url() + "/statement");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("Balance");
});

test("admin reviews sellers, listings and the audit log", async ({ page }) => {
  await login(page, "admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/sellers");
  await ready(page);
  const pendingRow = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Approve" }) }).first();
  if (await pendingRow.isVisible()) {
    const shopName = (await pendingRow.getByRole("cell").first().textContent())!.trim();
    await pendingRow.getByRole("button", { name: "Approve" }).click();
    // Approved shops leave the Pending tab.
    await expect(page.getByRole("row").filter({ hasText: shopName })).toHaveCount(0);
    await page.goto("/admin/audit?action=SELLER_APPROVED");
    await expect(page.getByRole("cell", { name: "Seller Approved" }).first()).toBeVisible();
  }
  await page.goto("/admin/listings");
  await expect(page.getByRole("heading", { name: "Listing moderation" })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByText("All sensitive admin actions are recorded.")).toBeVisible();
});

test("users only see pages for their role", async ({ page }) => {
  await login(page, "buyer");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/forbidden/);
  await page.goto("/delivery");
  await expect(page).toHaveURL(/\/forbidden/);
  await page.goto("/account/orders/1030"); // another buyer's order
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("delivery partner sees assigned shipments", async ({ page }) => {
  await login(page, "rider");
  await expect(page).toHaveURL(/\/delivery/);
  await expect(page.getByRole("heading", { name: "My deliveries" })).toBeVisible();
});

test("delivery partner moves #1042 to delivered with the buyer's code", async ({ browser }) => {
  // Buyer reads the 4-digit code from their order page.
  const buyerCtx = await browser.newContext();
  const buyer = await buyerCtx.newPage();
  await login(buyer, "buyer");
  await buyer.goto("/account/orders/1042");
  const codeText = await buyer.getByText(/Your delivery code is/).textContent();
  const code = codeText!.match(/\d{4}/)![0];

  const riderCtx = await browser.newContext();
  const rider = await riderCtx.newPage();
  await login(rider, "rider");
  await rider.goto("/delivery/1042");
  await ready(rider);
  await rider.getByRole("button", { name: "Mark picked up" }).click();
  await rider.getByRole("button", { name: "Mark out for delivery" }).click();
  await rider.getByRole("link", { name: "Confirm delivery" }).click();
  await ready(rider);
  await rider.getByLabel("Enter customer code").fill(code);
  await rider.getByLabel(/I collected/).check();
  await rider.getByRole("button", { name: "Confirm delivered" }).click();
  await expect(rider).toHaveURL(/\/delivery\?done=1/);

  await buyer.reload();
  await expect(buyer.getByText("Delivered").first()).toBeVisible();
  await buyerCtx.close();
  await riderCtx.close();
});
