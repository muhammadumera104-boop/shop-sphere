import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { GRADIENTS } from "@/lib/constants";
import { titleCase } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const VARIANTS = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
  secondary: "bg-white text-ink border border-line hover:bg-gray-50",
  dark: "bg-navy text-white hover:bg-navy-3",
  gold: "bg-gold text-navy hover:brightness-95 font-semibold",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  dangerSolid: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "text-indigo-600 hover:bg-indigo-50",
} as const;
const SIZES = { sm: "h-8 px-3 text-xs", md: "h-10 px-5 text-sm", lg: "h-12 px-7 text-base" } as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof SIZES = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium hover:-translate-y-px hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof SIZES }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof SIZES }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, children, ...p }: ComponentProps<"div">) {
  return (
    <div className={cx("card", className)} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle }: { title: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  gold: "bg-gold-soft text-gold-ink ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  navy: "bg-navy text-white ring-navy",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  PENDING: "gold",
  CONFIRMED: "indigo",
  PACKED: "sky",
  SHIPPED: "violet",
  DELIVERED: "emerald",
  CANCELLED: "rose",
  RETURNED: "gray",
  ACTIVE: "emerald",
  APPROVED: "emerald",
  PAUSED: "gold",
  DRAFT: "gray",
  ARCHIVED: "gray",
  REJECTED: "rose",
  SUSPENDED: "rose",
  REMOVED: "rose",
  ASSIGNED: "gold",
  PICKED_UP: "sky",
  OUT_FOR_DELIVERY: "violet",
  FAILED: "rose",
  REQUESTED: "gold",
  REFUNDED: "emerald",
  OPEN: "rose",
  RESOLVED_BUYER: "emerald",
  RESOLVED_SELLER: "indigo",
  CLOSED: "gray",
  KEPT: "emerald",
  WARNED: "gold",
  PAID: "emerald",
  SCHEDULED: "sky",
  EXPIRED: "gray",
  OUT_OF_STOCK: "rose",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "gray"}>{label ?? titleCase(status)}</Badge>;
}

export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cx("rounded-full", size === "sm" ? "size-2" : "size-2.5", i <= full ? "bg-gold" : "bg-gray-200")} />
        ))}
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </span>
  );
}

export function ProductTile({
  gradient,
  imageUrl,
  className,
  label,
}: {
  gradient: number;
  imageUrl?: string | null;
  className?: string;
  label?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={label ?? ""} loading="lazy" decoding="async" className={cx("object-cover bg-gray-100", className)} />;
  }
  return (
    <div role="img" aria-label={label ?? "Product image"} className={cx("relative overflow-hidden bg-gradient-to-br", GRADIENTS[gradient % GRADIENTS.length], className)}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-square rounded-full bg-white/25" />
      <div className="absolute right-[14%] top-[16%] w-[14%] aspect-square rounded-full bg-white/30" />
    </div>
  );
}

export function Avatar({ name, className, tone = "indigo" }: { name: string; className?: string; tone?: "indigo" | "emerald" | "violet" | "gold" }) {
  const tones = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    gold: "bg-gold-soft text-gold-ink",
  };
  return (
    <span aria-hidden className={cx("inline-flex items-center justify-center rounded-full font-semibold shrink-0", tones[tone], className ?? "size-10")}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function EmptyState({ title, body, action, icon = "○" }: { title: string; body?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="size-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4" aria-hidden>
        {icon}
      </div>
      <h3 className="font-semibold text-ink">{title}</h3>
      {body && <p className="text-sm text-muted mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, action, sample }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; sample?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        {sample && <p className="text-xs text-gray-400 mt-1">Sample data</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function KpiCard({ label, value, tone = "indigo", hint, href }: { label: string; value: ReactNode; tone?: "indigo" | "emerald" | "rose" | "gold" | "violet" | "sky"; hint?: ReactNode; href?: string }) {
  const edge = {
    indigo: "border-l-indigo-600",
    emerald: "border-l-emerald-500",
    rose: "border-l-rose-500",
    gold: "border-l-gold",
    violet: "border-l-violet-600",
    sky: "border-l-sky-500",
  };
  const body = (
    <>
      <p className="label-caps flex items-center justify-between">
        {label}
        {href && (
          <span aria-hidden className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition">
            →
          </span>
        )}
      </p>
      <p className="text-2xl font-bold text-ink mt-1.5">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cx("card card-hover group block p-4 border-l-4", edge[tone])} aria-label={`${label}: view details`}>
        {body}
      </Link>
    );
  return <div className={cx("card p-4 border-l-4", edge[tone])}>{body}</div>;
}

export function Tabs({ tabs, active }: { tabs: { key: string; label: ReactNode; href: string }[]; active: string }) {
  return (
    <nav className="flex gap-2 overflow-x-auto scrollbar-none pb-1" aria-label="Tabs">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cx(
            "rounded-full px-4 h-9 inline-flex items-center text-sm font-medium whitespace-nowrap transition-colors",
            t.key === active ? "bg-indigo-600 text-white" : "bg-white border border-line text-gray-700 hover:bg-gray-50",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="h-9 px-3 rounded-full border border-line bg-white text-sm inline-flex items-center">
          Prev
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && nums[i - 1] !== n - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cx("size-9 rounded-full text-sm inline-flex items-center justify-center", n === page ? "bg-indigo-600 text-white" : "bg-white border border-line")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="h-9 px-3 rounded-full border border-line bg-white text-sm inline-flex items-center">
          Next
        </Link>
      )}
    </nav>
  );
}

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Progress({ value, max, tone = "indigo" }: { value: number; max: number; tone?: "indigo" | "emerald" | "rose" | "gold" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const c = { indigo: "bg-indigo-600", emerald: "bg-emerald-500", rose: "bg-rose-500", gold: "bg-gold" };
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx("h-full rounded-full", c[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function NotConfigured({ children = "Not configured" }: { children?: ReactNode }) {
  return <Badge tone="gold">{children}</Badge>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("relative overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export const th = "text-left label-caps font-semibold px-4 py-3 border-b border-line whitespace-nowrap";
export const td = "px-4 py-3 border-b border-gray-100 align-middle";
