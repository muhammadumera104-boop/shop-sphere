import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { markNotificationsReadAction } from "@/app/actions/shop";
import { ActionButton } from "@/components/forms";
import { Card, EmptyState, PageTitle, Tabs, cx } from "@/components/ui";
import { BellIcon, BoxIcon, UserIcon } from "@/components/icons";

export const metadata = { title: "Notifications" };

const KINDS: Record<string, string | undefined> = { all: undefined, orders: "ORDER", offers: "OFFER", account: "ACCOUNT" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("/account/notifications", ["BUYER"]);
  const { tab = "all" } = await searchParams;
  const kind = KINDS[tab];
  const items = await prisma.notification.findMany({ where: { userId: user.id, ...(kind ? { kind } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.some((n) => !n.readAt);
  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle="In-app only. SMS and email delivery are not configured."
        action={
          unread && (
            <ActionButton action={markNotificationsReadAction} fields={{}} variant="ghost" size="md">
              Mark all as read
            </ActionButton>
          )
        }
      />
      <div className="mb-5">
        <Tabs
          active={tab}
          tabs={[
            { key: "all", label: "All", href: "/account/notifications" },
            { key: "orders", label: "Orders", href: "/account/notifications?tab=orders" },
            { key: "offers", label: "Offers", href: "/account/notifications?tab=offers" },
            { key: "account", label: "Account", href: "/account/notifications?tab=account" },
          ]}
        />
      </div>
      <Card className="divide-y divide-gray-100">
        {items.length === 0 ? (
          <EmptyState icon="🔔" title="You're all caught up" />
        ) : (
          items.map((n) => {
            const tone = n.kind === "OFFER" ? "bg-gold-soft text-gold-ink" : n.kind === "ACCOUNT" ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-600";
            const Icon = n.kind === "OFFER" ? BellIcon : n.kind === "ACCOUNT" ? UserIcon : BoxIcon;
            const body = (
              <div className={cx("flex gap-4 p-4", !n.readAt && "bg-indigo-50/30")}>
                <span className={cx("size-10 rounded-full flex items-center justify-center shrink-0", tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cx("text-sm", !n.readAt ? "font-semibold" : "font-medium")}>{n.title}</p>
                  <p className="text-sm text-muted">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  {!n.readAt && <span className="size-2.5 rounded-full bg-sky-500" aria-label="Unread" />}
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-gray-50">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })
        )}
      </Card>
    </>
  );
}
