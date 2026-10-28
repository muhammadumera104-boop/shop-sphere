import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-navy text-white/70 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <Logo dark />
          <p className="text-white/60 max-w-xs">Shop from verified local sellers. Sell online and keep your shop&apos;s Khata in one place.</p>
        </div>
        <FooterCol title="Shop" links={[["Electronics", "/category/electronics"], ["Fashion", "/category/fashion"], ["Home", "/category/home"], ["Grocery", "/category/grocery"]]} />
        <FooterCol title="Account" links={[["My orders", "/account/orders"], ["Wishlist", "/account/wishlist"], ["Returns", "/account/returns"], ["Open a shop", "/open-shop"]]} />
        <FooterCol title="Help" links={[["Cash on delivery", "/help#cod"], ["7-day returns", "/help#returns"], ["Order tracking", "/account/orders"], ["Contact support", "/help#contact"]]} />
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-white/50">
          © {new Date().getFullYear()} ShopSphere. Payments: Cash on Delivery only. Online payment is not configured.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map(([l, h]) => (
          <li key={h}>
            <Link href={h} className="hover:text-white">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
