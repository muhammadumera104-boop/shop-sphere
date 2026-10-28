import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sellerReport } from "@/lib/services/reports";
import { toCsv } from "@/lib/services/khata";

const valid = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.shop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const from = valid(url.searchParams.get("from"));
  const to = valid(url.searchParams.get("to"));
  if (!from || !to || from > to) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const r = await sellerReport(user.shop.id, new Date(`${from}T12:00:00Z`), new Date(`${to}T12:00:00Z`));
  const csv = toCsv([
    [`${user.shop.name} report`, `${from} to ${to}`],
    ["Sales", r.sales],
    ["Expenses", r.expenses],
    ["Receivables (Khata, current)", r.receivables],
    ["Net result", r.net],
    [],
    ["Date", "Sales", "Expenses"],
    ...r.series.map((d) => [d.day, d.sales, d.expenses]),
    [],
    ["Top product", "Units", "Revenue"],
    ...r.topProducts.map((p) => [p.title, p.qty, p.revenue]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="report-${from}-${to}.csv"`, "Cache-Control": "no-store" },
  });
}
