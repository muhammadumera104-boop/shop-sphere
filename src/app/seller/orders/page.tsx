import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatDateTime, formatRs, parseJson } from "@/lib/format";
import { returnDecisionAction, sellerOrderStatusAction } from "@/app/actions/seller";
import { ActionButton } from "@/components/forms";
import { Card, EmptyState, PageTitle, StatusPill, Table, Tabs, td, th } from "@/components/ui";

export const metadata = { title: "Seller orders" };

const TABS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "NEW", label: "New", statuses: ["PENDING"] },
  { key: "PROCESSING", label: "Processing", statuses: ["CONFIRMED"] },
  { key: "PACKED", label: "Packed", statuses: ["PACKED"] },
  { key: "COURIER", label: "With courier", statuses: ["SHIPPED"] },
  { key: "COMPLETED", label: "Completed", statuses: ["DELIVERED"] },
  { key: "CANCELLED", label: "Cancelled", statuses: ["CANCELLED"] },
  { key: "RETURNS", label: "Returns" },
  { key: "ALL", label: "All" },
];

const NEXT: Record<string, { to: string; label: string } | undefined> = {
  PENDING: { to: "CONFIRMED", label: "Accept" },
  CONFIRMED: { to: "PACKED", label: "Mark packed" },
  PACKED: { to: "SHIPPED", label: "Hand to courier" },
};

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ tab?: string; open?: string }> }) {
  const user = await pageSeller("/seller/orders");
  const { tab = "NEW", open } = await searchParams;
  const shopId = user.shop.id;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const [counts, orders, returns, selected] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { shopId }, _count: true }),
    current.key === "RETURNS"
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: { shopId, ...(current.statuses ? { status: { in: current.statuses } } : {}) },
          include: { buyer: { select: { name: true } }, items: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
    current.key === "RETURNS" ? prisma.returnRequest.findMany({ where: { order: { shopId } }, include: { order: { include: { items: true, buyer: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    open
      ? prisma.order.findFirst({
          where: { id: open, shopId },
          include: { items: true, buyer: { select: { name: true } }, events: { orderBy: { createdAt: "asc" } }, shipment: { include: { deliveryPartner: { select: { name: true } }, events: { orderBy: { createdAt: "asc" } } } } },
        })
      : Promise.resolve(null),
  ]);
  const count = (statuses?: string[]) => counts.filter((c) => !statuses || statuses.includes(c.status)).reduce((s, c) => s + c._count, 0);
  const base = (t: string) => `/seller/orders?tab=${t}`;

  return (
    <>
      <PageTitle title="Orders" sample />
      <div className="mb-5">
        <Tabs active={current.key} tabs={TABS.map((t) => ({ key: t.key, label: t.statuses ? `${t.label} ${count(t.statuses)}` : t.label, href: base(t.key) }))} />
      </div>
      <div className={selected ? "grid 2xl:grid-cols-[1fr_380px] gap-6 items-start" : ""}>
        <Card>
          {current.key === "RETURNS" ? (
            returns.length === 0 ? (
              <EmptyState icon="↺" title="No return requests" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Item</th>
                    <th className={th}>Reason</th>
                    <th className={th}>Status</th>
                    <th className={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.id}>
                      <td className={td}>
                        #{r.order.number}
                        <p className="text-xs text-muted">{r.order.buyer.name}</p>
                      </td>
                      <td className={td}>{r.order.items.find((i) => i.id === r.orderItemId)?.titleSnapshot}</td>
                      <td className={td}>
                        {r.reason}
                        {r.description && <p className="text-xs text-muted max-w-56">{r.description}</p>}
                        {r.evidenceUrl && (
                          <a href={r.evidenceUrl} target="_blank" className="text-xs text-indigo-600 underline">
                            Evidence photo
                          </a>
                        )}
                      </td>
                      <td className={td}>
                        <StatusPill status={r.status} />
                        <p className="text-[11px] text-muted mt-1">{parseJson<{ at: string }[]>(r.history, []).length} updates</p>
                      </td>
                      <td className={td}>
                        <div className="flex gap-1.5 flex-wrap">
                          {r.status === "REQUESTED" && (
                            <>
                              <ActionButton action={returnDecisionAction} fields={{ returnId: r.id, decision: "approve" }} variant="emerald">
                                Approve
                              </ActionButton>
                              <ActionButton action={returnDecisionAction} fields={{ returnId: r.id, decision: "reject" }} variant="danger">
                                Reject
                              </ActionButton>
                            </>
                          )}
                          {r.status === "APPROVED" && (
                            <ActionButton action={returnDecisionAction} fields={{ returnId: r.id, decision: "refund" }} confirm="Mark item received and refund the buyer? Stock will be restocked.">
                              Received & refund
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : orders.length === 0 ? (
            <EmptyState icon="▢" title="No orders in this tab" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Order #</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Items</th>
                  <th className={th}>Total</th>
                  <th className={th}>Payment</th>
                  <th className={th}>Status</th>
                  <th className={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const next = NEXT[o.status];
                  return (
                    <tr key={o.id} className={o.id === open ? "bg-indigo-50/40" : ""} data-testid="seller-order-row">
                      <td className={td}>
                        <Link href={`${base(current.key)}&open=${o.id}`} className="font-medium text-indigo-600">
                          #{o.number}
                        </Link>
                        <p className="text-[11px] text-muted">{formatDateTime(o.createdAt)}</p>
                      </td>
                      <td className={td}>{o.buyer.name}</td>
                      <td className={td}>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className={`${td} font-medium`}>{formatRs(o.total)}</td>
                      <td className={td}>{o.paymentMethod}</td>
                      <td className={td}>
                        <StatusPill status={o.status} />
                      </td>
                      <td className={td}>
                        <div className="flex gap-1.5 flex-wrap">
                          {next && (
                            <ActionButton action={sellerOrderStatusAction} fields={{ orderId: o.id, status: next.to }}>
                              {next.label}
                            </ActionButton>
                          )}
                          {["PENDING", "CONFIRMED", "PACKED"].includes(o.status) && (
                            <ActionButton action={sellerOrderStatusAction} fields={{ orderId: o.id, status: "CANCELLED", note: "Cancelled by seller" }} variant="danger" confirm={`Cancel order #${o.number}? Reserved stock is released.`}>
                              Cancel
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        {selected && (
          <Card className="p-5 2xl:sticky 2xl:top-6 mt-6 2xl:mt-0" aria-label={`Order ${selected.number} details`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Order #{selected.number}</h2>
              <Link href={base(current.key)} className="text-sm text-muted" aria-label="Close details">
                ✕
              </Link>
            </div>
            <StatusPill status={selected.status} />
            <div className="mt-4 text-sm space-y-1">
              <p className="font-medium">{selected.addressName}</p>
              <p className="text-muted">{selected.addressText}</p>
              <p className="text-muted">{selected.addressPhone}</p>
            </div>
            <ul className="mt-4 text-sm space-y-1 border-t border-line pt-3">
              {selected.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>
                    {i.titleSnapshot}
                    {i.variantName !== "Default" && ` (${i.variantName})`} × {i.quantity}
                  </span>
                  <span>{formatRs(i.lineTotal)}</span>
                </li>
              ))}
              <li className="flex justify-between font-semibold pt-2">
                <span>Total (COD)</span>
                <span>{formatRs(selected.total)}</span>
              </li>
            </ul>
            {selected.shipment && <p className="mt-3 text-xs text-muted">Courier: {selected.shipment.deliveryPartner?.name ?? "waiting for assignment"}</p>}
            <h3 className="label-caps mt-5 mb-2">Status history</h3>
            <ol className="relative border-l-2 border-indigo-100 ml-1.5 space-y-3">
              {[...selected.events.map((e) => ({ id: e.id, s: e.status, at: e.createdAt, note: e.note })), ...(selected.shipment?.events ?? []).map((e) => ({ id: e.id, s: e.status, at: e.createdAt, note: e.note }))]
                .sort((a, b) => a.at.getTime() - b.at.getTime())
                .map((e) => (
                  <li key={e.id} className="pl-4 relative">
                    <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-indigo-600" aria-hidden />
                    <p className="text-sm font-medium">{e.s.replace(/_/g, " ").toLowerCase()}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(e.at)}
                      {e.note && ` · ${e.note}`}
                    </p>
                  </li>
                ))}
            </ol>
          </Card>
        )}
      </div>
    </>
  );
}
