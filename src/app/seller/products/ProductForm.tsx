"use client";
import { useActionState, useState } from "react";
import { saveProductAction } from "@/app/actions/seller";
import { FormMessage, SubmitButton } from "@/components/forms";
import { ProductTile, cx } from "@/components/ui";
import { UploadIcon } from "@/components/icons";

type Variant = { id?: string; name: string; stock: number; reserved?: number };
type Spec = { key: string; value: string };
export type ProductFormValues = {
  id?: string;
  title: string;
  categoryId: string;
  brand: string;
  condition: string;
  description: string;
  price: number | "";
  salePrice: number | "";
  sku: string;
  status: string;
  lowStockThreshold: number;
  gradient: number;
  featured: boolean;
  variants: Variant[];
  specs: Spec[];
  images: { id: string; url: string }[];
  moderation?: string;
};

export function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: { id: string; name: string; parent: string | null }[] }) {
  const [state, action] = useActionState(saveProductAction, null);
  const [variants, setVariants] = useState<Variant[]>(initial.variants.length ? initial.variants : [{ name: "Default", stock: 0 }]);
  const [specs, setSpecs] = useState<Spec[]>(initial.specs.length ? initial.specs : [{ key: "", value: "" }]);
  const [gradient, setGradient] = useState(initial.gradient);
  const [active, setActive] = useState(initial.status === "ACTIVE");
  const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <form action={action}>
      {initial.id && <input type="hidden" name="productId" value={initial.id} />}
      <input type="hidden" name="status" value={active ? "ACTIVE" : initial.status === "PAUSED" ? "PAUSED" : "DRAFT"} />
      <input type="hidden" name="gradient" value={gradient} />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{initial.id ? "Edit product" : "Add new product"}</h1>
          <p className="text-xs text-gray-400 mt-1">Prices are whole rupees. Totals are always recalculated on the server.</p>
        </div>
        <div className="flex gap-2">
          <SubmitButton variant="secondary" name="intent" value="draft">
            Save draft
          </SubmitButton>
          <SubmitButton name="intent" value="publish" pendingText="Saving…">
            {active ? "Publish" : "Save"}
          </SubmitButton>
        </div>
      </div>
      <div className="mb-4">
        <FormMessage state={state} />
      </div>
      {initial.moderation === "REMOVED" && <p className="mb-4 text-sm rounded-lg bg-rose-50 text-rose-700 px-4 py-2">This listing was removed by moderation. It cannot be published again.</p>}

      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold">Basic info</h2>
            <L label="Title" id="title">
              <input id="title" name="title" defaultValue={initial.title} required minLength={3} className="input" />
            </L>
            <div className="grid sm:grid-cols-3 gap-4">
              <L label="Category" id="categoryId">
                <select id="categoryId" name="categoryId" defaultValue={initial.categoryId} required className="input">
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? `${c.parent} › ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </L>
              <L label="Brand" id="brand">
                <input id="brand" name="brand" defaultValue={initial.brand} className="input" />
              </L>
              <L label="Condition" id="condition">
                <select id="condition" name="condition" defaultValue={initial.condition} className="input">
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="REFURBISHED">Refurbished</option>
                </select>
              </L>
            </div>
            <L label="Description" id="description">
              <textarea id="description" name="description" defaultValue={initial.description} rows={5} className="input" />
            </L>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-4">Pricing</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <L label="Price (Rs.)" id="price">
                <input id="price" name="price" type="number" min={1} step={1} defaultValue={initial.price} required className="input" />
              </L>
              <L label="Sale price (Rs.)" id="salePrice" hint="Optional, lower than price">
                <input id="salePrice" name="salePrice" type="number" min={0} step={1} defaultValue={initial.salePrice} className="input" />
              </L>
              <L label="SKU" id="sku">
                <input id="sku" name="sku" defaultValue={initial.sku} required className="input font-mono" />
              </L>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Variants</h2>
              <button type="button" onClick={() => setVariants((v) => [...v, { name: "", stock: 0 }])} className="text-sm font-medium text-indigo-600" disabled={variants.length >= 20}>
                + Add variant
              </button>
            </div>
            <ul className="space-y-3">
              {variants.map((v, i) => (
                <li key={i} className="flex flex-wrap items-end gap-3">
                  {v.id && <input type="hidden" name={`v${i}.id`} value={v.id} />}
                  <L label="Name (e.g. Black / M)" id={`vn${i}`}>
                    <input id={`vn${i}`} name={`v${i}.name`} value={v.name} onChange={(e) => setVariants((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} required className="input w-48" />
                  </L>
                  <L label="Stock" id={`vs${i}`}>
                    <input
                      id={`vs${i}`}
                      name={`v${i}.stock`}
                      type="number"
                      min={v.reserved ?? 0}
                      value={v.stock}
                      onChange={(e) => setVariants((all) => all.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))}
                      className="input w-28"
                    />
                  </L>
                  {!!v.reserved && <span className="text-xs text-muted pb-3">{v.reserved} reserved</span>}
                  {variants.length > 1 && (
                    <button type="button" className="text-xs text-rose-600 pb-3" onClick={() => setVariants((all) => all.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Specifications</h2>
              <button type="button" onClick={() => setSpecs((s) => [...s, { key: "", value: "" }])} className="text-sm font-medium text-indigo-600" disabled={specs.length >= 20}>
                + Add row
              </button>
            </div>
            <ul className="space-y-2">
              {specs.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                  <input aria-label={`Spec ${i + 1} name`} name={`s${i}.key`} value={s.key} placeholder="e.g. Battery" onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className="input" />
                  <input aria-label={`Spec ${i + 1} value`} name={`s${i}.value`} value={s.value} placeholder="e.g. 30 hours" onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="input" />
                  <button type="button" aria-label="Remove row" className="text-muted px-2" onClick={() => setSpecs((all) => all.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">Images</h2>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-sm text-muted cursor-pointer hover:border-indigo-300 text-center">
              <UploadIcon className="size-6 text-indigo-600" />
              Upload photos (JPG, PNG, WebP · max 2 MB each, up to 4 at a time)
              <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" className="text-xs max-w-full" />
            </label>
            {initial.images.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 mt-3">
                {initial.images.map((img) => (
                  <li key={img.id} className="text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-square w-full object-cover rounded-lg" />
                    <label className="flex items-center gap-1 mt-1">
                      <input type="checkbox" name="removeImage" value={img.id} /> Remove
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="label-caps mt-4 mb-2">No photo? Pick a tile</p>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Gradient tile">
              {[0, 1, 2, 3, 4, 5].map((g) => (
                <button type="button" key={g} role="radio" aria-checked={gradient === g} aria-label={`Tile ${g + 1}`} onClick={() => setGradient(g)} className={cx("rounded-lg overflow-hidden ring-offset-2", gradient === g && "ring-2 ring-indigo-600")}>
                  <ProductTile gradient={g} className="aspect-square w-full" />
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">Status</h2>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium block">{active ? "Active" : "Not published"}</span>
                <span className="text-muted text-xs">Active products are public once your shop is approved.</span>
              </span>
              <button type="button" role="switch" aria-checked={active} onClick={() => setActive((a) => !a)} disabled={initial.moderation === "REMOVED"} className={cx("relative h-6 w-11 rounded-full transition shrink-0", active ? "bg-emerald-500" : "bg-gray-300")}>
                <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition", active ? "left-5.5" : "left-0.5")} />
                <span className="sr-only">Active</span>
              </button>
            </label>
            <label className="flex items-center gap-2 text-sm mt-4">
              <input type="checkbox" name="featured" defaultChecked={initial.featured} className="accent-indigo-600 size-4" /> Feature on my shop page
            </label>
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-semibold">Inventory</h2>
            <p className="text-sm">
              Total stock: <strong>{totalStock}</strong> <span className="text-muted">(set per variant)</span>
            </p>
            <L label="Low-stock alert at" id="lowStockThreshold">
              <input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={initial.lowStockThreshold} className="input" />
            </L>
          </section>
        </div>
      </div>
    </form>
  );
}

function L({ label, id, children, hint }: { label: string; id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
