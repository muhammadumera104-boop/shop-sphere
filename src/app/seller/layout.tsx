import Link from "next/link";
import { pageSeller } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/ui";

const items = [
  { href: "/seller", label: "Overview", exact: true },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/inventory", label: "Inventory" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/promotions", label: "Promotions" },
  { href: "/seller/khata/customers", label: "Digital Khata", match: "/seller/khata" },
  { href: "/seller/reports", label: "Reports" },
  { href: "/seller/settings", label: "Shop settings" },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await pageSeller("/seller");
  return (
    <DashboardShell
      items={items}
      label="SELLER MODE"
      labelTone="gold"
      footer={
        <div className="space-y-3 text-white/70">
          <p className="truncate text-white">{user.shop.name}</p>
          <StatusPill status={user.shop.status} label={user.shop.status === "APPROVED" ? "Verified" : undefined} />
          <div className="flex gap-3 text-xs">
            <Link href="/" className="hover:text-white">
              ← Buyer mode
            </Link>
            <form action={logoutAction}>
              <button className="hover:text-white">Log out</button>
            </form>
          </div>
        </div>
      }
    >
      {user.shop.status !== "APPROVED" && (
        <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-gold-soft text-gold-ink px-4 py-3 text-sm">
          {user.shop.status === "PENDING" && "Your shop is waiting for admin approval. You can add products now; they become public once approved."}
          {user.shop.status === "REJECTED" && `Your shop application was rejected. ${user.shop.statusNote}`}
          {user.shop.status === "SUSPENDED" && `Your shop is suspended, so products are hidden. ${user.shop.statusNote}`}
        </div>
      )}
      {children}
    </DashboardShell>
  );
}
