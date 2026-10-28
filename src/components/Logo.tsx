import Link from "next/link";

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 shrink-0" aria-label="ShopSphere home">
      <span className="size-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm" aria-hidden>
        S
      </span>
      <span className={`font-bold text-lg tracking-tight ${dark ? "text-white" : "text-ink"}`}>ShopSphere</span>
    </Link>
  );
}
