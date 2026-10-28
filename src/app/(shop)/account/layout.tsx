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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[230px_1fr] gap-6 items-start">
      <div className="lg:sticky lg:top-24">
        <AccountNav items={items} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
