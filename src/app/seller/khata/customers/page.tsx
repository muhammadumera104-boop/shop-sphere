import Link from "next/link";
import { pageSeller } from "@/lib/auth";
import { formatRs } from "@/lib/format";
import { khataSummary, partiesWithBalances } from "@/lib/services/khata";
import { savePartyAction } from "@/app/actions/khata";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Card, EmptyState, Field, KpiCard, PageTitle } from "@/components/ui";
import { KhataTabs } from "../KhataTabs";

export const metadata = { title: "Digital Khata" };

export default async function KhataCustomers({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const user = await pageSeller("/seller/khata/customers");
  const sp = await searchParams;
  const type = sp.type === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";
  const [summary, parties] = await Promise.all([khataSummary(user.shop.id), partiesWithBalances(user.shop.id, type, sp.q)]);
  const noun = type === "SUPPLIER" ? "supplier" : "customer";

  return (
    <>
      <PageTitle title="Digital Khata" subtitle="Your credit book. Separate from marketplace payments." sample />
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm">
          <p className="text-xs font-semibold tracking-wider uppercase text-white/80">Total receivable</p>
          <p className="text-2xl font-bold mt-1" data-testid="khata-receivable">
            {formatRs(summary.receivable)}
          </p>
          <p className="text-xs text-white/80 mt-1">Customers owe you</p>
        </div>
        <KpiCard label="Total payable" value={formatRs(summary.payable)} tone="rose" hint="You owe suppliers" />
        <KpiCard label={type === "SUPPLIER" ? "Suppliers" : "Customers"} value={type === "SUPPLIER" ? summary.suppliers : summary.customers} tone="emerald" />
      </div>
      <div className="mb-5">
        <KhataTabs active={type === "SUPPLIER" ? "suppliers" : "customers"} />
      </div>
      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <Card>
          <form className="p-4 border-b border-line flex gap-2">
            {type === "SUPPLIER" && <input type="hidden" name="type" value="SUPPLIER" />}
            <label htmlFor="kq" className="sr-only">
              Search
            </label>
            <input id="kq" name="q" defaultValue={sp.q} placeholder={`Search ${noun}s by name or phone`} className="input" />
            <button className="h-10 px-4 rounded-full bg-navy text-white text-sm">Search</button>
          </form>
          {parties.length === 0 ? (
            <EmptyState icon="₨" title={`No ${noun}s yet`} body={`Add a ${noun} to start recording credit and payments.`} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {parties.map((p) => (
                <li key={p.id}>
                  <Link href={`/seller/khata/ledger/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50" data-testid="khata-party">
                    <Avatar name={p.name} tone="emerald" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted">{p.phone || "No phone"}</p>
                    </div>
                    <div className="text-right">
                      {p.balance > 0 ? (
                        <p className="font-semibold text-rose-600">
                          {type === "SUPPLIER" ? "You owe" : "Due"} {formatRs(p.balance)}
                        </p>
                      ) : p.balance < 0 ? (
                        <p className="font-semibold text-indigo-600">Advance {formatRs(-p.balance)}</p>
                      ) : (
                        <p className="font-semibold text-emerald-700">Paid up</p>
                      )}
                      <span className="text-xs text-indigo-600">View ledger</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-4">+ Add {noun}</h2>
          <ActionForm action={savePartyAction} resetOnSuccess className="space-y-4">
            <input type="hidden" name="type" value={type} />
            <Field label="Name" htmlFor="pn">
              <input id="pn" name="name" required className="input" />
            </Field>
            <Field label="Phone" htmlFor="pp">
              <input id="pp" name="phone" className="input" placeholder="0300 1234567" />
            </Field>
            <Field label="Notes" htmlFor="pnotes">
              <input id="pnotes" name="notes" className="input" />
            </Field>
            {type === "CUSTOMER" && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="reminderConsent" className="accent-emerald-600 size-4 mt-0.5" />
                <span>Customer agreed to receive payment reminders</span>
              </label>
            )}
            <SubmitButton variant="emerald" className="w-full">
              Add {noun}
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
