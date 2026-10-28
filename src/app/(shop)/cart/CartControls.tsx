"use client";
import { useActionState } from "react";
import { applyCouponAction, removeCouponAction, updateCartAction } from "@/app/actions/shop";
import { FormMessage, SubmitButton, useRefreshOnSuccess } from "@/components/forms";
import { TrashIcon } from "@/components/icons";

export function CartLine({ itemId, quantity, max }: { itemId: string; quantity: number; max: number }) {
  const [state, action, pending] = useActionState(updateCartAction, null);
  useRefreshOnSuccess(state);
  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action} className="inline-flex items-center rounded-full border border-line bg-white" aria-busy={pending}>
        <input type="hidden" name="itemId" value={itemId} />
        <button name="quantity" value={Math.max(0, quantity - 1)} className="size-8" aria-label="Decrease quantity" disabled={pending}>
          −
        </button>
        <span className="w-7 text-center text-sm font-medium" aria-label="Quantity">
          {quantity}
        </span>
        <button name="quantity" value={quantity + 1} className="size-8 disabled:opacity-30" aria-label="Increase quantity" disabled={pending || quantity >= max}>
          +
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="itemId" value={itemId} />
        <button name="quantity" value="0" className="text-muted hover:text-rose-600 inline-flex items-center gap-1 text-xs" aria-label="Remove item">
          <TrashIcon className="size-4" /> Remove
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="text-xs text-rose-700 max-w-40 text-right">
          {state.error}
        </p>
      )}
    </div>
  );
}

export function CouponBox({ applied }: { applied: string | null }) {
  const [state, action] = useActionState(applyCouponAction, null);
  const [removed, remove] = useActionState(removeCouponAction, null);
  useRefreshOnSuccess(state);
  useRefreshOnSuccess(removed);
  if (applied) {
    return (
      <form action={remove} className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
        <span>
          Coupon <strong>{applied}</strong> applied
        </span>
        <button className="text-xs text-rose-600 font-medium">Remove</button>
      </form>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="coupon" className="text-sm font-medium">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input id="coupon" name="code" placeholder="e.g. EID20" className="input uppercase" autoComplete="off" />
        <SubmitButton variant="secondary">Apply</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
