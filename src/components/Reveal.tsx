"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "./ui";

/** Fades and slides content in the first time it scrolls into view. `index` staggers siblings. */
export function Reveal({ children, className, index = 0, as: Tag = "div" }: { children: ReactNode; className?: string; index?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  // Content is visible in the server HTML; the hidden state is only armed after hydration, so a JS failure never blanks the page.
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: leave visible, no flash
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={cx(armed && "reveal", armed && shown && "in", className)} style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      {children}
    </Tag>
  );
}
