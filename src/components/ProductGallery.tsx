"use client";
import { useCallback, useEffect, useState } from "react";
import { ProductTile, cx } from "./ui";

type Slide = { id: string; url: string | null; gradient: number };

/** Main image with thumbnail switching, hover zoom, and a full-screen lightbox (Esc / arrows / click outside). */
export function ProductGallery({
  slides,
  title,
}: {
  slides: Slide[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const count = slides.length;
  const go = useCallback(
    (d: number) => setIndex((i) => (i + d + count) % count),
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  const cur = slides[index];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(
            `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
          );
        }}
        aria-label={`Enlarge image of ${title}`}
        className="group relative block w-full overflow-hidden rounded-2xl cursor-zoom-in focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <div
          className="transition-transform duration-300 ease-out group-hover:scale-[1.6]"
          style={{ transformOrigin: origin }}
        >
          <ProductTile
            gradient={cur.gradient}
            imageUrl={cur.url}
            label={`${title}, view ${index + 1}`}
            className="aspect-square w-full"
          />
        </div>
        <span className="absolute bottom-3 right-3 rounded-full bg-navy/70 text-white text-xs px-3 py-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          Click to enlarge
        </span>
      </button>

      {count > 1 && (
        <div
          className="grid grid-cols-4 gap-3 mt-3"
          role="tablist"
          aria-label="Product images"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show view ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx(
                "rounded-xl overflow-hidden ring-2 transition",
                i === index
                  ? "ring-indigo-600"
                  : "ring-transparent hover:ring-indigo-200",
              )}
            >
              <ProductTile
                gradient={s.gradient}
                imageUrl={s.url}
                label={`${title} thumbnail ${i + 1}`}
                className="aspect-square w-full"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-4 page-enter"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} images`}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 size-11 rounded-full bg-white/10 text-white text-2xl hover:bg-white/20"
          >
            ×
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 sm:left-8 size-11 rounded-full bg-white/10 text-white text-2xl hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 sm:right-8 size-11 rounded-full bg-white/10 text-white text-2xl hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
          <div
            className="w-full max-w-[min(90vw,80vh)]"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductTile
              gradient={cur.gradient}
              imageUrl={cur.url}
              label={`${title}, view ${index + 1}`}
              className="aspect-square w-full rounded-2xl"
            />
            <p className="text-center text-white/80 text-sm mt-3">
              {title} · {index + 1} / {count}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
