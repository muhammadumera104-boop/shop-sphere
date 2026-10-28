import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { formatDate, formatRs } from "@/lib/format";
import { Card, EmptyState, LinkButton, PageTitle, ProductTile, StatusPill, Tabs } from "@/components/ui";

export const metadata = { title: "My orders" };

const TABS: Record<string, string[] | undefined> = {
  all: undefined,
  pending: ["PENDING", "CONFIRMED", "PACKED"],
  shipped: ["SHIPPED"],
  delivered: ["DELIVERED"],
  cancelled: ["CANCELLED", "RETURNED"],
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("/account/orders", ["BUYER"]);
  const { tab = "all" } = await searchParams;
  const statuses = TABS[tab];
  const orders = await prisma.order.findMany({
    where: { buyerId: user.id, ...(statuses ? { status: { in: statuses } } : {}) },
    include: { items: { include: { product: { select: { gradient: true, images: { take: 1 } } } } }, shop: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageTitle title="My orders" />
      <div className="mb-5">
        <Tabs
          active={tab}
          tabs={[
            { key: "all", label: "All", href: "/account/orders" },
            { key: "pending", label: "Pending", href: "/account/orders?tab=pending" },
            { key: "shipped", label: "Shipped", href: "/account/orders?tab=shipped" },
            { key: "delivered", label: "Delivered", href: "/account/orders?tab=delivered" },
            { key: "cancelled", label: "Cancelled", href: "/account/orders?tab=cancelled" },
          ]}
        />
      </div>
      {orders.length === 0 ? (
        <Card>
          <EmptyState icon="▢" title="No orders here" body="When you place an order it shows up here with live status." action={<LinkButton href="/">Start shopping</LinkButton>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid="order-card">
              <div className="flex -space-x-3">
                {o.items.slice(0, 3).map((i) => (
                  <ProductTile key={i.id} gradient={i.product.gradient} imageUrl={i.product.images[0]?.url} label={i.titleSnapshot} className="size-14 rounded-xl ring-2 ring-white" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  Order #{o.number} <span className="text-muted font-normal text-sm">· {formatDate(o.createdAt)}</span>
                </p>
                <p className="text-sm text-muted truncate">
                  {o.items.map((i) => i.titleSnapshot).join(", ")} · {o.shop.name}
                </p>
              </div>
              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <span className="font-bold">{formatRs(o.total)}</span>
                <StatusPill status={o.status} />
                <Link href={`/account/orders/${o.number}`} className="h-9 px-4 rounded-full border border-line text-sm font-medium inline-flex items-center hover:bg-gray-50">
                  View details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
