import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function audit(
  actorId: string | null,
  action: string,
  target: string,
  details = "",
  meta: { ip?: string; userAgent?: string } = {},
  tx: Tx = prisma,
) {
  await tx.auditLog.create({
    data: { actorId, action, target, details, ip: meta.ip ?? "", userAgent: meta.userAgent ?? "" },
  });
}

/** Filters for the admin audit log page and its CSV export. */
export function auditWhere(sp: { admin?: string; action?: string; from?: string; to?: string }): Prisma.AuditLogWhereInput {
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const from = valid(sp.from);
  const to = valid(sp.to);
  return {
    ...(sp.admin ? { actorId: sp.admin } : {}),
    ...(sp.action ? { action: sp.action } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
  };
}
