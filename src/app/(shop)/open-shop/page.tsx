import { redirect } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { openShopAction } from "@/app/actions/seller";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field } from "@/components/ui";

export const metadata = { title: "Open your shop" };

export default async function OpenShopPage() {
  const user = await pageUser("/open-shop", ["BUYER"]);
  if (user.shop) redirect("/seller");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-8 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-gold/70" aria-hidden />
        <p className="text-[11px] font-bold tracking-[0.18em] text-gold">SELLER MODE</p>
        <h1 className="text-3xl font-bold mt-2 relative">Open your shop on ShopSphere</h1>
        <p className="text-white/80 mt-2 relative">Same account, new superpowers: list products, process orders and keep your Khata. An admin reviews every new shop before it goes public.</p>
      </div>
      <Card className="p-6">
        <ActionForm action={openShopAction} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Shop name" htmlFor="name">
              <input id="name" name="name" required minLength={3} className="input" placeholder="e.g. Ahmed General Store" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Short description" htmlFor="description">
              <textarea id="description" name="description" rows={3} className="input" />
            </Field>
          </div>
          <Field label="City" htmlFor="city">
            <input id="city" name="city" required className="input" />
          </Field>
          <Field label="Shop phone" htmlFor="phone">
            <input id="phone" name="phone" required className="input" placeholder="0300 1234567" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Pickup address" htmlFor="pickupAddress">
              <input id="pickupAddress" name="pickupAddress" required className="input" />
            </Field>
          </div>
          <Field label="CNIC (for verification)" htmlFor="cnic" hint="Only admins see it. 13 digits, e.g. 42101-1234567-1">
            <input id="cnic" name="cnic" required className="input" inputMode="numeric" />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton size="lg" variant="gold" pendingText="Submitting…">
              Submit for approval
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
