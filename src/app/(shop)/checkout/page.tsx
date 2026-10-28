import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { getCartView } from "@/lib/services/cart";
import { getFeeConfig, getSettings } from "@/lib/settings";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await pageUser("/checkout", ["BUYER"]);
  const [standard, express, addresses, fees, settings] = await Promise.all([
    getCartView(user.id, "STANDARD"),
    getCartView(user.id, "EXPRESS"),
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] }),
    getFeeConfig(),
    getSettings(),
  ]);
  if (standard.items.length === 0) redirect("/cart");
  const blocked = standard.items.some((i) => !i.purchasable);
  if (blocked) redirect("/cart");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <CheckoutForm
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, text: `${a.line1}, ${a.city}`, isDefault: a.isDefault }))}
        items={standard.items.map((i) => ({ id: i.id, title: i.product.title, variant: i.variantName, qty: i.quantity, lineTotal: i.unitPrice * i.quantity, gradient: i.product.gradient, image: i.product.images[0]?.url ?? null }))}
        totals={{ STANDARD: standard.totals, EXPRESS: express.totals }}
        fees={fees}
        coupon={standard.couponCode}
        codEnabled={settings.codEnabled === "true"}
      />
    </div>
  );
}
