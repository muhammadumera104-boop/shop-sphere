"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction } from "@/app/actions/shop";
import { FormMessage, SubmitButton } from "@/components/forms";
import { Badge, ProductTile, cx } from "@/components/ui";
import { formatRs } from "@/lib/format";
import type { Totals, FeeConfig } from "@/lib/pricing";

type Addr = { id: string; label: string; fullName: string; phone: string; text: string; isDefault: boolean };
type Item = { id: string; title: string; variant: string; qty: number; lineTotal: number; gradient: number; image: string | null };

export function CheckoutForm({
  addresses,
  items,
  totals,
  fees,
  coupon,
  codEnabled,
}: {
  addresses: Addr[];
  items: Item[];
  totals: Record<"STANDARD" | "EXPRESS", Totals>;
  fees: FeeConfig;
  coupon: string | null;
  codEnabled: boolean;
}) {
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [option, setOption] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [state, action] = useActionState(placeOrderAction, null);
  const t = totals[option];
  const step = !addressId ? 0 : 2;

  return (
    <form action={action} className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
      <div className="space-y-5">
        <ol className="card p-4 flex items-center gap-2 text-sm" aria-label="Checkout steps">
          {["Address", "Delivery", "Payment"].map((s, i) => (
            <li key={s} className="flex items-center gap-2 flex-1">
              <span className={cx("size-7 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-indigo-600 text-white" : "bg-gray-100 text-muted")}>{i + 1}</span>
              <span className={i <= step ? "font-medium" : "text-muted"}>{s}</span>
              {i < 2 && <span className={cx("h-0.5 flex-1 rounded", i < step ? "bg-indigo-600" : "bg-gray-200")} />}
            </li>
          ))}
        </ol>

        <fieldset className="card p-5">
          <legend className="sr-only">Delivery address</legend>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Delivery address</h2>
            <Link href="/account/addresses?next=/checkout" className="text-sm font-medium text-indigo-600">
              + Add new address
            </Link>
          </div>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted">
              You have no saved address.{" "}
              <Link href="/account/addresses?next=/checkout" className="text-indigo-600 underline">
                Add one to continue
              </Link>
              .
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {addresses.map((a) => (
                <label key={a.id} className={cx("rounded-xl border-2 p-4 cursor-pointer text-sm", addressId === a.id ? "border-indigo-600 bg-indigo-50/40" : "border-line")}>
                  <input type="radio" name="addressId" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="sr-only" />
                  <span className="flex items-center gap-2 font-semibold">
                    {a.label} {a.isDefault && <Badge tone="emerald">Default</Badge>}
                  </span>
                  <span className="block mt-1">{a.fullName}</span>
                  <span className="block text-muted">{a.text}</span>
                  <span className="block text-muted">{a.phone}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="card p-5">
          <legend className="font-semibold mb-3 float-left w-full">Delivery option</legend>
          <div className="grid sm:grid-cols-2 gap-3 clear-both">
            {(
              [
                ["STANDARD", "Standard (3-5 days)", fees.freeThreshold > 0 ? `${formatRs(fees.standard)}, free over ${formatRs(fees.freeThreshold)} per shop` : formatRs(fees.standard)],
                ["EXPRESS", "Express (1-2 days)", `${formatRs(fees.express)} per shop`],
              ] as const
            ).map(([v, label, hint]) => (
              <label key={v} className={cx("rounded-xl border-2 p-4 cursor-pointer text-sm flex gap-3", option === v ? "border-indigo-600 bg-indigo-50/40" : "border-line")}>
                <input type="radio" name="deliveryOption" value={v} checked={option === v} onChange={() => setOption(v)} className="accent-indigo-600 mt-0.5" />
                <span>
                  <span className="font-semibold block">{label}</span>
                  <span className="text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card p-5">
          <legend className="font-semibold mb-3 float-left w-full">Payment method</legend>
          <div className="space-y-3 clear-both">
            <label className="rounded-xl border-2 border-indigo-600 bg-indigo-50/40 p-4 flex gap-3 text-sm">
              <input type="radio" name="paymentMethod" value="COD" defaultChecked disabled={!codEnabled} className="accent-indigo-600 mt-0.5" />
              <span>
                <span className="font-semibold block">Cash on delivery</span>
                <span className="text-muted">Pay the courier when your parcel arrives.</span>
              </span>
            </label>
            <label className="rounded-xl border-2 border-line p-4 flex gap-3 text-sm opacity-60 cursor-not-allowed">
              <input type="radio" disabled className="mt-0.5" />
              <span>
                <span className="font-semibold block">Online payment (coming soon)</span>
                <span className="text-muted">Not configured. No card details are ever stored by ShopSphere.</span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="card p-5 lg:sticky lg:top-24 space-y-4" aria-label="Order summary">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="space-y-3 max-h-64 overflow-auto">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 text-sm">
              <ProductTile gradient={i.gradient} imageUrl={i.image} label={i.title} className="size-12 rounded-lg shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium">{i.title}</span>
                <span className="text-xs text-muted">
                  {i.variant !== "Default" && `${i.variant} · `}Qty {i.qty}
                </span>
              </span>
              <span className="font-medium">{formatRs(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 text-sm border-t border-line pt-4">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatRs(t.subtotal)}</dd>
          </div>
          {t.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount ({coupon})</dt>
              <dd>- {formatRs(t.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Delivery{t.shops.length > 1 ? ` (${t.shops.length} shops)` : ""}</dt>
            <dd>{t.deliveryFee === 0 ? "Free" : formatRs(t.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between text-base pt-2 border-t border-line">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-indigo-600" data-testid="checkout-total">
              {formatRs(t.total)}
            </dd>
          </div>
        </dl>
        {t.couponError && <p className="text-xs text-rose-600">{t.couponError}</p>}
        <FormMessage state={state} />
        <SubmitButton size="lg" className="w-full" disabled={!addressId || !codEnabled} pendingText="Placing order…">
          Place order
        </SubmitButton>
        <p className="text-xs text-muted text-center">The total is re-checked on our server when you place the order.</p>
      </aside>
    </form>
  );
}
