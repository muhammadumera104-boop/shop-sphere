import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { formatDateTime, formatRs } from "@/lib/format";
import { cancelOrderAction, openTicketAction } from "@/app/actions/shop";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Card, PageTitle, ProductTile, StatusPill, cx } from "@/components/ui";
import { CheckIcon } from "@/components/icons";

export const metadata = { title: "Order tracking" };

export default async function OrderTrackingPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> }) {
  const user = await pageUser("/account/orders", ["BUYER"]);
  const { number } = await params;
  const { placed } = await searchParams;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();
  // Ownership check: only the buyer's own orders.
  const order = await prisma.order.findFirst({
    where: { number: n, buyerId: user.id },
    include: {
      items: { include: { product: { select: { slug: true, gradient: true, images: { take: 1 } } } } },
      events: { orderBy: { createdAt: "asc" } },
      shipment: { include: { events: { orderBy: { createdAt: "asc" } } } },
      shop: { select: { name: true, slug: true } },
      payment: true,
    },
  });
  if (!order) notFound();
  const siblings = placed ? await prisma.order.findMany({ where: { checkoutGroup: order.checkoutGroup, id: { not: order.id } }, select: { number: true } }) : [];

  const at = (s: string) => order.events.find((e) => e.status === s)?.createdAt;
  const shipAt = (s: string) => order.shipment?.events.find((e) => e.status === s)?.createdAt;
  const steps = [
    { label: "Confirmed", date: at("CONFIRMED") },
    { label: "Packed", date: at("PACKED") },
    { label: "Shipped", date: at("SHIPPED") },
    { label: "Out for delivery", date: shipAt("OUT_FOR_DELIVERY") },
    { label: "Delivered", date: at("DELIVERED") },
  ];
  const current = steps.findIndex((s) => !s.date);
  const terminal = order.status === "CANCELLED" || order.status === "RETURNED";
  const canCancel = order.status === "PENDING" || order.status === "CONFIRMED";

  return (
    <>
      {placed && (
        <div role="status" className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
          Order placed! Pay {formatRs(order.total)} in cash when it arrives.
          {siblings.length > 0 && ` Items from other shops are in orders ${siblings.map((s) => `#${s.number}`).join(", ")}.`}
        </div>
      )}
      <PageTitle title={<span className="flex items-center gap-3">Order #{order.number} <StatusPill status={order.status} /></span>} subtitle={`Placed ${formatDateTime(order.createdAt)} · Sold by ${order.shop.name}`} />

      <Card className="p-5 sm:p-6 mb-5">
        {terminal ? (
          <p className="text-sm">
            This order was <strong>{order.status.toLowerCase()}</strong>
            {order.events.at(-1) && ` on ${formatDateTime(order.events.at(-1)!.createdAt)}`}.
          </p>
        ) : (
          <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
            {steps.map((s, i) => {
              const done = !!s.date;
              const isCurrent = i === current;
              return (
                <li key={s.label} className="flex flex-col items-center text-center relative">
                  {i > 0 && <span className={cx("absolute top-4 right-1/2 w-full h-0.5 -z-0", done || isCurrent ? "bg-indigo-600" : "bg-gray-200")} aria-hidden />}
                  <span
                    className={cx(
                      "relative z-10 size-8 rounded-full flex items-center justify-center",
                      done ? "bg-indigo-600 text-white" : isCurrent ? "bg-white border-2 border-indigo-600 ring-4 ring-indigo-100" : "bg-gray-100",
                    )}
                  >
                    {done && <CheckIcon className="size-4" />}
                  </span>
                  <span className={cx("mt-2 text-xs sm:text-sm font-medium", done || isCurrent ? "text-ink" : "text-muted")}>{s.label}</span>
                  <span className="text-[11px] text-muted">{s.date ? formatDateTime(s.date) : isCurrent ? "In progress" : ""}</span>
                </li>
              );
            })}
          </ol>
        )}
        {order.status === "SHIPPED" && (
          <p className="mt-5 text-sm rounded-lg bg-indigo-50 text-indigo-800 px-4 py-2">
            Your delivery code is <strong className="tracking-widest">{order.deliveryCode}</strong>. Share it with the courier only when you receive the parcel.
          </p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Items</h2>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-sm">
                <ProductTile gradient={i.product.gradient} imageUrl={i.product.images[0]?.url} label={i.titleSnapshot} className="size-14 rounded-lg shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{i.titleSnapshot}</p>
                  <p className="text-muted text-xs">
                    {i.variantName !== "Default" && `${i.variantName} · `}
                    {formatRs(i.unitPrice)} × {i.quantity}
                  </p>
                </div>
                <span className="font-medium">{formatRs(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-5">
          <Card className="p-5 text-sm">
            <h2 className="font-semibold mb-2">Delivery address</h2>
            <p>{order.addressName}</p>
            <p className="text-muted">{order.addressText}</p>
            <p className="text-muted">{order.addressPhone}</p>
            <p className="text-muted mt-2">{order.deliveryOption === "EXPRESS" ? "Express delivery" : "Standard delivery"}</p>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold mb-2">Price summary</h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatRs(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount ({order.couponCode})</dt>
                  <dd>- {formatRs(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd>{order.deliveryFee ? formatRs(order.deliveryFee) : "Free"}</dd>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-line">
                <dt>Total</dt>
                <dd className="text-indigo-600">{formatRs(order.total)}</dd>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <dt className="text-muted">Payment</dt>
                <dd>
                  Cash on delivery · <StatusPill status={order.payment?.status ?? "PENDING"} />
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 items-start">
        {canCancel && (
          <ActionButton action={cancelOrderAction} fields={{ orderId: order.id }} variant="secondary" size="md" confirm="Cancel this order?">
            Cancel order
          </ActionButton>
        )}
        <details className="flex-1 min-w-64">
          <summary className="list-none inline-flex h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium items-center cursor-pointer">Need help?</summary>
          <Card className="p-5 mt-3 max-w-lg">
            <ActionForm action={openTicketAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block text-sm font-medium" htmlFor="issue">
                What went wrong?
              </label>
              <select id="issue" name="issue" className="input">
                <option>Item not received</option>
                <option>Wrong item</option>
                <option>Damaged item</option>
                <option>Delivery delay</option>
                <option>Other</option>
              </select>
              <label className="block text-sm font-medium" htmlFor="message">
                Message
              </label>
              <textarea id="message" name="message" rows={3} required minLength={5} className="input" />
              <SubmitButton size="sm">Send to support</SubmitButton>
            </ActionForm>
          </Card>
        </details>
      </div>
    </>
  );
}
