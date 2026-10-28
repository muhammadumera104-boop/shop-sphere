import Link from "next/link";
import { Suspense } from "react";
import { searchSchema } from "@/lib/validation";
import { searchProducts, type SearchParams } from "@/lib/services/catalog";
import { wishedIds } from "@/lib/viewer";
import { ProductCard } from "./ProductCard";
import { EmptyState, LinkButton, Pagination, cx } from "./ui";
import { SortSelect } from "./SortSelect";

export type RawParams = Record<string, string | string[] | undefined>;

export function parseSearch(raw: RawParams) {
  const p = searchSchema.parse(raw);
  const brands = p.brand ? (Array.isArray(p.brand) ? p.brand : [p.brand]) : [];
  const params: SearchParams = {
    q: p.q || undefined,
    categorySlug: p.category,
    min: p.min,
    max: p.max,
    rating: p.rating,
    brands,
    inStock: p.inStock === "1",
    onSale: p.onSale === "1",
    freeDelivery: p.freeDelivery === "1",
    discount: p.discount,
    sort: p.sort,
    page: p.page,
  };
  return params;
}

export function hrefWith(base: string, raw: RawParams, patch: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || k in patch) continue;
    for (const x of Array.isArray(v) ? v : [v]) u.append(k, x);
  }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== "") u.set(k, v);
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

export async function Listing({ base, raw, params, title, fixedCategory }: { base: string; raw: RawParams; params: SearchParams; title: React.ReactNode; fixedCategory?: string }) {
  const [result, wished] = await Promise.all([searchProducts({ ...params, perPage: 12 }), wishedIds()]);
  const chips: [string, string, string][] = [
    ["max", "5000", "Under Rs. 5,000"],
    ["rating", "4", "4 stars & up"],
    ["freeDelivery", "1", "Free delivery"],
    ["onSale", "1", "On sale"],
  ];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <aside aria-label="Filters">
        <details className="card p-0 group" open>
          <summary className="lg:hidden list-none cursor-pointer px-4 py-3 font-semibold flex justify-between">
            Filters <span aria-hidden>▾</span>
          </summary>
          <form action={base} className="p-4 space-y-5 lg:pt-4">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {params.sort && <input type="hidden" name="sort" value={params.sort} />}
            {!fixedCategory && params.categorySlug && <input type="hidden" name="category" value={params.categorySlug} />}
            <fieldset>
              <legend className="label-caps mb-2">Price range (Rs.)</legend>
              <div className="flex gap-2 items-center">
                <input aria-label="Minimum price" name="min" type="number" min={0} defaultValue={params.min} placeholder="Min" className="input" />
                <span className="text-muted">–</span>
                <input aria-label="Maximum price" name="max" type="number" min={0} defaultValue={params.max} placeholder="Max" className="input" />
              </div>
            </fieldset>
            {result.brands.length > 0 && (
              <fieldset>
                <legend className="label-caps mb-2">Brand</legend>
                <div className="space-y-1.5 max-h-44 overflow-auto">
                  {result.brands.map((b) => (
                    <label key={b} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="brand" value={b} defaultChecked={params.brands?.includes(b)} className="accent-indigo-600 size-4" />
                      {b}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset>
              <legend className="label-caps mb-2">Rating</legend>
              {[4, 3, 0].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm py-0.5">
                  <input type="radio" name="rating" value={r || ""} defaultChecked={(params.rating ?? 0) === r} className="accent-indigo-600 size-4" />
                  {r ? `${r} stars & up` : "Any rating"}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="label-caps mb-2">Availability</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="inStock" value="1" defaultChecked={params.inStock} className="accent-indigo-600 size-4" />
                In stock only
              </label>
            </fieldset>
            <fieldset>
              <legend className="label-caps mb-2">Discount</legend>
              {[10, 20, 30].map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm py-0.5">
                  <input type="radio" name="discount" value={d} defaultChecked={params.discount === d} className="accent-indigo-600 size-4" />
                  {d}% or more
                </label>
              ))}
            </fieldset>
            <div className="flex gap-2">
              <button className="flex-1 h-10 rounded-full bg-indigo-600 text-white text-sm font-medium">Apply filters</button>
              <Link href={params.q ? `${base}?q=${encodeURIComponent(params.q)}` : base} className="h-10 px-4 rounded-full border border-line text-sm inline-flex items-center">
                Clear
              </Link>
            </div>
          </form>
        </details>
      </aside>

      <section aria-label="Results">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted">
              {result.total} {result.total === 1 ? "item" : "items"}
            </p>
          </div>
          <Suspense fallback={null}>
            <SortSelect value={params.sort ?? "relevance"} />
          </Suspense>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-5">
          {chips.map(([k, v, label]) => {
            const active = raw[k] === v;
            return (
              <Link
                key={k}
                href={hrefWith(base, raw, { [k]: active ? undefined : v, page: undefined })}
                aria-pressed={active}
                className={cx("h-8 px-4 rounded-full text-xs font-medium inline-flex items-center whitespace-nowrap border", active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-line")}
              >
                {label}
              </Link>
            );
          })}
        </div>
        {result.items.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="⌕"
              title="No products match"
              body="Try removing a filter or searching for something more general."
              action={
                <LinkButton href={base} variant="secondary">
                  Clear filters
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} product={p} wished={wished.has(p.id)} />
            ))}
          </div>
        )}
        <Pagination page={result.page} pages={result.pages} href={(n) => hrefWith(base, raw, { page: String(n) })} />
      </section>
    </div>
  );
}
