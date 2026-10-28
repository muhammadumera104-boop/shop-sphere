import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dateRangeSchema } from "@/lib/validation";
import { statement, toCsv } from "@/lib/services/khata";

/** CSV statement for one Khata party, optionally date-filtered. Owner only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.shop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const party = await prisma.khataParty.findUnique({ where: { id }, include: { entries: { where: { deletedAt: null } } } });
  if (!party || party.shopId !== user.shop.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = new URL(req.url);
  const range = dateRangeSchema.safeParse({ from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined });
  if (!range.success) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const from = range.data.from ? new Date(range.data.from.toISOString().slice(0, 10) + "T00:00:00") : null;
  const to = range.data.to ? new Date(range.data.to.toISOString().slice(0, 10) + "T23:59:59") : null;
  const all = statement(party.entries);
  const opening = from ? (all.filter((e) => e.date < from).at(-1)?.running ?? 0) : 0;
  const rows = all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
  const csv = toCsv([
    [`Statement: ${party.name}`, user.shop.name],
    ["Date", "Type", "Note", "Credit (you gave)", "Payment (you got)", "Balance"],
    ...(from ? [[from.toISOString().slice(0, 10), "Opening balance", "", "", "", opening]] : []),
    ...rows.map((e) => [e.date.toISOString().slice(0, 10), e.type === "CREDIT" ? "Credit" : "Payment", e.note, e.type === "CREDIT" ? e.amount : "", e.type === "PAYMENT" ? e.amount : "", e.running]),
    [],
    ["Khata records are separate from marketplace payments."],
  ]);
  const safe = party.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="khata-${safe}.csv"`, "Cache-Control": "no-store" },
  });
}
