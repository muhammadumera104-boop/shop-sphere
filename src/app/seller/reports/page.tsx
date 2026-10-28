import { pageSeller } from "@/lib/auth";
import { formatRs, toDateInput } from "@/lib/format";
import { sellerReport } from "@/lib/services/reports";
import { BarChart, LineChart } from "@/components/charts";
import { Card, CardHeader, EmptyState, KpiCard, PageTitle, Table, td, th } from "@/components/ui";
import { DownloadIcon } from "@/components/icons";

export const metadata = { title: "Reports" };

function reportRange(sp: { from?: string; to?: string }) {
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const now = new Date();
  const from = valid(sp.from) ?? toDateInput(new Date(now.getTime() - 29 * 86400_000));
  const to = valid(sp.to) ?? toDateInput(now);
  return from <= to ? { from, to } : { from: to, to: from };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await pageSeller("/seller/reports");
  const { from, to } = reportRange(await searchParams);
  const r = await sellerReport(user.shop.id, new Date(`${from}T12:00:00Z`), new Date(`${to}T12:00:00Z`));
  const labels = r.series.map((d) => new Date(d.day + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  return (
    <>
      <PageTitle
        title="Reports"
        sample
        action={
          <div className="flex flex-wrap items-end gap-2">
            <form className="flex flex-wrap items-end gap-2">
              <label className="text-xs">
                <span className="block text-muted mb-1">From</span>
                <input type="date" name="from" defaultValue={from} className="input h-9 py-1 w-auto" />
              </label>
              <label className="text-xs">
                <span className="block text-muted mb-1">To</span>
                <input type="date" name="to" defaultValue={to} className="input h-9 py-1 w-auto" />
              </label>
              <button className="h-9 px-4 rounded-full bg-navy text-white text-xs">Apply</button>
            </form>
            <a href={`/seller/reports/export?from=${from}&to=${to}`} className="h-9 px-4 rounded-full border border-line bg-white text-xs font-medium inline-flex items-center gap-1.5">
              <DownloadIcon className="size-4" /> Export CSV
            </a>
          </div>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Sales" value={formatRs(r.sales)} tone="indigo" hint={`${r.orderCount} orders`} />
        <KpiCard label="Expenses" value={formatRs(r.expenses)} tone="gold" />
        <KpiCard label="Receivables (Khata)" value={formatRs(r.receivables)} tone="rose" hint="Current, all dates" />
        <KpiCard label="Net result" value={formatRs(r.net)} tone="emerald" hint="Sales − expenses" />
      </div>
      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6 mb-6">
        <Card className="p-5">
          <CardHeader title="Sales vs Expenses" />
          <LineChart
            labels={labels}
            series={[
              { name: "Sales", color: "#4F46E5", values: r.series.map((d) => d.sales) },
              { name: "Expenses", color: "#F5B83D", values: r.series.map((d) => d.expenses) },
            ]}
          />
        </Card>
        <Card className="p-5">
          <CardHeader title="Orders by category" subtitle="Order lines" />
          {r.byCategory.length ? <BarChart data={r.byCategory.slice(0, 6)} /> : <EmptyState title="No orders in this range" />}
        </Card>
      </div>
      <Card>
        <div className="p-5 pb-0">
          <CardHeader title="Top products" />
        </div>
        {r.topProducts.length === 0 ? (
          <EmptyState title="No sales in this range" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Units</th>
                <th className={`${th} text-right`}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {r.topProducts.map((p) => (
                <tr key={p.title}>
                  <td className={td}>{p.title}</td>
                  <td className={`${td} text-right`}>{p.qty}</td>
                  <td className={`${td} text-right font-medium`}>{formatRs(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
