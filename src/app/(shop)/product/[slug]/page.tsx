import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { effectivePrice, discountPercent } from "@/lib/pricing";
import { formatDate, formatRs, parseJson } from "@/lib/format";
import { isPubliclyVisible } from "@/lib/permissions";
import { cardInclude, publicProductWhere } from "@/lib/services/catalog";
import { getFeeConfig } from "@/lib/settings";
import { wishedIds } from "@/lib/viewer";
import { reportListingAction } from "@/app/actions/shop";
import { ProductCard, ProductGrid } from "@/components/ProductCard";
import { BuyBox, WishlistButton } from "@/components/ProductActions";
import { ClientTabs } from "@/components/ClientTabs";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Badge, EmptyState, ProductTile, Stars } from "@/components/ui";
import { ShieldIcon, TruckIcon } from "@/components/icons";

async function load(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      shop: true,
      category: { include: { parent: true } },
      variants: true,
      images: { orderBy: { sortOrder: "asc" } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  return { title: p && isPubliclyVisible(p) ? p.title : "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await load(slug);
  const user = await getCurrentUser();
  // Sellers may preview their own unpublished products; everyone else sees only public ones.
  const ownerPreview = !!product && user?.shop?.id === product.shopId;
  if (!product || (!isPubliclyVisible(product) && !ownerPreview)) notFound();

  const [related, wished, fees] = await Promise.all([
    prisma.product.findMany({ where: { ...publicProductWhere, categoryId: product.categoryId, id: { not: product.id } }, include: cardInclude, take: 4 }),
    wishedIds(),
    getFeeConfig(),
  ]);
  if (user?.role === "BUYER") {
    await prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      create: { userId: user.id, productId: product.id },
      update: { viewedAt: new Date() },
    });
  }
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const specs = parseJson<{ key: string; value: string }[]>(product.specs, []);
  const variants = product.variants.map((v) => ({ id: v.id, name: v.name, available: Math.max(0, v.stockQuantity - v.reservedQuantity) }));
  const thumbs = product.images.length ? product.images : [0, 1, 2, 3].map((i) => ({ id: String(i), url: null as string | null, g: (product.gradient + i) % 6 }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {ownerPreview && !isPubliclyVisible(product) && (
        <p className="mb-4 rounded-lg bg-gold-soft text-gold-ink text-sm px-4 py-2">
          Preview: this product is not public yet (status {product.status.toLowerCase()}, shop {product.shop.status.toLowerCase()}).
        </p>
      )}
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-5">
        <Link href="/">Home</Link>
        {product.category.parent && (
          <>
            {" > "}
            <Link href={`/category/${product.category.parent.slug}`}>{product.category.parent.name}</Link>
          </>
        )}
        {" > "}
        <Link href={`/category/${product.category.slug}`}>{product.category.name}</Link>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <ProductTile gradient={product.gradient} imageUrl={product.images[0]?.url} label={product.title} className="aspect-square w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-3 mt-3">
            {thumbs.slice(0, 4).map((t, i) => (
              <ProductTile key={t.id} gradient={"g" in t ? t.g : product.gradient} imageUrl={t.url} label={`${product.title} view ${i + 1}`} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.title}</h1>
              <WishlistButton productId={product.id} wished={wished.has(product.id)} large />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Stars value={product.ratingAvg} size="md" />
              <span className="text-sm text-muted">
                {product.ratingAvg.toFixed(1)} ({product.ratingCount} reviews)
              </span>
              {product.brand && <span className="text-sm text-muted">· {product.brand}</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-indigo-600">{formatRs(price)}</span>
              {off > 0 && (
                <>
                  <span className="text-muted line-through">{formatRs(product.price)}</span>
                  <Badge tone="rose">-{off}%</Badge>
                </>
              )}
            </div>
          </div>

          <BuyBox variants={variants} returnTo={`/product/${product.slug}`} />

          <div className="card p-4 flex gap-3 items-start">
            <TruckIcon className="size-6 text-indigo-600 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Delivery in 3-5 days | Cash on delivery</p>
              <p className="text-muted">
                Standard {formatRs(fees.standard)}
                {fees.freeThreshold > 0 && `, free over ${formatRs(fees.freeThreshold)}`} · Express {formatRs(fees.express)} · 7-day returns
              </p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <Avatar name={product.shop.name} className="size-12 text-lg" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">Sold by</p>
              <p className="font-semibold truncate">{product.shop.name}</p>
              {product.shop.status === "APPROVED" && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <ShieldIcon className="size-3.5" /> Verified seller
                </span>
              )}
            </div>
            <Link href={`/shop/${product.shop.slug}`} className="text-sm font-medium text-indigo-600">
              Visit shop
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6 mt-10">
        <ClientTabs
          tabs={[
            { label: "Description", content: <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{product.description || "No description provided."}</p> },
            {
              label: "Specifications",
              content: specs.length ? (
                <dl className="divide-y divide-gray-100 text-sm max-w-xl">
                  {specs.map((s) => (
                    <div key={s.key} className="grid grid-cols-2 py-2">
                      <dt className="text-muted">{s.key}</dt>
                      <dd className="font-medium">{s.value}</dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 py-2">
                    <dt className="text-muted">Condition</dt>
                    <dd className="font-medium">{product.condition.toLowerCase()}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted">No specifications listed.</p>
              ),
            },
            {
              label: `Reviews (${product.reviews.length})`,
              content: product.reviews.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {product.reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-line p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.user.name} className="size-8 text-sm" />
                          <span className="font-medium text-sm">{r.user.name}</span>
                        </div>
                        <Stars value={r.rating} />
                      </div>
                      <p className="text-sm text-gray-700 mt-3">{r.comment}</p>
                      <p className="text-xs text-muted mt-2">
                        {formatDate(r.createdAt)} {r.verified && <Badge tone="emerald">Verified purchase</Badge>}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No reviews yet" body="Buyers can review after their order is delivered." />
              ),
            },
          ]}
        />
      </div>

      {user && user.role === "BUYER" && !ownerPreview && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Report this listing</summary>
          <ActionForm action={reportListingAction} className="mt-3 flex flex-wrap gap-2 items-start max-w-lg">
            <input type="hidden" name="productId" value={product.id} />
            <label className="sr-only" htmlFor="report-reason">
              Reason
            </label>
            <select id="report-reason" name="reason" className="input w-auto">
              <option>Counterfeit brand</option>
              <option>Misleading description</option>
              <option>Wrong category</option>
              <option>Prohibited item</option>
            </select>
            <SubmitButton variant="secondary" size="sm">
              Send report
            </SubmitButton>
          </ActionForm>
        </details>
      )}

      {related.length > 0 && (
        <section className="mt-10" aria-labelledby="related">
          <h2 id="related" className="text-xl font-bold mb-4">
            You may also like
          </h2>
          <ProductGrid>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} wished={wished.has(p.id)} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
