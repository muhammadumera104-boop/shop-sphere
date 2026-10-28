import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requestMeta } from "@/lib/auth";
import { audit, auditWhere } from "@/lib/audit";
import { toCsv } from "@/lib/services/khata";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await prisma.auditLog.findMany({ where: auditWhere(sp), include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 5000 });
  await audit(user.id, "AUDIT_EXPORTED", "Audit log", `${rows.length} rows`, await requestMeta());
  const csv = toCsv([["Time", "Admin", "Email", "Action", "Target", "Details", "IP", "User agent"], ...rows.map((r) => [r.createdAt.toISOString(), r.actor?.name ?? "System", r.actor?.email ?? "", r.action, r.target, r.details, r.ip, r.userAgent])]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="audit-log.csv"', "Cache-Control": "no-store" } });
}
