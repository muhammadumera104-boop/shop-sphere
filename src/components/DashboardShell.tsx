"use client";
import { useState, type ReactNode } from "react";
import { DarkNav, type NavItem } from "./SideNav";
import { Logo } from "./Logo";
import { MenuIcon } from "./icons";
import { cx } from "./ui";

/** Navy sidebar layout used by Seller Mode and the Admin panel. */
export function DashboardShell({
  items,
  label,
  labelTone,
  footer,
  topRight,
  children,
}: {
  items: NavItem[];
  label: string;
  labelTone: "gold" | "rose";
  footer?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1">
        <Logo dark href={labelTone === "gold" ? "/seller" : "/admin"} />
        <p className={cx("mt-3 text-[11px] font-bold tracking-[0.18em]", labelTone === "gold" ? "text-gold" : "text-rose-400")}>{label}</p>
      </div>
      <div className="mt-6 flex-1 overflow-y-auto">
        <DarkNav items={items} onNavigate={() => setOpen(false)} />
      </div>
      {footer && <div className="pt-4 border-t border-white/10 text-sm">{footer}</div>}
    </div>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden lg:block bg-navy p-5 sticky top-0 h-screen">{sidebar}</aside>
      <div className="lg:hidden sticky top-0 z-40 bg-navy text-white flex items-center justify-between px-4 h-14">
        <Logo dark />
        <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="p-2">
          <MenuIcon className="size-6" />
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-navy p-5">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0">
        {topRight && <div className="hidden lg:flex justify-end items-center gap-3 px-8 pt-5">{topRight}</div>}
        <main id="main" className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
