import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatRs } from "@/lib/format";
import { EXTERNAL_CHANNELS } from "@/lib/notify";
import { saveSettingsAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, NotConfigured, cx } from "@/components/ui";

export const metadata = { title: "Platform settings" };

const TABS = [
  ["general", "General"],
  ["commission", "Commission"],
  ["shipping", "Shipping"],
  ["payments", "Payments"],
  ["roles", "Roles & permissions"],
  ["content", "Content"],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "commission" } = await searchParams;
  const s = await getSettings();
  const show = (t: string) => (tab === t ? "" : "hidden");
  return (
    <ActionForm action={saveSettingsAction}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Platform settings</h1>
        <SubmitButton>Save settings</SubmitButton>
      </div>
      <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
        <nav aria-label="Settings sections" className="card p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map(([k, l]) => (
            <Link key={k} href={`/admin/settings?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cx("px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap", tab === k ? "bg-indigo-600 text-white" : "hover:bg-gray-50")}>
              {l}
            </Link>
          ))}
        </nav>
        <div className="space-y-6">
          {/* All inputs stay in the form (hidden when not on their tab) so one Save keeps every value. */}
          <Card className={`p-5 grid sm:grid-cols-2 gap-4 ${show("general")}`}>
            <h2 className="font-semibold sm:col-span-2">General</h2>
            <Field label="Platform name" htmlFor="platformName">
              <input id="platformName" name="platformName" defaultValue={s.platformName} className="input" />
            </Field>
            <Field label="Support email" htmlFor="supportEmail">
              <input id="supportEmail" name="supportEmail" type="email" defaultValue={s.supportEmail} className="input" />
            </Field>
          </Card>
          <Card className={`p-5 grid sm:grid-cols-3 gap-4 ${show("commission")}`}>
            <h2 className="font-semibold sm:col-span-3">Commission & fees</h2>
            <Field label="Platform commission %" htmlFor="commissionPercent" hint="Used for reporting; payouts are manual.">
              <input id="commissionPercent" name="commissionPercent" type="number" step="0.5" min={0} max={50} defaultValue={s.commissionPercent} className="input" />
            </Field>
            <Field label="Max coupon discount %" htmlFor="maxDiscountPercent" hint="Enforced when sellers create coupons.">
              <input id="maxDiscountPercent" name="maxDiscountPercent" type="number" min={1} max={90} defaultValue={s.maxDiscountPercent} className="input" />
            </Field>
            <Field label="Campaign min shop rating" htmlFor="campaignEligibilityMinRating">
              <input id="campaignEligibilityMinRating" name="campaignEligibilityMinRating" type="number" step="0.1" min={0} max={5} defaultValue={s.campaignEligibilityMinRating} className="input" />
            </Field>
          </Card>
          <Card className="p-5" hidden={tab !== "commission" && tab !== "shipping"}>
            <h2 className="font-semibold mb-4">Shipping rules</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Standard fee (Rs.)" htmlFor="deliveryStandard">
                <input id="deliveryStandard" name="deliveryStandard" type="number" min={0} defaultValue={s.deliveryStandard} className="input" />
              </Field>
              <Field label="Express fee (Rs.)" htmlFor="deliveryExpress">
                <input id="deliveryExpress" name="deliveryExpress" type="number" min={0} defaultValue={s.deliveryExpress} className="input" />
              </Field>
              <Field label="Free standard delivery from (Rs.)" htmlFor="freeDeliveryThreshold" hint="0 = never free">
                <input id="freeDeliveryThreshold" name="freeDeliveryThreshold" type="number" min={0} defaultValue={s.freeDeliveryThreshold} className="input" />
              </Field>
            </div>
            <p className="text-xs text-muted mt-3">
              Charged per shop package. Current: standard {formatRs(Number(s.deliveryStandard))}, express {formatRs(Number(s.deliveryExpress))}.
            </p>
          </Card>
          <Card className="p-5" hidden={tab !== "commission" && tab !== "payments"}>
            <h2 className="font-semibold mb-4">Payment methods</h2>
            <label className="flex items-center justify-between py-3 border-b border-line">
              <span>
                <span className="font-medium block">Cash on delivery</span>
                <span className="text-xs text-muted">Courier collects cash; confirmed with the buyer&apos;s code.</span>
              </span>
              <input type="checkbox" name="codEnabled" defaultChecked={s.codEnabled === "true"} className="accent-emerald-600 size-5" />
            </label>
            <div className="flex items-center justify-between py-3">
              <span>
                <span className="font-medium block">Online payment</span>
                <span className="text-xs text-muted">Needs a hosted, tokenised payment provider in sandbox first. No card data is stored.</span>
              </span>
              <span className="flex items-center gap-2">
                <NotConfigured />
                <input type="checkbox" disabled aria-label="Online payment (not configured)" className="size-5" />
              </span>
            </div>
          </Card>
          <Card className="p-5" hidden={tab !== "roles"}>
            <h2 className="font-semibold mb-3">Roles & permissions</h2>
            <p className="text-sm text-muted mb-4">Permissions are fixed in code and checked on the server for every action.</p>
            <ul className="text-sm space-y-2">
              <li>
                <Badge tone="indigo">Buyer</Badge> shop, orders, reviews, returns; can open a shop (Seller Mode)
              </li>
              <li>
                <Badge tone="gold">Seller</Badge> own shop&apos;s products, stock, orders, coupons, Khata, reports
              </li>
              <li>
                <Badge tone="emerald">Delivery</Badge> assigned shipments only
              </li>
              <li>
                <Badge tone="rose">Admin</Badge> approvals, moderation, categories, disputes, settings (all audited)
              </li>
            </ul>
          </Card>
          <Card className="p-5" hidden={tab !== "content"}>
            <h2 className="font-semibold mb-3">Content & integrations</h2>
            <ul className="text-sm space-y-3">
              {Object.values(EXTERNAL_CHANNELS).map((c) => (
                <li key={c.label} className="flex items-center justify-between">
                  {c.label} <NotConfigured />
                </li>
              ))}
              <li className="flex items-center justify-between">
                Courier API <NotConfigured />
              </li>
              <li className="flex items-center justify-between">
                S3 image storage <NotConfigured />
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </ActionForm>
  );
}
