import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { effectivePrice } from "@/lib/pricing";
import { formatRs } from "@/lib/format";
import { availableStock, cardInclude } from "@/lib/services/catalog";
import { isPubliclyVisible } from "@/lib/permissions";
import { moveToCartAction } from "@/app/actions/shop";
import { ActionButton } from "@/components/forms";
import { WishlistButton } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { Card, EmptyState, LinkButton, PageTitle, ProductTile } from "@/components/ui";

export const metadata = { title: "My wishlist" };

export default async function WishlistPage() {
  const user = await pageUser("/account/wishlist", ["BUYER"]);
  const [items, recent] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { userId: user.id }, include: { product: { include: { ...cardInclude, shop: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.recentlyViewed.findMany({ where: { userId: user.id }, include: { product: { include: cardInclude } }, orderBy: { viewedAt: "desc" }, take: 4 }),
  ]);
  return (
    <>
      <PageTitle title={`My wishlist (${items.length})`} />
      {items.length === 0 ? (
        <Card>
          <EmptyState icon="♡" title="Your wishlist is empty" body="Tap the heart on any product to save it here." action={<LinkButton href="/">Browse products</LinkButton>} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(({ product: p }) => {
            const visible = isPubliclyVisible(p);
            const stock = availableStock(p);
            return (
              <Card key={p.id} className="p-3 flex flex-col">
                <div className="relative">
                  <Link href={`/product/${p.slug}`}>
                    <ProductTile gradient={p.gradient} imageUrl={p.images[0]?.url} label={p.title} className="aspect-square w-full rounded-lg" />
                  </Link>
                  <div className="absolute top-2 right-2">
                    <WishlistButton productId={p.id} wished />
                  </div>
                </div>
                <Link href={`/product/${p.slug}`} className="font-medium text-sm mt-3 line-clamp-2">
                  {p.title}
                </Link>
                <p className="font-bold text-indigo-600 mt-1">{formatRs(effectivePrice(p))}</p>
                <p className={`text-xs mt-0.5 ${visible && stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>{!visible ? "Unavailable" : stock > 0 ? "In stock" : "Out of stock"}</p>
                <div className="mt-auto pt-3">
                  {visible && stock > 0 && (
                    <ActionButton action={moveToCartAction} fields={{ productId: p.id }} className="w-full [&>button]:w-full">
                      Move to cart
                    </ActionButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold mb-4">Recently viewed</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recent.map((r) => (
              <ProductCard key={r.id} product={r.product} compact />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
