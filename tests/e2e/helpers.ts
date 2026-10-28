import { expect, type Page } from "@playwright/test";

export const DEMO = {
  buyer: ["buyer@shopsphere.test", "Buyer@12345"],
  seller: ["seller@shopsphere.test", "Seller@12345"],
  admin: ["admin@shopsphere.test", "Admin@12345"],
  rider: ["rider@shopsphere.test", "Rider@12345"],
} as const;

/** Wait until the page has hydrated, so clicks go through React instead of a plain form post. */
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function login(page: Page, who: keyof typeof DEMO, next?: string) {
  const [email, password] = DEMO[who];
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await ready(page);
  const form = page.getByRole("form", { name: "Login" });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await ready(page);
}

/** "Rs. 4,200" -> 4200 */
export function rupees(text: string | null): number {
  return Number((text ?? "").replace(/[^0-9-]/g, ""));
}
