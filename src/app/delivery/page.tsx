import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { formatDateTime, formatRs } from "@/lib/format";
import { logoutAction } from "@/app/actions/auth";
import { EmptyState, NotConfigured, StatusPill } from "@/components/ui";

export const metadata = { title: "Assigned shipments" };

export default async function DeliveryHome({ searchParams }: { searchParams: Promise<{ view?: string; done?: string }> }) {
  const user = await pageUser("/delivery", ["DELIVERY"]);
  const { view, done } = await searchParams;
  const history = view === "history";
  const shipments = await prisma.shipment.findMany({
    where: { deliveryPartnerId: user.id, status: history ? "DELIVERED" : { not: "DELIVERED" } },
    include: { order: true },
    orderBy: history ? { deliveredAt: "desc" } : { createdAt: "asc" },
    take: 50,
  });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const deliveredToday = await prisma.shipment.count({ where: { deliveryPartnerId: user.id, status: "DELIVERED", deliveredAt: { gte: start } } });
  const cod = shipments.filter((s) => s.status !== "DELIVERED").reduce((sum, s) => sum + s.order.total, 0);

  return (
    <>
      <header className="bg-gradient-to-br from-emerald-500 to-navy text-white px-5 pt-8 pb-6 rounded-b-3xl">
        <p className="text-sm text-white/80">Hi, {user.name.split(" ")[0]}</p>
        <h1 className="text-2xl font-bold">{history ? "Delivery history" : view === "profile" ? "Profile" : view === "map" ? "Map" : "My deliveries"}</h1>
        {!history && !view && (
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="To deliver" value={shipments.length} />
            <Stat label="Done today" value={deliveredToday} />
            <Stat label="COD to collect" value={formatRs(cod)} small />
          </div>
        )}
      </header>
      <div className="p-4 space-y-3">
        {done && (
          <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
            Delivery confirmed. Cash recorded as collected.
          </p>
        )}
        {view === "profile" ? (
          <div className="card p-5 space-y-2 text-sm">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted">{user.email}</p>
            <p className="text-muted">{user.phone}</p>
            <form action={logoutAction} className="pt-3">
              <button className="h-10 px-5 rounded-full border border-line text-rose-600 font-medium">Log out</button>
            </form>
          </div>
        ) : view === "map" ? (
          <div className="card p-6 text-center text-sm text-muted">
            Live map and route planning need a maps provider. <NotConfigured />
          </div>
        ) : shipments.length === 0 ? (
          <div className="card">
            <EmptyState icon="▢" title={history ? "No deliveries yet" : "No shipments assigned"} body={history ? undefined : "New parcels appear here when sellers hand them to the courier."} />
          </div>
        ) : (
          shipments.map((s) => (
            <Link key={s.id} href={`/delivery/${s.order.number}`} className="card p-4 block active:scale-[0.99] transition" data-testid="shipment-card">
              <div className="flex items-center justify-between">
                <span className="font-bold">#{s.order.number}</span>
                <StatusPill status={s.status} />
              </div>
              <p className="font-medium mt-2">{s.order.addressName}</p>
              <p className="text-sm text-muted line-clamp-1">{s.order.addressText}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted">{history && s.deliveredAt ? `Delivered ${formatDateTime(s.deliveredAt)}` : "Cash on delivery"}</span>
                <span className="font-extrabold text-lg">{formatRs(s.order.total)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-3">
      <p className={small ? "text-sm font-bold" : "text-2xl font-bold"}>{value}</p>
      <p className="text-[11px] text-white/80">{label}</p>
    </div>
  );
}
