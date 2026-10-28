import { prisma } from "@/lib/db";
import { auditWhere } from "@/lib/audit";
import { formatDateTime, titleCase } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle, Pagination, Table, td, th, type Tone } from "@/components/ui";
import { DownloadIcon, ShieldIcon } from "@/components/icons";

export const metadata = { title: "Audit log" };
const PER = 25;

function tone(action: string): Tone {
  if (/REMOVED|REJECTED|SUSPENDED|REFUNDED/.test(action)) return "rose";
  if (/APPROVED|REINSTATED|KEPT|RESTORED/.test(action)) return "emerald";
  if (/WARNED|SETTINGS/.test(action)) return "gold";
  return "indigo";
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ admin?: string; action?: string; from?: string; to?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = auditWhere(sp);
  const [rows, total, admins, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  const qs = new URLSearchParams(Object.entries({ admin: sp.admin, action: sp.action, from: sp.from, to: sp.to }).filter(([, v]) => v) as [string, string][]);
  return (
    <>
      <PageTitle
        title="Audit log"
        action={
          <a href={`/admin/audit/export?${qs}`} className="h-10 px-5 rounded-full border border-line bg-white text-sm font-medium inline-flex items-center gap-2">
            <DownloadIcon className="size-4" /> Export
          </a>
        }
      />
      <Card>
        <form className="p-4 border-b border-line flex flex-wrap gap-3 items-end">
          <label className="text-xs">
            <span className="block text-muted mb-1">Admin user</span>
            <select name="admin" defaultValue={sp.admin ?? ""} className="input w-auto">
              <option value="">All admins</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="block text-muted mb-1">Action type</span>
            <select name="action" defaultValue={sp.action ?? ""} className="input w-auto">
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a.action} value={a.action}>
                  {titleCase(a.action)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="block text-muted mb-1">From</span>
            <input type="date" name="from" defaultValue={sp.from} className="input w-auto" />
          </label>
          <label className="text-xs">
            <span className="block text-muted mb-1">To</span>
            <input type="date" name="to" defaultValue={sp.to} className="input w-auto" />
          </label>
          <button className="h-10 px-5 rounded-full bg-navy text-white text-sm">Filter</button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="No entries match" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>Admin</th>
                <th className={th}>Action</th>
                <th className={th}>Target</th>
                <th className={th}>Details</th>
                <th className={th}>IP / Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap text-xs`}>{formatDateTime(r.createdAt)}</td>
                  <td className={td}>{r.actor?.name ?? "System"}</td>
                  <td className={td}>
                    <Badge tone={tone(r.action)}>{titleCase(r.action)}</Badge>
                  </td>
                  <td className={td}>{r.target}</td>
                  <td className={`${td} text-xs text-muted max-w-60 truncate`} title={r.details}>
                    {r.details}
                  </td>
                  <td className={`${td} text-xs text-muted max-w-48 truncate`} title={r.userAgent}>
                    {r.ip || "—"} · {r.userAgent.split(" ")[0] || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted border-t border-line inline-flex items-center gap-1.5">
          <ShieldIcon className="size-4" /> All sensitive admin actions are recorded.
        </p>
      </Card>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER))} href={(n) => `/admin/audit?${new URLSearchParams([...qs, ["page", String(n)]])}`} />
    </>
  );
}
