"use client";
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { addToCartAction, toggleWishlistAction } from "@/app/actions/shop";
import { SubmitButton, useRefreshOnSuccess } from "./forms";
import { HeartIcon } from "./icons";
import { cx } from "./ui";

export function AddToCartButton({ variantId, returnTo, full = true }: { variantId: string; returnTo: string; full?: boolean }) {
  const [state, action] = useActionState(addToCartAction, null);
  useRefreshOnSuccess(state);
  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton variant="dark" size="sm" className={full ? "w-full" : ""} pendingText="Adding…">
        {state?.ok ? "Added ✓" : "Add to cart"}
      </SubmitButton>
      {state?.error && (
        <p role="alert" className="text-xs text-rose-700 mt-1">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function WishlistButton({ productId, wished, large }: { productId: string; wished: boolean; large?: boolean }) {
  const [on, setOn] = useState(wished);
  const pathname = usePathname();
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof toggleWishlistAction>>, fd: FormData) => {
    const r = await toggleWishlistAction(prev, fd);
    if (r?.ok) setOn((v) => !v);
    return r;
  }, null);
  useRefreshOnSuccess(state);
  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={pathname} />
      <button
        type="submit"
        aria-pressed={on}
        aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
        title={state?.error ?? undefined}
        className={cx(
          "rounded-full bg-white/95 shadow-sm border border-line flex items-center justify-center hover:scale-105 transition",
          large ? "size-12" : "size-8",
          on ? "text-rose-500" : "text-gray-500",
        )}
      >
        <HeartIcon className={large ? "size-5" : "size-4"} filled={on} />
      </button>
    </form>
  );
}

/** Variant chips + quantity stepper + Add to cart / Buy now on the product page. */
export function BuyBox({ variants, returnTo }: { variants: { id: string; name: string; available: number }[]; returnTo: string }) {
  const first = variants.find((v) => v.available > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(first?.id ?? "");
  const [qty, setQty] = useState(1);
  const [state, action] = useActionState(addToCartAction, null);
  useRefreshOnSuccess(state);
  const current = variants.find((v) => v.id === variantId);
  const max = Math.min(20, current?.available ?? 0);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={qty} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {variants.length > 1 || variants[0]?.name !== "Default" ? (
        <fieldset>
          <legend className="label-caps mb-2">Variant</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                type="button"
                key={v.id}
                disabled={v.available === 0}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                aria-pressed={v.id === variantId}
                className={cx(
                  "h-9 px-4 rounded-full text-sm border transition",
                  v.id === variantId ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium" : "border-line bg-white",
                  v.available === 0 && "opacity-40 line-through cursor-not-allowed",
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex items-center gap-4">
        <span className="label-caps">Quantity</span>
        <div className="inline-flex items-center rounded-full border border-line bg-white">
          <button type="button" className="size-9 text-lg" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-8 text-center font-medium" aria-live="polite">
            {qty}
          </span>
          <button type="button" className="size-9 text-lg" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>
            +
          </button>
        </div>
        {current && current.available > 0 ? (
          <span className="text-sm text-emerald-700 font-medium">In stock{current.available <= 5 ? ` (${current.available} left)` : ""}</span>
        ) : (
          <span className="text-sm text-rose-600 font-medium">Out of stock</span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton size="lg" disabled={!current || current.available === 0} pendingText="Adding…">
          Add to cart
        </SubmitButton>
        <SubmitButton size="lg" variant="dark" name="buyNow" value="1" disabled={!current || current.available === 0}>
          Buy now
        </SubmitButton>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-emerald-700">
          {state.message}{" "}
          <a href="/cart" className="underline font-medium">
            View cart
          </a>
        </p>
      )}
    </form>
  );
}
