import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { sellerDecisionAction } from "@/app/actions/admin";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Card, EmptyState, PageTitle, StatusPill, Table, Tabs, td, th } from "@/components/ui";

export const metadata = { title: "Seller approvals" };
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

export default async function SellersPage({ searchParams }: { searchParams: Promise<{ tab?: string; open?: string }> }) {
  const { tab = "PENDING", open } = await searchParams;
  const status = STATUSES.includes(tab) ? tab : "PENDING";
  const [counts, shops, selected] = await Promise.all([
    prisma.shop.groupBy({ by: ["status"], _count: true }),
    prisma.shop.findMany({ where: { status }, include: { owner: { select: { name: true, email: true } }, _count: { select: { products: true } } }, orderBy: { createdAt: "desc" } }),
    open ? prisma.shop.findUnique({ where: { id: open }, include: { owner: { select: { name: true, email: true, phone: true, createdAt: true } }, _count: { select: { products: true, orders: true } } } }) : null,
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  return (
    <>
      <PageTitle title="Seller applications" subtitle="Products become public only after a shop is approved." />
      <div className="mb-5">
        <Tabs active={status} tabs={STATUSES.map((s) => ({ key: s, label: `${s.charAt(0)}${s.slice(1).toLowerCase()} ${c(s)}`, href: `/admin/sellers?tab=${s}` }))} />
      </div>
      <div className={selected ? "grid 2xl:grid-cols-[1fr_400px] gap-6 items-start" : ""}>
        <Card>
          {shops.length === 0 ? (
            <EmptyState title={`No ${status.toLowerCase()} shops`} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Shop</th>
                  <th className={th}>Owner</th>
                  <th className={th}>City</th>
                  <th className={th}>Submitted</th>
                  <th className={th}>Documents</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.id} className={s.id === open ? "bg-indigo-50/40" : ""}>
                    <td className={td}>
                      <Link href={`/admin/sellers?tab=${status}&open=${s.id}`} className="flex items-center gap-2 font-medium hover:text-indigo-600">
                        <Avatar name={s.name} tone="violet" className="size-9" />
                        {s.name}
                      </Link>
                    </td>
                    <td className={td}>
                      {s.owner.name}
                      <p className="text-xs text-muted">{s.owner.email}</p>
                    </td>
                    <td className={td}>{s.city}</td>
                    <td className={td}>{formatDate(s.createdAt)}</td>
                    <td className={td}>{s.cnic ? <span title="CNIC provided">🪪 CNIC</span> : <span className="text-muted">Missing</span>}</td>
                    <td className={td}>
                      <StatusPill status={s.status} />
                    </td>
                    <td className={td}>
                      <div className="flex gap-1.5">
                        {(s.status === "PENDING" || s.status === "REJECTED") && (
                          <ActionButton action={sellerDecisionAction} fields={{ shopId: s.id, decision: "approve" }} variant="emerald">
                            Approve
                          </ActionButton>
                        )}
                        {s.status === "SUSPENDED" && (
                          <ActionButton action={sellerDecisionAction} fields={{ shopId: s.id, decision: "reinstate" }} variant="emerald">
                            Reinstate
                          </ActionButton>
                        )}
                        <Link href={`/admin/sellers?tab=${status}&open=${s.id}`} className="h-8 px-3 rounded-full border border-line text-xs inline-flex items-center">
                          {s.status === "PENDING" ? "Reject…" : s.status === "APPROVED" ? "Suspend…" : "Details"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        {selected && (
          <Card className="p-5 mt-6 2xl:mt-0 2xl:sticky 2xl:top-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Application</h2>
              <Link href={`/admin/sellers?tab=${status}`} aria-label="Close" className="text-muted">
                ✕
              </Link>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Avatar name={selected.name} tone="violet" className="size-12 text-lg" />
              <div>
                <p className="font-semibold">{selected.name}</p>
                <StatusPill status={selected.status} />
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-3">{selected.description || "No description."}</p>
            <dl className="mt-4 text-sm grid grid-cols-[110px_1fr] gap-y-2">
              <dt className="text-muted">Owner</dt>
              <dd>{selected.owner.name}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="break-all">{selected.owner.email}</dd>
              <dt className="text-muted">Phone</dt>
              <dd>{selected.phone}</dd>
              <dt className="text-muted">Pickup</dt>
              <dd>{selected.pickupAddress}</dd>
              <dt className="text-muted">CNIC</dt>
              <dd className="font-mono">{selected.cnic || "—"}</dd>
              <dt className="text-muted">Products</dt>
              <dd>{selected._count.products}</dd>
              <dt className="text-muted">Orders</dt>
              <dd>{selected._count.orders}</dd>
              <dt className="text-muted">Account since</dt>
              <dd>{formatDate(selected.owner.createdAt)}</dd>
            </dl>
            {selected.statusNote && <p className="mt-3 text-xs text-muted">Last note: {selected.statusNote}</p>}
            {(selected.status === "PENDING" || selected.status === "APPROVED") && (
              <ActionForm action={sellerDecisionAction} className="mt-5 space-y-3 border-t border-line pt-4">
                <input type="hidden" name="shopId" value={selected.id} />
                <label htmlFor="note" className="text-sm font-medium block">
                  Reason (sent to the seller)
                </label>
                <textarea id="note" name="note" rows={2} className="input" required minLength={3} />
                <div className="flex gap-2">
                  {selected.status === "PENDING" ? (
                    <>
                      <SubmitButton variant="emerald" name="decision" value="approve">
                        Approve
                      </SubmitButton>
                      <SubmitButton variant="danger" name="decision" value="reject">
                        Reject
                      </SubmitButton>
                    </>
                  ) : (
                    <SubmitButton variant="danger" name="decision" value="suspend" confirm="Suspend this shop? Its products will be hidden.">
                      Suspend shop
                    </SubmitButton>
                  )}
                </div>
              </ActionForm>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
