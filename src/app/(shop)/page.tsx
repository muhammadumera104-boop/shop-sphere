import Link from "next/link";
import { prisma } from "@/lib/db";
import { cardInclude, getCategoriesForNav, publicProductWhere } from "@/lib/services/catalog";
import { wishedIds } from "@/lib/viewer";
import { ProductCard, ProductGrid } from "@/components/ProductCard";
import { Avatar, Badge, EmptyState, LinkButton, Stars } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { ShieldIcon, ReturnIcon, TruckIcon, CheckIcon } from "@/components/icons";

export default async function HomePage() {
  const [categories, featured, newest, shops, wished, campaign] = await Promise.all([
    getCategoriesForNav(),
    prisma.product.findMany({ where: { ...publicProductWhere, featured: true }, include: cardInclude, orderBy: { ratingAvg: "desc" }, take: 4 }),
    prisma.product.findMany({ where: publicProductWhere, include: cardInclude, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.shop.findMany({
      where: { status: "APPROVED" },
      include: { _count: { select: { products: { where: { status: "ACTIVE", moderation: "OK" } } } }, products: { select: { ratingAvg: true }, where: { status: "ACTIVE" } } },
      take: 4,
      orderBy: { createdAt: "asc" },
    }),
    wishedIds(),
    prisma.campaign.findFirst({ where: { startsAt: { lte: new Date() }, endsAt: { gte: new Date() } }, orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-6 sm:px-12 py-12 sm:py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=70"
          alt=""
          aria-hidden
          fetchPriority="high"
          className="parallax absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700/90 via-indigo-600/70 to-violet-600/50" aria-hidden />
        <div className="float-slow absolute -right-10 -top-10 size-56 rounded-full bg-gold/90" aria-hidden />
        <div className="float-slower absolute right-32 bottom-6 size-20 rounded-full bg-gold/60" aria-hidden />
        <div className="float-slow absolute right-10 bottom-[-40px] size-36 rounded-full bg-white/10" aria-hidden />
        <div className="relative max-w-xl page-enter">
          <Badge tone="gold" className="mb-4">
            {campaign ? "Live now" : "Featured"}
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-shine">{campaign?.name ?? "Mega Sale Week"}</h1>
          <p className="mt-3 text-white/85 text-lg">Up to {campaign?.maxDiscount ?? 40}% off | Verified sellers | Cash on delivery</p>
          <LinkButton href="/search?onSale=1" variant="gold" size="lg" className="mt-7">
            Shop now
          </LinkButton>
        </div>
      </section>

      <nav aria-label="Categories" className="flex gap-2 overflow-x-auto scrollbar-none">
        <Link href="/search" className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="h-10 px-5 rounded-full bg-white border border-line text-sm font-medium inline-flex items-center whitespace-nowrap hover:border-indigo-300">
            {c.name}
          </Link>
        ))}
      </nav>

      <Reveal as="section">
      <section aria-labelledby="deals">
        <div className="flex items-end justify-between mb-4">
          <h2 id="deals" className="text-xl font-bold">
            Featured Deals
          </h2>
          <Link href="/search?onSale=1" className="text-sm font-medium text-indigo-600">
            See all
          </Link>
        </div>
        {featured.length ? (
          <ProductGrid>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} wished={wished.has(p.id)} />
            ))}
          </ProductGrid>
        ) : (
          <div className="card">
            <EmptyState title="No deals yet" body="Approved sellers' featured products will show here." />
          </div>
        )}
      </section>
      </Reveal>

      <Reveal>
      <section className="rounded-2xl bg-indigo-50 border border-indigo-100 grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
        {[
          [ShieldIcon, "Verified sellers", "Every shop is approved by our team"],
          [ReturnIcon, "Easy 7-day returns", "Request a return from your orders"],
          [TruckIcon, "Live order tracking", "See every status with timestamps"],
          [CheckIcon, "Secure checkout", "Cash on delivery, prices checked on our servers"],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof ShieldIcon;
          return (
            <div key={title as string} className="flex gap-3 items-start">
              <span className="size-10 shrink-0 rounded-full bg-white text-indigo-600 flex items-center justify-center">
                <I className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-sm">{title as string}</p>
                <p className="text-xs text-muted">{body as string}</p>
              </div>
            </div>
          );
        })}
      </section>
      </Reveal>

      <section aria-labelledby="shops">
        <h2 id="shops" className="text-xl font-bold mb-4">
          Top shops
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shops.map((s, i) => {
            const rating = s.products.length ? s.products.reduce((a, p) => a + p.ratingAvg, 0) / s.products.length : 0;
            return (
              <Link key={s.id} href={`/shop/${s.slug}`} className="card card-hover p-4 flex items-center gap-3">
                <Avatar name={s.name} tone={(["indigo", "violet", "emerald", "gold"] as const)[i % 4]} className="size-12 text-lg" />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.city} · {s._count.products} products
                  </p>
                  <Stars value={rating} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="new">
        <h2 id="new" className="text-xl font-bold mb-4">
          New arrivals
        </h2>
        <ProductGrid>
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} wished={wished.has(p.id)} />
          ))}
        </ProductGrid>
      </section>
    </div>
  );
}
