import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { saveShopSettingsAction } from "@/app/actions/seller";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Card, Field, StatusPill } from "@/components/ui";
import { UploadIcon } from "@/components/icons";

export const metadata = { title: "Shop settings" };

export default async function ShopSettingsPage() {
  const user = await pageSeller("/seller/settings");
  const shop = await prisma.shop.findUniqueOrThrow({ where: { id: user.shop.id } });
  const products = await prisma.product.findMany({ where: { shopId: shop.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true, featured: true }, orderBy: { title: "asc" } });
  return (
    <ActionForm action={saveShopSettingsAction}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shop settings</h1>
          <p className="text-xs text-gray-400 mt-1">Sample data</p>
        </div>
        <SubmitButton>Save changes</SubmitButton>
      </div>
      <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Shop profile</h2>
            <div className="rounded-2xl h-32 bg-gradient-to-r from-violet-600 to-indigo-600 relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {shop.bannerUrl && <img src={shop.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />}
              <div className="absolute left-4 -bottom-0 translate-y-1/3">
                {shop.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logoUrl} alt="" className="size-16 rounded-full ring-4 ring-white object-cover" />
                ) : (
                  <Avatar name={shop.name} className="size-16 text-2xl ring-4 ring-white" />
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-4">
              <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-line p-3 text-sm text-muted cursor-pointer">
                <UploadIcon className="size-5 text-indigo-600" /> Logo
                <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" className="text-xs w-full" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-line p-3 text-sm text-muted cursor-pointer">
                <UploadIcon className="size-5 text-indigo-600" /> Banner
                <input type="file" name="banner" accept="image/jpeg,image/png,image/webp" className="text-xs w-full" />
              </label>
            </div>
            <Field label="Shop name" htmlFor="name">
              <input id="name" name="name" defaultValue={shop.name} required className="input" />
            </Field>
            <Field label="Description" htmlFor="description">
              <textarea id="description" name="description" defaultValue={shop.description} rows={3} className="input" />
            </Field>
          </Card>
          <Card className="p-5 grid sm:grid-cols-2 gap-4">
            <h2 className="font-semibold sm:col-span-2">Contact & pickup address</h2>
            <Field label="City" htmlFor="city">
              <input id="city" name="city" defaultValue={shop.city} required className="input" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" defaultValue={shop.phone} required className="input" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Pickup address" htmlFor="pickupAddress">
                <input id="pickupAddress" name="pickupAddress" defaultValue={shop.pickupAddress} required className="input" />
              </Field>
            </div>
          </Card>
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Shop policies</h2>
            <Field label="Returns" htmlFor="returnPolicy">
              <textarea id="returnPolicy" name="returnPolicy" defaultValue={shop.returnPolicy} rows={3} className="input" />
            </Field>
            <Field label="Shipping" htmlFor="shippingPolicy">
              <textarea id="shippingPolicy" name="shippingPolicy" defaultValue={shop.shippingPolicy} rows={3} className="input" />
            </Field>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Status</h2>
            <StatusPill status={shop.status} label={shop.status === "APPROVED" ? "Verified" : undefined} />
            <p className="text-sm text-muted mt-3">Member since {formatDate(shop.createdAt)}</p>
            <p className="text-sm text-muted">CNIC on file: •••••-•••••••-{shop.cnic.slice(-1) || "?"}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Featured products</h2>
            <fieldset className="space-y-2 max-h-72 overflow-auto">
              <legend className="sr-only">Featured products</legend>
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="featured" value={p.id} defaultChecked={p.featured} className="accent-indigo-600 size-4" />
                  {p.title}
                </label>
              ))}
            </fieldset>
          </Card>
        </div>
      </div>
    </ActionForm>
  );
}
