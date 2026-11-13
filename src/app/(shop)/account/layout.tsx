import { pageUser } from "@/lib/auth";
import { AccountNav } from "@/components/SideNav";

const items = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/returns", label: "Returns" },
  { href: "/account/notifications", label: "Notifications" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await pageUser("/account/profile", ["BUYER"]);
  return (
    <div className="area-account bg-page max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start rounded-3xl my-4">
      <div className="lg:sticky lg:top-24">
        <AccountNav items={items} />
      </div>
      <div className="min-w-0 page-enter">{children}</div>
    </div>
  );
}
