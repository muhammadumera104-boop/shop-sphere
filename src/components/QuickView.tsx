"use client";
import { useRef } from "react";
import Link from "next/link";
import { ProductTile, Stars, cx } from "./ui";
import { AddToCartButton } from "./ProductActions";

export type QuickViewData = {
  slug: string;
  title: string;
  shop: string;
  brand: string | null;
  off: number;
  imageUrl: string | null;
  gradient: number;
  rating: number;
  ratingCount: number;
  stock: number;
  variantId: string | null;
  variantNames: string[];
  priceLabel: string;
  originalLabel: string;
};

/** Hover/tap "Quick view" that opens a native modal dialog with the key product facts. */
export function QuickView({ data }: { data: QuickViewData }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={`Quick view: ${data.title}`}
        className="absolute inset-x-2 bottom-2 h-9 rounded-full bg-white/95 text-ink text-xs font-semibold shadow-md border border-line backdrop-blur opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0 transition max-sm:opacity-100 max-sm:translate-y-0"
      >
        Quick view
      </button>
      <dialog
        ref={ref}
        className="sheet w-full"
        aria-label={data.title}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="sheet-body mx-auto w-[min(92vw,760px)] max-h-[92dvh] overflow-auto rounded-3xl bg-white shadow-2xl grid sm:grid-cols-2">
          <div className="relative">
            <ProductTile gradient={data.gradient} imageUrl={data.imageUrl} label={data.title} className="w-full h-64 sm:h-full min-h-64 sm:rounded-l-3xl max-sm:rounded-t-3xl" />
            {data.off > 0 && <span className="absolute top-3 left-3 rounded-full bg-rose-500 text-white text-xs font-semibold px-2.5 py-1">-{data.off}%</span>}
          </div>
          <div className="p-6 flex flex-col gap-3">
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close quick view" className="self-end -mt-2 -mr-2 size-9 rounded-full hover:bg-gray-100 text-xl leading-none">
              ×
            </button>
            <p className="label-caps">{data.shop}</p>
            <h3 className="text-xl font-bold text-ink leading-snug">{data.title}</h3>
            <Stars value={data.rating} count={data.ratingCount} size="md" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-600">{data.priceLabel}</span>
              {data.off > 0 && <span className="text-sm text-muted line-through">{data.originalLabel}</span>}
            </div>
            {data.brand && <p className="text-sm text-muted">Brand: {data.brand}</p>}
            {data.variantNames.length > 0 && data.variantNames[0] !== "Default" && <p className="text-sm text-muted">Options: {data.variantNames.join(", ")}</p>}
            <p className={cx("text-sm font-medium", data.stock > 0 ? "text-emerald-700" : "text-rose-600")}>{data.stock > 0 ? (data.stock <= 5 ? `Only ${data.stock} left` : "In stock") : "Out of stock"}</p>
            <div className="mt-auto pt-3 grid gap-2">
              {data.variantId && data.stock > 0 && <AddToCartButton variantId={data.variantId} returnTo={`/product/${data.slug}`} />}
              <Link href={`/product/${data.slug}`} className="h-10 rounded-full border border-line text-sm font-medium inline-flex items-center justify-center hover:bg-gray-50">
                View full details
              </Link>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
