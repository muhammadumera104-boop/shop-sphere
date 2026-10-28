import { prisma } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { formatDate, formatDateTime, parseJson } from "@/lib/format";
import { RETURN_REASONS, RETURN_WINDOW_DAYS } from "@/lib/constants";
import { requestReturnAction } from "@/app/actions/shop";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, PageTitle, StatusPill } from "@/components/ui";

export const metadata = { title: "Returns & refunds" };

export default async function ReturnsPage() {
  const user = await pageUser("/account/returns", ["BUYER"]);
  const since = new Date(Date.now() - RETURN_WINDOW_DAYS * 86400_000);
  const [eligible, requests] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { buyerId: user.id, status: "DELIVERED", events: { some: { status: "DELIVERED", createdAt: { gte: since } } } } },
      include: { order: { select: { number: true } } },
    }),
    prisma.returnRequest.findMany({ where: { userId: user.id }, include: { order: { select: { number: true, items: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageTitle title="Returns & refunds" action={<a href="#request" className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">Request a return</a>} />
      <Card className="p-6 mb-6" id="request">
        <h2 className="font-semibold mb-1">Request a return</h2>
        <p className="text-sm text-muted mb-4">Returns accepted within {RETURN_WINDOW_DAYS} days of delivery. Refunds are made after the seller receives the item.</p>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted">No delivered items are within the return window right now.</p>
        ) : (
          <ActionForm action={requestReturnAction} resetOnSuccess className="grid sm:grid-cols-2 gap-4">
            <Field label="Order item" htmlFor="ri">
              <select id="ri" name="orderItemId" className="input" required>
                {eligible.map((i) => (
                  <option key={i.id} value={i.id}>
                    #{i.order.number}: {i.titleSnapshot}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason" htmlFor="rr">
              <select id="rr" name="reason" className="input" required>
                {RETURN_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="rd">
                <textarea id="rd" name="description" rows={3} className="input" placeholder="Tell the seller what happened" />
              </Field>
            </div>
            <label className="sm:col-span-2 block rounded-xl border-2 border-dashed border-line p-4 text-sm text-muted text-center cursor-pointer">
              Evidence photo (optional, JPG/PNG/WebP up to 2 MB)
              <input type="file" name="evidence" accept="image/jpeg,image/png,image/webp" className="block mx-auto mt-2 text-xs" />
            </label>
            <div>
              <SubmitButton>Submit request</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Card>
      <h2 className="font-semibold mb-3">Previous requests</h2>
      {requests.length === 0 ? (
        <Card>
          <EmptyState icon="↺" title="No return requests" />
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const item = r.order.items.find((i) => i.id === r.orderItemId);
            const history = parseJson<{ status: string; at: string }[]>(r.history, []);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    #{r.order.number}: {item?.titleSnapshot}
                  </p>
                  <StatusPill status={r.status} />
                </div>
                <p className="text-sm text-muted">
                  {r.reason} · requested {formatDate(r.createdAt)}
                </p>
                <ol className="mt-3 flex flex-wrap gap-4 text-xs">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-indigo-600" aria-hidden />
                      {h.status.toLowerCase()} · {formatDateTime(h.at)}
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
