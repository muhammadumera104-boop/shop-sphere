import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { cardInclude, publicProductWhere, searchProducts } from "@/lib/services/catalog";
import { wishedIds } from "@/lib/viewer";
import { formatDate } from "@/lib/format";
import { ProductCard, ProductGrid } from "@/components/ProductCard";
import { ClientTabs } from "@/components/ClientTabs";
import { Avatar, Badge, EmptyState, Pagination, Stars } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import { hrefWith, parseSearch, type RawParams } from "@/components/Listing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await prisma.shop.findUnique({ where: { slug } });
  return { title: s?.name ?? "Shop" };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> }) {
  const { slug } = await params;
  const raw = await searchParams;
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop || shop.status !== "APPROVED") notFound();
  const p = parseSearch(raw);
  const [result, featured, reviews, wished, stats] = await Promise.all([
    searchProducts({ ...p, shopId: shop.id, perPage: 12 }),
    prisma.product.findMany({ where: { ...publicProductWhere, shopId: shop.id, featured: true }, include: cardInclude, take: 4 }),
    prisma.review.findMany({ where: { product: { shopId: shop.id } }, include: { user: { select: { name: true } }, product: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    wishedIds(),
    prisma.review.aggregate({ where: { product: { shopId: shop.id } }, _avg: { rating: true }, _count: true }),
  ]);
  const rating = stats._avg.rating ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 sm:p-10">
        <div className="absolute -right-16 -bottom-16 size-64 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
          <Avatar name={shop.name} className="size-20 text-3xl ring-4 ring-white/30" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{shop.name}</h1>
              <Badge tone="emerald">
                <ShieldIcon className="size-3.5" /> Verified
              </Badge>
            </div>
            <p className="text-white/85 mt-1 max-w-2xl">{shop.description}</p>
            <p className="text-sm text-white/70 mt-2">
              ★ {rating.toFixed(1)} ({stats._count} reviews) · {shop.city} · Member since {formatDate(shop.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="card p-5 sm:p-6">
        <ClientTabs
          tabs={[
            {
              label: "Products",
              content: (
                <div className="space-y-8">
                  {featured.length > 0 && (
                    <div>
                      <h2 className="font-semibold mb-3">Featured products</h2>
                      <ProductGrid>
                        {featured.map((x) => (
                          <ProductCard key={x.id} product={x} wished={wished.has(x.id)} compact />
                        ))}
                      </ProductGrid>
                    </div>
                  )}
                  <div>
                    <form className="flex flex-wrap gap-2 mb-4" action={`/shop/${slug}`}>
                      <label htmlFor="shop-q" className="sr-only">
                        Search this shop
                      </label>
                      <input id="shop-q" name="q" defaultValue={p.q} placeholder="Search this shop" className="input max-w-xs" />
                      <select name="sort" defaultValue={p.sort ?? "relevance"} className="input w-auto" aria-label="Sort">
                        <option value="relevance">Best match</option>
                        <option value="newest">Newest</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="price_desc">Price: high to low</option>
                      </select>
                      <button className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm">Filter</button>
                    </form>
                    {result.items.length ? (
                      <ProductGrid>
                        {result.items.map((x) => (
                          <ProductCard key={x.id} product={x} wished={wished.has(x.id)} compact />
                        ))}
                      </ProductGrid>
                    ) : (
                      <EmptyState title="No products found" />
                    )}
                    <Pagination page={result.page} pages={result.pages} href={(n) => hrefWith(`/shop/${slug}`, raw, { page: String(n) })} />
                  </div>
                </div>
              ),
            },
            {
              label: "About",
              content: (
                <div className="text-sm space-y-2 max-w-2xl">
                  <p>{shop.description}</p>
                  <p>
                    <span className="text-muted">City:</span> {shop.city}
                  </p>
                  <p>
                    <span className="text-muted">Contact:</span> {shop.phone}
                  </p>
                </div>
              ),
            },
            {
              label: "Policies",
              content: (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl border border-line p-4">
                    <h3 className="font-semibold mb-1">Returns</h3>
                    <p className="text-gray-700">{shop.returnPolicy}</p>
                  </div>
                  <div className="rounded-xl border border-line p-4">
                    <h3 className="font-semibold mb-1">Shipping</h3>
                    <p className="text-gray-700">{shop.shippingPolicy}</p>
                  </div>
                </div>
              ),
            },
            {
              label: "Reviews",
              content: reviews.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-line p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{r.user.name}</span>
                        <Stars value={r.rating} />
                      </div>
                      <p className="text-xs text-muted">{r.product.title}</p>
                      <p className="mt-2 text-gray-700">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No reviews yet" />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
