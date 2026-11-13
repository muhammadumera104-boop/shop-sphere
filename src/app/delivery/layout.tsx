import Link from "next/link";
import { pageUser } from "@/lib/auth";
import { BoxIcon, HistoryIcon, MapIcon, UserIcon } from "@/components/icons";

export const metadata = { title: { default: "My deliveries", template: "%s | ShopSphere Delivery" } };

/** Mobile-first app shell for delivery partners. */
export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  await pageUser("/delivery", ["DELIVERY"]);
  return (
    <div className="area area-delivery bg-page sm:py-6">
      <div className="mx-auto max-w-md min-h-screen sm:min-h-[calc(100vh-3rem)] bg-page sm:rounded-[2rem] sm:shadow-xl sm:border sm:border-line overflow-hidden relative pb-20">
        <main id="main">{children}</main>
        <nav aria-label="Delivery" className="fixed sm:absolute bottom-0 inset-x-0 mx-auto max-w-md bg-white border-t border-line grid grid-cols-4 text-[11px] font-medium">
          <Tab href="/delivery" label="Shipments" icon={<BoxIcon className="size-5" />} />
          <Tab href="/delivery?view=map" label="Map" icon={<MapIcon className="size-5" />} />
          <Tab href="/delivery?view=history" label="History" icon={<HistoryIcon className="size-5" />} />
          <Tab href="/delivery?view=profile" label="Profile" icon={<UserIcon className="size-5" />} />
        </nav>
      </div>
    </div>
  );
}

function Tab({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-gray-600 hover:text-indigo-600">
      {icon}
      {label}
    </Link>
  );
}
