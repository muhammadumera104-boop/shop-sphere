import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, toDateInput } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createCampaignAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, Field, PageTitle, StatusPill } from "@/components/ui";

export const metadata = { title: "Promotion rules" };

export default async function AdminPromotions() {
  const [campaigns, settings, coupons] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { startsAt: "desc" } }),
    getSettings(),
    prisma.coupon.count({ where: { isActive: true, endsAt: { gte: new Date() } } }),
  ]);
  const now = new Date();
  const today = toDateInput(now);
  return (
    <>
      <PageTitle title="Promotion rules & campaigns" subtitle={`${coupons} seller coupons are active right now.`} />
      <div className="grid xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <EmptyState title="No campaigns" />
            </Card>
          ) : (
            campaigns.map((c) => {
              const state = c.endsAt < now ? "EXPIRED" : c.startsAt > now ? "SCHEDULED" : "ACTIVE";
              return (
                <Card key={c.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-5 relative">
                    <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gold/70" aria-hidden />
                    <p className="text-xl font-bold relative">{c.name}</p>
                    <p className="text-white/80 text-sm relative">{c.description}</p>
                  </div>
                  <div className="p-4 flex flex-wrap gap-4 items-center text-sm">
                    <StatusPill status={state} />
                    <span>
                      {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
                    </span>
                    <span className="text-muted">Up to {c.maxDiscount}% off</span>
                    <span className="text-muted">{c.sellerCount} participating sellers</span>
                    {c.isFlashSale && <Badge tone="gold">Flash sale</Badge>}
                  </div>
                </Card>
              );
            })
          )}
          <Card className="p-5">
            <h2 className="font-semibold mb-2">Platform rules</h2>
            <dl className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="label-caps">Commission</dt>
                <dd className="text-xl font-bold">{settings.commissionPercent}%</dd>
              </div>
              <div>
                <dt className="label-caps">Max coupon discount</dt>
                <dd className="text-xl font-bold">{settings.maxDiscountPercent}%</dd>
              </div>
              <div>
                <dt className="label-caps">Campaign min rating</dt>
                <dd className="text-xl font-bold">{settings.campaignEligibilityMinRating}★</dd>
              </div>
            </dl>
            <p className="text-xs text-muted mt-3">
              Change these in{" "}
              <Link href="/admin/settings" className="text-indigo-600 underline">
                Platform settings
              </Link>
              . Max coupon discount is enforced on the server when sellers create coupons. Commission is shown for reporting; payouts are not automated.
            </p>
          </Card>
        </div>
        <Card className="p-5 xl:sticky xl:top-6">
          <h2 className="font-semibold mb-4">New campaign</h2>
          <ActionForm action={createCampaignAction} resetOnSuccess className="space-y-4">
            <Field label="Name" htmlFor="cname">
              <input id="cname" name="name" required className="input" placeholder="e.g. 12.12 Mega Sale" />
            </Field>
            <Field label="Description" htmlFor="cdesc">
              <input id="cdesc" name="description" className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="cs">
                <input id="cs" name="startsAt" type="date" defaultValue={today} required className="input" />
              </Field>
              <Field label="End" htmlFor="ce">
                <input id="ce" name="endsAt" type="date" defaultValue={toDateInput(new Date(now.getTime() + 7 * 86400_000))} required className="input" />
              </Field>
            </div>
            <Field label="Max discount %" htmlFor="cm">
              <input id="cm" name="maxDiscount" type="number" min={1} max={90} defaultValue={40} required className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFlashSale" className="accent-indigo-600 size-4" /> Flash sale (scheduled window)
            </label>
            <SubmitButton className="w-full">Create campaign</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
