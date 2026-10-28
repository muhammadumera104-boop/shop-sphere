"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; exact?: boolean; match?: string };

function isActive(path: string, item: NavItem) {
  const base = item.match ?? item.href;
  return item.exact ? path === base : path === base || path.startsWith(base + "/");
}

/** Light account menu (buyer). */
export function AccountNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="card p-2 flex lg:flex-col gap-1 overflow-x-auto scrollbar-none">
      {items.map((i) => {
        const active = isActive(path, i);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cx("px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap", active ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-50")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Dark navy sidebar menu (seller / admin). */
export function DarkNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((i) => {
        const active = isActive(path, i);
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx("px-4 py-2.5 rounded-full text-sm font-medium", active ? "bg-indigo-600 text-white" : "text-white/70 hover:text-white hover:bg-white/5")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
