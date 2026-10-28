import Link from "next/link";
import { notFound } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { formatDateTime, formatRs } from "@/lib/format";
import { shipmentStatusAction } from "@/app/actions/delivery";
import { loadShipment } from "@/lib/services/delivery";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { LinkButton, StatusPill, cx } from "@/components/ui";
import { CheckIcon, MapIcon, PhoneIcon } from "@/components/icons";

export const metadata = { title: "Update status" };

export default async function ShipmentPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await pageUser("/delivery", ["DELIVERY"]);
  const { number } = await params;
  // Only the assigned partner can open the shipment.
  const s = await loadShipment(user.id, number);
  if (!s) notFound();
  const at = (st: string) => s.events.find((e) => e.status === st)?.createdAt;
  const steps = [
    { key: "PICKED_UP", label: "Picked up", date: at("PICKED_UP") },
    { key: "OUT_FOR_DELIVERY", label: "Out for delivery", date: at("OUT_FOR_DELIVERY") },
    { key: "DELIVERED", label: "Delivered", date: at("DELIVERED") },
  ];
  const failed = s.events.filter((e) => e.status === "FAILED");

  return (
    <div className="p-4 space-y-4">
      <Link href="/delivery" className="text-sm text-muted">
        ← Shipments
      </Link>
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Order #{s.order.number}</h1>
          <StatusPill status={s.status} />
        </div>
        <p className="font-medium mt-3">{s.order.addressName}</p>
        <p className="text-sm text-muted">{s.order.addressText}</p>
        <div className="flex items-center gap-3 mt-3">
          <a href={`tel:${s.order.addressPhone.replace(/\s/g, "")}`} className="h-10 px-4 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium inline-flex items-center gap-2">
            <PhoneIcon className="size-4" /> Call {s.order.addressPhone}
          </a>
        </div>
        <div className="mt-4 h-24 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 relative overflow-hidden flex items-center justify-center text-xs text-muted" aria-label="Map preview (maps not configured)">
          <MapIcon className="size-8 text-rose-500 absolute" />
          <span className="absolute bottom-2 right-3">Map not configured</span>
        </div>
        <dl className="mt-4 text-sm grid grid-cols-2 gap-2">
          <dt className="text-muted">Pickup</dt>
          <dd>{s.order.shop.name}</dd>
          <dt className="text-muted">Items</dt>
          <dd>{s.order.items.reduce((n, i) => n + i.quantity, 0)} item(s)</dd>
          <dt className="text-muted">Cash to collect</dt>
          <dd className="font-bold">{formatRs(s.order.total)}</dd>
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Progress</h2>
        <ol className="space-y-4">
          {steps.map((st) => (
            <li key={st.key} className="flex gap-3 items-start">
              <span className={cx("size-7 rounded-full flex items-center justify-center shrink-0", st.date ? "bg-indigo-600 text-white" : "bg-gray-100")}>{st.date && <CheckIcon className="size-4" />}</span>
              <div>
                <p className={cx("font-medium text-sm", !st.date && "text-muted")}>{st.label}</p>
                {st.date && <p className="text-xs text-muted">{formatDateTime(st.date)}</p>}
              </div>
            </li>
          ))}
        </ol>
        {failed.length > 0 && (
          <ul className="mt-4 text-xs text-rose-700 space-y-1">
            {failed.map((f) => (
              <li key={f.id}>
                Problem reported {formatDateTime(f.createdAt)}: {f.note}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-3">
        {s.status === "ASSIGNED" && (
          <ActionButton action={shipmentStatusAction} fields={{ shipmentId: s.id, status: "PICKED_UP" }} size="lg" className="w-full [&>button]:w-full">
            Mark picked up
          </ActionButton>
        )}
        {(s.status === "PICKED_UP" || s.status === "FAILED") && (
          <ActionButton action={shipmentStatusAction} fields={{ shipmentId: s.id, status: "OUT_FOR_DELIVERY" }} size="lg" className="w-full [&>button]:w-full">
            Mark out for delivery
          </ActionButton>
        )}
        {s.status === "OUT_FOR_DELIVERY" && (
          <LinkButton href={`/delivery/${s.order.number}/confirm`} variant="emerald" size="lg" className="w-full">
            Confirm delivery
          </LinkButton>
        )}
        {s.status !== "DELIVERED" && s.status !== "FAILED" && (
          <details>
            <summary className="list-none cursor-pointer h-12 rounded-full border border-line bg-white text-sm font-medium flex items-center justify-center">Report a problem</summary>
            <ActionForm action={shipmentStatusAction} className="card p-4 mt-3 space-y-3">
              <input type="hidden" name="shipmentId" value={s.id} />
              <input type="hidden" name="status" value="FAILED" />
              <label htmlFor="pnote" className="text-sm font-medium block">
                What happened?
              </label>
              <select id="pnote" name="note" className="input">
                <option>Customer not reachable</option>
                <option>Wrong address</option>
                <option>Customer refused parcel</option>
                <option>Parcel damaged</option>
              </select>
              <SubmitButton variant="dangerSolid" className="w-full">
                Report problem
              </SubmitButton>
            </ActionForm>
          </details>
        )}
      </div>
    </div>
  );
}
