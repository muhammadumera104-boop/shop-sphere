import Link from "next/link";
import { Suspense } from "react";
import { HeaderSearch } from "./HeaderSearch";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cartCount } from "@/lib/services/cart";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { cx } from "./ui";
import { HeartIcon, CartIcon, UserIcon, BellIcon } from "./icons";

export async function Header() {
  const user = await getCurrentUser();
  const [count, wish, unread] = user
    ? await Promise.all([
        cartCount(user.id),
        prisma.wishlistItem.count({ where: { userId: user.id } }),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      ])
    : [0, 0, 0];
  const isBuyer = !user || user.role === "BUYER";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
        <Logo />
        <Suspense fallback={<div className="hidden md:flex flex-1 max-w-2xl h-11" />}>
          <HeaderSearch />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {isBuyer ? (
            <div className="hidden sm:flex items-center rounded-full bg-navy p-1 text-xs font-medium" role="group" aria-label="Mode">
              <Link href="/" className="rounded-full px-3 py-1.5 bg-white text-navy" aria-current="page">
                Buyer
              </Link>
              <Link href={user?.shop ? "/seller" : "/open-shop"} className="rounded-full px-3 py-1.5 text-white/80 hover:text-white">
                Seller
              </Link>
            </div>
          ) : (
            <Link
              href={user!.role === "ADMIN" ? "/admin" : "/delivery"}
              className="hidden sm:inline-flex rounded-full bg-navy text-white text-xs font-medium px-4 py-2"
            >
              {user!.role === "ADMIN" ? "Admin panel" : "My deliveries"}
            </Link>
          )}
          <HeaderLink href="/account/wishlist" label="Wishlist" badge={wish}>
            <HeartIcon className="size-5" />
          </HeaderLink>
          <HeaderLink href="/cart" label="Cart" badge={count} testId="header-cart">
            <CartIcon className="size-5" />
          </HeaderLink>
          {user && (
            <HeaderLink href="/account/notifications" label="Alerts" badge={unread} className="hidden sm:inline-flex">
              <BellIcon className="size-5" />
            </HeaderLink>
          )}
          {user ? (
            <details className="relative">
              <summary className="list-none cursor-pointer inline-flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-gray-50">
                <span className="size-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center" aria-hidden>
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden lg:inline text-sm font-medium max-w-28 truncate">{user.name.split(" ")[0]}</span>
                <span className="sr-only">Account menu</span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 card p-2 text-sm z-50">
                <p className="px-3 py-2 text-xs text-muted truncate">{user.email}</p>
                {user.role === "BUYER" && (
                  <>
                    <MenuLink href="/account/profile">My profile</MenuLink>
                    <MenuLink href="/account/orders">My orders</MenuLink>
                    <MenuLink href={user.shop ? "/seller" : "/open-shop"}>{user.shop ? "Seller Mode" : "Open my shop"}</MenuLink>
                  </>
                )}
                {user.role === "ADMIN" && <MenuLink href="/admin">Admin panel</MenuLink>}
                {user.role === "DELIVERY" && <MenuLink href="/delivery">My deliveries</MenuLink>}
                <form action={logoutAction}>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-rose-600">Log out</button>
                </form>
              </div>
            </details>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium hover:bg-gray-50">
              <UserIcon className="size-5" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          )}
        </div>
      </div>
      <Suspense fallback={null}>
        <HeaderSearch mobile />
      </Suspense>
    </header>
  );
}

function HeaderLink({
  href,
  label,
  badge,
  children,
  className,
  testId,
}: {
  href: string;
  label: string;
  badge: number;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cx("relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50", className)}
    >
      {children}
      <span className="hidden lg:inline">
        {label}
        {badge > 0 ? ` (${badge})` : ""}
      </span>
      {badge > 0 && (
        <span className="lg:hidden absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center" aria-label={`${badge} items`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-gray-50">
      {children}
    </Link>
  );
}
