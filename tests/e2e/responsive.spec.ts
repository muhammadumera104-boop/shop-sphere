import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Runs in both projects; the "mobile" project uses a 390px wide phone viewport.
const noHorizontalScroll = async (page: import("@playwright/test").Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test("public pages fit the screen", async ({ page }) => {
  for (const path of ["/", "/search?q=watch", "/product/wireless-earbuds-pro", "/shop/ahmed-electronics", "/login"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
});

test("delivery app is usable on a phone", async ({ page }) => {
  await login(page, "rider");
  await page.goto("/delivery");
  await noHorizontalScroll(page);
  await expect(page.getByRole("navigation", { name: "Delivery" })).toBeVisible();
});

test("seller dashboard has a mobile menu", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await login(page, "seller");
  await page.goto("/seller");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Digital Khata" })).toBeVisible();
});
