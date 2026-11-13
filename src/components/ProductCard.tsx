import Link from "next/link";
import { effectivePrice, discountPercent } from "@/lib/pricing";
import { formatRs } from "@/lib/format";
import { availableStock, type CardProduct } from "@/lib/services/catalog";
import { ProductTile, Stars } from "./ui";
import { AddToCartButton, WishlistButton } from "./ProductActions";
import { Children } from "react";
import { QuickView } from "./QuickView";
import { Reveal } from "./Reveal";

export function ProductCard({ product, wished = false, compact = false }: { product: CardProduct; wished?: boolean; compact?: boolean }) {
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const stock = availableStock(product);
  const variant = product.variants.find((v) => v.stockQuantity - v.reservedQuantity > 0) ?? product.variants[0];
  return (
    <article className="card card-hover p-3 flex flex-col group" data-testid="product-card">
      <div className="relative">
        <Link href={`/product/${product.slug}`} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-lg">
          <ProductTile gradient={product.gradient} imageUrl={product.images[0]?.url} label={product.title} className="aspect-square w-full rounded-lg zoom-img" />
        </Link>
        {off > 0 && <span className="absolute top-2 left-2 rounded-full bg-rose-500 text-white text-xs font-semibold px-2 py-0.5">-{off}%</span>}
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} wished={wished} />
        </div>
        <QuickView
          data={{
            slug: product.slug, title: product.title, shop: product.shop.name, brand: product.brand, off,
            imageUrl: product.images[0]?.url ?? null, gradient: product.gradient, rating: product.ratingAvg, ratingCount: product.ratingCount,
            stock, variantId: variant?.id ?? null, variantNames: product.variants.map((v) => v.name), priceLabel: formatRs(price), originalLabel: formatRs(product.price),
          }}
        />
      </div>
      <div className="pt-3 flex-1 flex flex-col">
        <Link href={`/product/${product.slug}`} className="font-medium text-ink text-sm leading-snug line-clamp-2 hover:text-indigo-600">
          {product.title}
        </Link>
        {!compact && <p className="text-xs text-muted mt-0.5 truncate">{product.shop.name}</p>}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-bold text-indigo-600">{formatRs(price)}</span>
          {off > 0 && <span className="text-xs text-muted line-through">{formatRs(product.price)}</span>}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <Stars value={product.ratingAvg} />
          {stock === 0 ? <span className="text-xs text-rose-600 font-medium">Out of stock</span> : stock <= 5 ? <span className="text-xs text-gold-ink">Only {stock} left</span> : null}
        </div>
        <div className="mt-3 mt-auto pt-3">
          {variant && stock > 0 ? (
            <AddToCartButton variantId={variant.id} returnTo={`/product/${product.slug}`} />
          ) : (
            <span className="block text-center text-xs text-muted py-2 rounded-full bg-gray-50">Out of stock</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${cols === 4 ? "lg:grid-cols-4" : ""} gap-3 sm:gap-4`}>
      {Children.map(children, (child, i) => (
        <Reveal index={i % 4} className="flex flex-col [&>*]:flex-1">
          {child}
        </Reveal>
      ))}
    </div>
  );
}
