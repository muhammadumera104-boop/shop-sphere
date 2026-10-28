import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCartView } from "@/lib/services/cart";
import { formatRs } from "@/lib/format";
import { EmptyState, LinkButton, ProductTile, Card } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import { CartLine, CouponBox } from "./CartControls";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUYER") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card>
          <EmptyState
            icon="🛒"
            title={user ? "Carts are for buyer accounts" : "Log in to see your cart"}
            body={user ? "Admin and delivery accounts cannot shop." : "Your cart is saved to your account so prices and stock are always checked on our servers."}
            action={!user && <LinkButton href="/login?next=/cart">Log in</LinkButton>}
          />
        </Card>
      </div>
    );
  }
  const cart = await getCartView(user.id);
  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card>
          <EmptyState icon="🛒" title="Your cart is empty" body="Browse deals from verified sellers." action={<LinkButton href="/">Start shopping</LinkButton>} />
        </Card>
      </div>
    );
  }
  const blocked = cart.items.some((i) => !i.purchasable);
  const t = cart.totals;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">
        Shopping cart ({cart.count} {cart.count === 1 ? "item" : "items"})
      </h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <Card className="divide-y divide-gray-100">
          {cart.items.map((i) => (
            <div key={i.id} className="p-4 flex gap-4" data-testid="cart-line">
              <Link href={`/product/${i.product.slug}`} className="shrink-0">
                <ProductTile gradient={i.product.gradient} imageUrl={i.product.images[0]?.url} label={i.product.title} className="size-20 sm:size-24 rounded-xl" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${i.product.slug}`} className="font-medium hover:text-indigo-600 line-clamp-2">
                  {i.product.title}
                </Link>
                <p className="text-xs text-muted mt-0.5">
                  {i.variantName !== "Default" && `${i.variantName} · `}
                  {i.product.shop.name}
                </p>
                <p className="font-bold text-indigo-600 mt-1">{formatRs(i.unitPrice)}</p>
                {!i.purchasable && (
                  <p className="text-xs text-rose-600 mt-1" role="alert">
                    {i.available === 0 ? "Out of stock. Remove to continue." : i.available < i.quantity ? `Only ${i.available} available. Lower the quantity.` : "No longer available."}
                  </p>
                )}
              </div>
              <CartLine itemId={i.id} quantity={i.quantity} max={Math.min(20, Math.max(i.available, 1))} />
            </div>
          ))}
        </Card>

        <Card className="p-5 lg:sticky lg:top-24 space-y-4">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatRs(t.subtotal)} />
            {t.discount > 0 && <Row label={`Discount (${cart.couponCode})`} value={`- ${formatRs(t.discount)}`} className="text-emerald-700" />}
            <Row label="Delivery (standard)" value={t.deliveryFee === 0 ? "Free" : formatRs(t.deliveryFee)} />
            {t.shops.length > 1 && <p className="text-xs text-muted">Items ship from {t.shops.length} shops, so delivery is charged per shop.</p>}
            <div className="flex justify-between pt-3 border-t border-line text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-indigo-600" data-testid="cart-total">
                {formatRs(t.total)}
              </dd>
            </div>
          </dl>
          {t.couponError && <p className="text-xs text-rose-600">{t.couponError}</p>}
          <CouponBox applied={cart.couponCode} />
          {blocked ? (
            <p className="text-sm text-rose-600">Fix the items marked in red to continue.</p>
          ) : (
            <LinkButton href="/checkout" size="lg" className="w-full">
              Proceed to checkout
            </LinkButton>
          )}
          <p className="text-xs text-muted flex items-center gap-1.5 justify-center">
            <ShieldIcon className="size-4" /> Secure checkout · Cash on delivery
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
