import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatDate, formatDateTime, formatRs, parseJson, toDateInput } from "@/lib/format";
import { partyBalance, statement } from "@/lib/services/khata";
import { addEntryAction, deleteEntryAction, editEntryAction, reminderAction, savePartyAction } from "@/app/actions/khata";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Card, EmptyState, Field, Table, td, th } from "@/components/ui";
import { DownloadIcon, HistoryIcon, PhoneIcon } from "@/components/icons";

export const metadata = { title: "Khata ledger" };

export default async function LedgerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await pageSeller("/seller/khata/customers");
  const { id } = await params;
  const { from, to } = await searchParams;
  const party = await prisma.khataParty.findUnique({
    where: { id },
    include: { entries: { include: { revisions: { include: { editor: { select: { name: true } } }, orderBy: { createdAt: "asc" } } } } },
  });
  // Ownership: only the shop's own parties.
  if (!party || party.shopId !== user.shop.id) notFound();
  const live = party.entries.filter((e) => !e.deletedAt);
  const balance = partyBalance(live);
  const fromD = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00`) : null;
  const toD = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59`) : null;
  const rows = statement(live).filter((e) => (!fromD || e.date >= fromD) && (!toD || e.date <= toD));
  const opening = fromD ? partyBalance(live.filter((e) => e.date < fromD)) : 0;
  const deleted = party.entries.filter((e) => e.deletedAt);
  const supplier = party.type === "SUPPLIER";
  const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  const today = toDateInput(new Date());

  return (
    <>
      <nav className="text-sm text-muted mb-4">
        <Link href={`/seller/khata/customers${supplier ? "?type=SUPPLIER" : ""}`} className="hover:text-ink">
          ← {supplier ? "Suppliers" : "Customers"}
        </Link>
      </nav>
      <div className="grid xl:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={party.name} tone="emerald" className="size-12 text-lg" />
              <div>
                <h1 className="text-xl font-bold">{party.name}</h1>
                <p className="text-sm text-muted inline-flex items-center gap-1">
                  <PhoneIcon className="size-3.5" /> {party.phone || "No phone"}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-page p-4">
              <p className="label-caps">{supplier ? "You owe" : "Balance due"}</p>
              <p className={`text-3xl font-extrabold mt-1 ${balance > 0 ? "text-rose-600" : "text-emerald-700"}`} data-testid="ledger-balance">
                {balance === 0 ? "Paid up" : formatRs(Math.abs(balance))}
                {balance < 0 && <span className="text-sm font-medium"> advance</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <EntryForm partyId={party.id} type="CREDIT" label={supplier ? "You got goods" : "You gave"} today={today} />
              <EntryForm partyId={party.id} type="PAYMENT" label={supplier ? "You paid" : "You got"} today={today} />
            </div>
            {!supplier && (
              <div className="mt-4">
                {party.reminderConsent ? (
                  <ActionButton action={reminderAction} fields={{ partyId: party.id }} variant="secondary" className="[&>button]:w-full w-full">
                    Send reminder (with consent)
                  </ActionButton>
                ) : (
                  <p className="text-xs text-muted">Reminders are off: this customer has not given consent.</p>
                )}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <details>
              <summary className="cursor-pointer font-semibold text-sm">Edit details</summary>
              <ActionForm action={savePartyAction} className="space-y-3 mt-4">
                <input type="hidden" name="id" value={party.id} />
                <input type="hidden" name="type" value={party.type} />
                <Field label="Name" htmlFor="en">
                  <input id="en" name="name" defaultValue={party.name} required className="input" />
                </Field>
                <Field label="Phone" htmlFor="ep">
                  <input id="ep" name="phone" defaultValue={party.phone} className="input" />
                </Field>
                <Field label="Notes" htmlFor="eno">
                  <input id="eno" name="notes" defaultValue={party.notes} className="input" />
                </Field>
                {!supplier && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="reminderConsent" defaultChecked={party.reminderConsent} className="accent-emerald-600 size-4" /> Agreed to reminders
                  </label>
                )}
                <SubmitButton size="sm" variant="emerald">
                  Save
                </SubmitButton>
              </ActionForm>
            </details>
          </Card>
        </div>

        <Card>
          <div className="p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-line">
            <div>
              <h2 className="font-semibold">Transaction history</h2>
              <p className="text-xs text-gray-400">Sample data</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <form className="flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  <span className="block text-muted mb-1">From</span>
                  <input type="date" name="from" defaultValue={from} className="input h-9 py-1 w-auto" />
                </label>
                <label className="text-xs">
                  <span className="block text-muted mb-1">To</span>
                  <input type="date" name="to" defaultValue={to} className="input h-9 py-1 w-auto" />
                </label>
                <button className="h-9 px-4 rounded-full bg-navy text-white text-xs">Filter</button>
              </form>
              <a href={`/seller/khata/ledger/${party.id}/statement${qs ? `?${qs}` : ""}`} className="h-9 px-4 rounded-full border border-line text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50">
                <DownloadIcon className="size-4" /> Download statement
              </a>
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon="₨" title="No entries" body="Record what you gave or got using the buttons on the left." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Description</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fromD && (
                  <tr>
                    <td className={td} colSpan={3}>
                      <span className="text-muted">Opening balance</span>
                    </td>
                    <td className={`${td} text-right font-medium`}>{formatRs(opening)}</td>
                    <td className={td} />
                  </tr>
                )}
                {rows.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className={`${td} whitespace-nowrap`}>{formatDate(e.date)}</td>
                    <td className={td}>
                      {e.note || (e.type === "CREDIT" ? (supplier ? "Goods received" : "Goods on credit") : supplier ? "Payment made" : "Payment received")}
                      {e.revisions.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-gold-ink inline-flex items-center gap-1">
                            <HistoryIcon className="size-3.5" /> edited {e.revisions.length}×
                          </summary>
                          <ul className="mt-1 space-y-1 text-xs text-muted">
                            {e.revisions.map((r) => {
                              const b = parseJson<{ amount?: number; note?: string; date?: string }>(r.before, {});
                              const a = parseJson<{ amount?: number; note?: string; date?: string }>(r.after, {});
                              return (
                                <li key={r.id}>
                                  {formatDateTime(r.createdAt)} by {r.editor.name}: {formatRs(b.amount ?? 0)} → {formatRs(a.amount ?? 0)}
                                  {b.note !== a.note && ` · note "${b.note}" → "${a.note}"`}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className={`${td} text-right font-semibold ${e.type === "CREDIT" ? "text-rose-600" : "text-emerald-700"}`}>
                      {e.type === "CREDIT" ? "+" : "−"} {e.amount.toLocaleString("en-PK")}
                    </td>
                    <td className={`${td} text-right`}>{formatRs(e.running)}</td>
                    <td className={td}>
                      <details className="relative">
                        <summary className="cursor-pointer text-xs text-indigo-600">Edit</summary>
                        <div className="absolute right-0 z-10 mt-2 w-64 card p-3">
                          <ActionForm action={editEntryAction} className="space-y-2">
                            <input type="hidden" name="entryId" value={e.id} />
                            <label className="block text-xs">
                              Amount
                              <input name="amount" type="number" min={1} defaultValue={e.amount} className="input mt-1" />
                            </label>
                            <label className="block text-xs">
                              Date
                              <input name="date" type="date" defaultValue={toDateInput(e.date)} className="input mt-1" />
                            </label>
                            <label className="block text-xs">
                              Note
                              <input name="note" defaultValue={e.note} className="input mt-1" />
                            </label>
                            <SubmitButton size="sm">Save edit</SubmitButton>
                          </ActionForm>
                          <div className="mt-2 pt-2 border-t border-line">
                            <ActionButton action={deleteEntryAction} fields={{ entryId: e.id }} variant="danger" confirm="Remove this entry? It stays in the audit history.">
                              Delete entry
                            </ActionButton>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {deleted.length > 0 && <p className="px-5 py-3 text-xs text-muted border-t border-line">{deleted.length} removed entr{deleted.length === 1 ? "y is" : "ies are"} kept in the audit history.</p>}
          <p className="px-5 py-3 text-xs text-muted border-t border-line">Khata records are separate from marketplace payments.</p>
        </Card>
      </div>
    </>
  );
}

function EntryForm({ partyId, type, label, today }: { partyId: string; type: "CREDIT" | "PAYMENT"; label: string; today: string }) {
  const credit = type === "CREDIT";
  return (
    <details className="group">
      <summary className={`list-none cursor-pointer h-10 rounded-full text-sm font-semibold text-white flex items-center justify-center ${credit ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>{label}</summary>
      <div className="fixed inset-x-4 top-1/4 z-30 sm:absolute sm:inset-auto sm:mt-2 sm:w-72 card p-4 shadow-xl">
        <ActionForm action={addEntryAction} resetOnSuccess className="space-y-3">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="type" value={type} />
          <p className="font-semibold text-sm">{label}</p>
          <label className="block text-xs">
            Amount (Rs.)
            <input name="amount" type="number" min={1} required className="input mt-1" autoFocus />
          </label>
          <label className="block text-xs">
            Date
            <input name="date" type="date" defaultValue={today} required className="input mt-1" />
          </label>
          <label className="block text-xs">
            Note
            <input name="note" className="input mt-1" placeholder={credit ? "Goods on credit" : "Payment received"} />
          </label>
          <SubmitButton size="sm" variant={credit ? "dangerSolid" : "emerald"} className="w-full">
            Save
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}
