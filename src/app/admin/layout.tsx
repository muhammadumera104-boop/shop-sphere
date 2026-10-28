import { pageUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { Badge } from "@/components/ui";

export const metadata = { title: { default: "Admin", template: "%s | ShopSphere Admin" } };

const items = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/disputes", label: "Orders" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser("/admin", ["ADMIN"]);
  return (
    <DashboardShell
      items={items}
      label="ADMIN PANEL"
      labelTone="rose"
      topRight={
        <>
          <span className="text-sm text-muted">{user.name}</span>
          <Badge tone="rose">Admin</Badge>
        </>
      }
      footer={
        <form action={logoutAction}>
          <button className="text-white/70 hover:text-white text-sm">Log out</button>
        </form>
      }
    >
      {children}
    </DashboardShell>
  );
}
