import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatDate, formatRs, parseJson, toDateInput } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createCouponAction, toggleCouponAction } from "@/app/actions/seller";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, PageTitle, Progress, StatusPill } from "@/components/ui";

export const metadata = { title: "Promotions" };

function couponState(c: { isActive: boolean; startsAt: Date; endsAt: Date; usedCount: number; usageLimit: number }, now = new Date()) {
  if (!c.isActive) return "PAUSED";
  if (c.endsAt < now) return "EXPIRED";
  if (c.startsAt > now) return "SCHEDULED";
  if (c.usedCount >= c.usageLimit) return "EXPIRED";
  return "ACTIVE";
}

export default async function PromotionsPage() {
  const user = await pageSeller("/seller/promotions");
  const [coupons, products, settings] = await Promise.all([
    prisma.coupon.findMany({ where: { shopId: user.shop.id }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { shopId: user.shop.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    getSettings(),
  ]);
  const today = new Date();
  return (
    <>
      <PageTitle title="Promotions & coupons" sample action={<a href="#new-coupon" className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-medium inline-flex items-center">+ Create coupon</a>} />
      <div className="grid xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-4">
          {coupons.length === 0 ? (
            <Card>
              <EmptyState icon="%" title="No coupons yet" body="Create a coupon to reward your buyers." />
            </Card>
          ) : (
            coupons.map((c) => {
              const state = couponState(c);
              const ids = parseJson<string[]>(c.productIds, []);
              return (
                <div key={c.id} className="rounded-xl border-2 border-dashed border-gold bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xl font-bold tracking-wider">{c.code}</p>
                      <p className="text-indigo-600 font-semibold">{c.type === "PERCENT" ? `${c.value}% off` : `${formatRs(c.value)} off`}</p>
                      <p className="text-xs text-muted mt-1">
                        {formatDate(c.startsAt)} – {formatDate(c.endsAt)} · Min spend {formatRs(c.minSpend)} · {ids.length ? `${ids.length} products` : "All products"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={state} />
                      <ActionButton action={toggleCouponAction} fields={{ couponId: c.id }} variant="secondary">
                        {c.isActive ? "Pause" : "Activate"}
                      </ActionButton>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Used</span>
                      <span>
                        {c.usedCount}/{c.usageLimit}
                      </span>
                    </div>
                    <Progress value={c.usedCount} max={c.usageLimit} tone="gold" />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Card className="p-5 xl:sticky xl:top-6" id="new-coupon">
          <h2 className="font-semibold mb-1">New coupon</h2>
          <p className="text-xs text-muted mb-4">Platform rule: percentage coupons up to {settings.maxDiscountPercent}% off.</p>
          <ActionForm action={createCouponAction} resetOnSuccess className="space-y-4">
            <Field label="Code" htmlFor="code">
              <input id="code" name="code" required className="input uppercase font-mono" placeholder="EID20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="type">
                <select id="type" name="type" className="input">
                  <option value="PERCENT">Percentage</option>
                  <option value="FIXED">Fixed (Rs.)</option>
                </select>
              </Field>
              <Field label="Value" htmlFor="value">
                <input id="value" name="value" type="number" min={1} required className="input" />
              </Field>
              <Field label="Start date" htmlFor="startsAt">
                <input id="startsAt" name="startsAt" type="date" defaultValue={toDateInput(today)} required className="input" />
              </Field>
              <Field label="End date" htmlFor="endsAt">
                <input id="endsAt" name="endsAt" type="date" defaultValue={toDateInput(new Date(today.getTime() + 14 * 86400_000))} required className="input" />
              </Field>
              <Field label="Usage limit" htmlFor="usageLimit">
                <input id="usageLimit" name="usageLimit" type="number" min={1} defaultValue={100} required className="input" />
              </Field>
              <Field label="Minimum spend" htmlFor="minSpend">
                <input id="minSpend" name="minSpend" type="number" min={0} defaultValue={0} className="input" />
              </Field>
            </div>
            <Field label="Eligible products" htmlFor="productIds" hint="Leave empty for all products. Ctrl/Cmd-click to pick several.">
              <select id="productIds" name="productIds" multiple className="input h-32">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton className="w-full">Create coupon</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
