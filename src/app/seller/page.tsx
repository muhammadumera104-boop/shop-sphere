import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatRs } from "@/lib/format";
import { khataSummary } from "@/lib/services/khata";
import { sellerReport } from "@/lib/services/reports";
import { BarChart } from "@/components/charts";
import { Card, CardHeader, EmptyState, KpiCard, LinkButton, PageTitle, Progress, StatusPill, Table, td, th } from "@/components/ui";

export const metadata = { title: "Seller dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function SellerDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await pageSeller("/seller");
  const { welcome } = await searchParams;
  const shopId = user.shop.id;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekAgo = new Date(start.getTime() - 6 * 86400_000);
  const [todayOrders, report, variants, khata, recent] = await Promise.all([
    prisma.order.findMany({ where: { shopId, createdAt: { gte: start }, status: { not: "CANCELLED" } } }),
    sellerReport(shopId, weekAgo, new Date()),
    prisma.productVariant.findMany({ where: { product: { shopId, status: { not: "ARCHIVED" } } }, include: { product: { select: { lowStockThreshold: true } } } }),
    khataSummary(shopId),
    prisma.order.findMany({ where: { shopId }, include: { buyer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const lowStock = variants.filter((v) => v.stockQuantity - v.reservedQuantity <= v.product.lowStockThreshold).length;
  const revenueToday = todayOrders.reduce((s, o) => s + o.subtotal - o.discount, 0);
  const bars = report.series.map((d) => ({ label: new Date(d.day + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short" }), value: d.sales }));
  const best = bars.reduce((bi, b, i) => (b.value > bars[bi].value ? i : bi), 0);
  const topMax = Math.max(1, ...report.topProducts.map((p) => p.revenue));

  return (
    <>
      {welcome && (
        <div role="status" className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
          Your shop was created. Add your first products while an admin reviews your application.
        </div>
      )}
      <PageTitle title={`${greeting()}, ${user.shop.name}`} sample action={<LinkButton href="/seller/products/new" variant="emerald">+ Add product</LinkButton>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Orders today" value={todayOrders.length} tone="indigo" />
        <KpiCard label="Revenue today" value={formatRs(revenueToday)} tone="emerald" hint={`${formatRs(report.sales)} last 7 days`} />
        <KpiCard label="Low stock" value={`${lowStock} items`} tone="rose" hint={<Link href="/seller/inventory?filter=low" className="underline">View inventory</Link>} />
        <KpiCard label="Khata due" value={formatRs(khata.receivable)} tone="gold" hint={`${khata.customers} customers`} />
      </div>
      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6 mb-6">
        <Card className="p-5">
          <CardHeader title="Sales this week" subtitle="Goods value of non-cancelled orders" />
          <BarChart data={bars} highlight={best} />
        </Card>
        <Card className="p-5">
          <CardHeader title="Top products" subtitle="Last 7 days" />
          {report.topProducts.length === 0 ? (
            <EmptyState title="No sales yet" />
          ) : (
            <ul className="space-y-4">
              {report.topProducts.slice(0, 4).map((p) => (
                <li key={p.title}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium truncate">{p.title}</span>
                    <span className="text-muted">{formatRs(p.revenue)}</span>
                  </div>
                  <Progress value={p.revenue} max={topMax} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <div className="p-5 pb-0">
          <CardHeader title="Recent orders" action={<Link href="/seller/orders" className="text-sm font-medium text-indigo-600">View all</Link>} />
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No orders yet" body="Orders appear here as soon as buyers check out." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Total</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className={td}>
                    <Link href={`/seller/orders?open=${o.id}`} className="font-medium text-indigo-600">
                      #{o.number}
                    </Link>
                  </td>
                  <td className={td}>{o.buyer.name}</td>
                  <td className={td}>{formatRs(o.total)}</td>
                  <td className={td}>
                    <StatusPill status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
