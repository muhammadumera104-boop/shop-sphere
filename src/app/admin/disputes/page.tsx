import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatRs, parseJson } from "@/lib/format";
import { disputeDecisionAction, reassignShipmentAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, PageTitle, StatusPill, Table, Tabs, td, th } from "@/components/ui";

export const metadata = { title: "Orders & disputes" };

export default async function DisputesPage({ searchParams }: { searchParams: Promise<{ tab?: string; open?: string; q?: string }> }) {
  const { tab = "all", open, q } = await searchParams;
  const n = q && /^\d+$/.test(q) ? Number(q) : undefined;
  const [openCount, orders, tickets, refunds, exceptions, partners, selected] = await Promise.all([
    prisma.supportTicket.count({ where: { status: "OPEN", type: "DISPUTE" } }),
    tab === "all" ? prisma.order.findMany({ where: n ? { number: n } : {}, include: { buyer: { select: { name: true } }, shop: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : [],
    tab === "disputes" ? prisma.supportTicket.findMany({ where: { type: "DISPUTE" }, include: { order: { include: { buyer: { select: { name: true } }, shop: { select: { name: true } } } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }) : [],
    tab === "refunds" ? prisma.refund.findMany({ include: { order: { include: { buyer: { select: { name: true } }, shop: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }) : [],
    tab === "exceptions" ? prisma.shipment.findMany({ where: { OR: [{ status: "FAILED" }, { deliveryPartnerId: null }] }, include: { order: true, deliveryPartner: { select: { name: true } }, events: { orderBy: { createdAt: "desc" }, take: 1 } } }) : [],
    tab === "exceptions" ? prisma.user.findMany({ where: { role: "DELIVERY", status: "ACTIVE" }, select: { id: true, name: true } }) : [],
    open
      ? prisma.supportTicket.findUnique({
          where: { id: open },
          include: { messages: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } }, order: { include: { buyer: { select: { name: true } }, shop: { select: { name: true } }, items: true } } },
        })
      : null,
  ]);

  return (
    <>
      <PageTitle title="Orders & disputes" />
      <div className="mb-5">
        <Tabs
          active={tab}
          tabs={[
            { key: "all", label: "All orders", href: "/admin/disputes" },
            { key: "disputes", label: `Disputes (${openCount})`, href: "/admin/disputes?tab=disputes" },
            { key: "refunds", label: "Refunds", href: "/admin/disputes?tab=refunds" },
            { key: "exceptions", label: "Delivery exceptions", href: "/admin/disputes?tab=exceptions" },
          ]}
        />
      </div>
      <div className={selected ? "grid 2xl:grid-cols-[1fr_420px] gap-6 items-start" : ""}>
        <Card>
          {tab === "all" && (
            <>
              <form className="p-4 border-b border-line flex gap-2">
                <label htmlFor="oq" className="sr-only">
                  Order number
                </label>
                <input id="oq" name="q" defaultValue={q} placeholder="Order number, e.g. 1042" className="input max-w-xs" inputMode="numeric" />
                <button className="h-10 px-4 rounded-full bg-navy text-white text-sm">Find</button>
              </form>
              {orders.length === 0 ? (
                <EmptyState title="No orders" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th className={th}>Order #</th>
                      <th className={th}>Buyer</th>
                      <th className={th}>Seller</th>
                      <th className={th}>Total</th>
                      <th className={th}>Placed</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className={`${td} font-medium`}>#{o.number}</td>
                        <td className={td}>{o.buyer.name}</td>
                        <td className={td}>{o.shop.name}</td>
                        <td className={td}>{formatRs(o.total)}</td>
                        <td className={td}>{formatDate(o.createdAt)}</td>
                        <td className={td}>
                          <StatusPill status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
          {tab === "disputes" &&
            (tickets.length === 0 ? (
              <EmptyState icon="✓" title="No disputes" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Order #</th>
                    <th className={th}>Buyer</th>
                    <th className={th}>Seller</th>
                    <th className={th}>Issue</th>
                    <th className={th}>Opened</th>
                    <th className={th}>Status</th>
                    <th className={th}>
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className={t.id === open ? "bg-indigo-50/40" : ""}>
                      <td className={`${td} font-medium`}>#{t.order?.number}</td>
                      <td className={td}>{t.order?.buyer.name}</td>
                      <td className={td}>{t.order?.shop.name}</td>
                      <td className={td}>
                        <Badge tone="rose">{t.issue}</Badge>
                      </td>
                      <td className={td}>{formatDate(t.createdAt)}</td>
                      <td className={td}>
                        <StatusPill status={t.status} label={t.status === "RESOLVED_BUYER" ? "Refunded" : t.status === "RESOLVED_SELLER" ? "Seller won" : undefined} />
                      </td>
                      <td className={td}>
                        <Link href={`/admin/disputes?tab=disputes&open=${t.id}`} className="h-8 px-3 rounded-full bg-indigo-600 text-white text-xs inline-flex items-center">
                          Open case
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ))}
          {tab === "refunds" &&
            (refunds.length === 0 ? (
              <EmptyState title="No refunds" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Order #</th>
                    <th className={th}>Buyer</th>
                    <th className={th}>Seller</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Reason</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td className={td}>#{r.order.number}</td>
                      <td className={td}>{r.order.buyer.name}</td>
                      <td className={td}>{r.order.shop.name}</td>
                      <td className={td}>{formatRs(r.amount)}</td>
                      <td className={td}>{r.reason}</td>
                      <td className={td}>
                        <StatusPill status={r.status === "COMPLETED" ? "REFUNDED" : "PENDING"} label={r.status === "COMPLETED" ? "Recorded" : "Pending"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ))}
          {tab === "exceptions" &&
            (exceptions.length === 0 ? (
              <EmptyState icon="✓" title="No delivery exceptions" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {exceptions.map((s) => (
                  <li key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">
                        #{s.order.number} <StatusPill status={s.status} />
                      </p>
                      <p className="text-sm text-muted">
                        {s.deliveryPartner?.name ?? "No partner assigned"} · {s.events[0]?.note || "—"}
                      </p>
                    </div>
                    <ActionForm action={reassignShipmentAction} className="flex gap-2 items-start">
                      <input type="hidden" name="shipmentId" value={s.id} />
                      <label className="sr-only" htmlFor={`rp-${s.id}`}>
                        Delivery partner
                      </label>
                      <select id={`rp-${s.id}`} name="partnerId" className="input w-auto h-9 py-0">
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <SubmitButton size="sm">Reassign</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ))}
        </Card>

        {selected && selected.order && (
          <Card className="p-5 mt-6 2xl:mt-0 2xl:sticky 2xl:top-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Case: #{selected.order.number}</h2>
              <Link href="/admin/disputes?tab=disputes" className="text-muted" aria-label="Close">
                ✕
              </Link>
            </div>
            <p className="text-sm mt-1">
              <Badge tone="rose">{selected.issue}</Badge> <StatusPill status={selected.order.status} />
            </p>
            <p className="text-sm text-muted mt-2">
              {selected.order.buyer.name} vs {selected.order.shop.name} · {formatRs(selected.order.total)}
            </p>
            <div className="flex gap-2 mt-3">
              {parseJson<string[]>(selected.evidenceUrls, []).length ? (
                parseJson<string[]>(selected.evidenceUrls, []).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="Evidence" className="size-16 rounded-lg object-cover" />
                ))
              ) : (
                <p className="text-xs text-muted">No evidence photos attached.</p>
              )}
            </div>
            <ol className="mt-4 space-y-3 max-h-72 overflow-auto">
              {selected.messages.map((m) => (
                <li key={m.id} className={`rounded-xl p-3 text-sm ${m.author.role === "ADMIN" ? "bg-indigo-50" : "bg-page"}`}>
                  <p className="text-xs text-muted mb-1">
                    {m.author.name} {m.author.role === "ADMIN" && "(support)"} · {formatDateTime(m.createdAt)}
                  </p>
                  {m.body}
                </li>
              ))}
            </ol>
            {selected.status === "OPEN" ? (
              <ActionForm action={disputeDecisionAction} className="mt-4 space-y-3 border-t border-line pt-4">
                <input type="hidden" name="ticketId" value={selected.id} />
                <label htmlFor="dm" className="text-sm font-medium block">
                  Message to both parties
                </label>
                <textarea id="dm" name="message" rows={2} className="input" />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="decision" value="refund" variant="emerald" confirm="Refund the buyer and close this case?">
                    Refund buyer
                  </SubmitButton>
                  <SubmitButton name="decision" value="seller" variant="secondary" confirm="Close this case in favour of the seller?">
                    Side with seller
                  </SubmitButton>
                  <SubmitButton name="decision" value="reply" variant="ghost">
                    Reply only
                  </SubmitButton>
                </div>
                <p className="text-[11px] text-muted">Refunds are recorded in ShopSphere. Cash refunds are paid outside the platform (no payment gateway configured).</p>
              </ActionForm>
            ) : (
              <p className="mt-4 text-sm text-muted">This case is closed.</p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
