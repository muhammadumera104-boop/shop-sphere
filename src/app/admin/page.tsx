import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatRs, timeAgo, titleCase } from "@/lib/format";
import { DonutChart, LineChart } from "@/components/charts";
import { Avatar, Card, CardHeader, EmptyState, KpiCard, LinkButton, PageTitle } from "@/components/ui";

export const metadata = { title: "Admin dashboard" };

function compact(n: number) {
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `Rs. ${Math.round(n / 1000)}k`;
  return formatRs(n);
}

export default async function AdminDashboard() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [gross, orderCount, activeSellers, disputes, byStatus, monthOrders, pending, activity] = await Promise.all([
    prisma.order.aggregate({ where: { status: { notIn: ["CANCELLED", "RETURNED"] } }, _sum: { total: true } }),
    prisma.order.count(),
    prisma.shop.count({ where: { status: "APPROVED" } }),
    prisma.supportTicket.count({ where: { status: "OPEN", type: "DISPUTE" } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.findMany({ where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED"] } }, select: { createdAt: true, total: true } }),
    prisma.shop.findMany({ where: { status: "PENDING" }, include: { owner: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 3 }),
    prisma.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  // Local calendar days of the current month (server time zone), not UTC days.
  const localDay = (d: Date) => d.toLocaleDateString("en-CA");
  const days = Array.from({ length: new Date().getDate() }, (_, i) => localDay(new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1, 12)));
  const perDay = days.map((d) => monthOrders.filter((o) => localDay(o.createdAt) === d).reduce((s, o) => s + o.total, 0));

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Gross sales" value={compact(gross._sum.total ?? 0)} tone="indigo" hint="Excludes cancelled & returned" href="/admin/disputes?tab=all" />
        <KpiCard label="Orders" value={orderCount.toLocaleString("en-PK")} tone="violet" href="/admin/disputes?tab=all" />
        <KpiCard label="Active sellers" value={activeSellers} tone="emerald" href="/admin/sellers" />
        <KpiCard label="Open disputes" value={disputes} tone="rose" hint="Review cases" href="/admin/disputes?tab=disputes" />
      </div>
      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6 mb-6">
        <Card className="p-5">
          <CardHeader title="Sales this month" />
          <LineChart labels={days.map((d) => String(Number(d.slice(8))))} series={[{ name: "Order value", color: "#4F46E5", values: perDay }]} />
        </Card>
        <Card className="p-5">
          <CardHeader title="Orders by status" />
          <DonutChart data={byStatus.map((s) => ({ label: titleCase(s.status), value: s._count }))} center={String(orderCount)} />
        </Card>
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <CardHeader title="Pending seller approvals" action={<Link href="/admin/sellers" className="text-sm text-indigo-600 font-medium">View all</Link>} />
          {pending.length === 0 ? (
            <EmptyState title="No pending applications" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {pending.map((s) => (
                <li key={s.id} className="py-3 flex items-center gap-3">
                  <Avatar name={s.name} tone="violet" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.owner.name} · {s.city} · {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <LinkButton href={`/admin/sellers?open=${s.id}`} size="sm">
                    Review
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <CardHeader title="Recent activity" action={<Link href="/admin/audit" className="text-sm text-indigo-600 font-medium">Audit log</Link>} />
          {activity.length === 0 ? (
            <EmptyState title="No admin activity yet" />
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="size-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" aria-hidden />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{a.actor?.name ?? "System"}</span> · {titleCase(a.action)}
                    </p>
                    <p className="text-xs text-muted">
                      {a.target} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
