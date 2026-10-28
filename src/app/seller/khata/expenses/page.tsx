import { prisma } from "@/lib/db";
import { pageSeller } from "@/lib/auth";
import { formatDate, formatRs, titleCase, toDateInput } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { deleteExpenseAction, saveExpenseAction } from "@/app/actions/khata";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { DonutChart } from "@/components/charts";
import { Badge, Card, CardHeader, EmptyState, Field, KpiCard, PageTitle, Table, td, th, type Tone } from "@/components/ui";
import { KhataTabs } from "../KhataTabs";

export const metadata = { title: "Expenses" };
const CAT_TONE: Record<string, Tone> = { RENT: "indigo", SALARIES: "emerald", TRANSPORT: "gold", UTILITIES: "rose", OTHER: "violet" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await pageSeller("/seller/khata/expenses");
  const sp = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const from = valid(sp.from) ?? toDateInput(monthStart);
  const to = valid(sp.to) ?? toDateInput(now);
  const range = { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) };
  const [expenses, thisMonth, lastMonth] = await Promise.all([
    prisma.expense.findMany({ where: { shopId: user.shop.id, date: range }, orderBy: { date: "desc" } }),
    prisma.expense.aggregate({ where: { shopId: user.shop.id, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { shopId: user.shop.id, date: { gte: lastStart, lt: monthStart } }, _sum: { amount: true } }),
  ]);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: titleCase(c), value: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageTitle
        title="Expenses"
        sample
        action={
          <form className="flex flex-wrap items-end gap-2">
            <label className="text-xs">
              <span className="block text-muted mb-1">From</span>
              <input type="date" name="from" defaultValue={from} className="input h-9 py-1 w-auto" />
            </label>
            <label className="text-xs">
              <span className="block text-muted mb-1">To</span>
              <input type="date" name="to" defaultValue={to} className="input h-9 py-1 w-auto" />
            </label>
            <button className="h-9 px-4 rounded-full bg-navy text-white text-xs">Apply</button>
          </form>
        }
      />
      <div className="mb-5">
        <KhataTabs active="expenses" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="This month" value={formatRs(thisMonth._sum.amount ?? 0)} tone="emerald" />
        <KpiCard label="Last month" value={formatRs(lastMonth._sum.amount ?? 0)} tone="indigo" />
        <KpiCard label="Selected range" value={formatRs(total)} tone="gold" hint={`${formatDate(range.gte)} – ${formatDate(range.lte)}`} />
      </div>
      <div className="grid xl:grid-cols-[380px_1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card className="p-5">
            <CardHeader title="By category" />
            {total > 0 ? <DonutChart data={byCat} center={formatRs(total)} /> : <EmptyState title="No expenses in this range" />}
          </Card>
          <Card className="p-5" id="add-expense">
            <h2 className="font-semibold mb-4">+ Add expense</h2>
            <ActionForm action={saveExpenseAction} resetOnSuccess className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" htmlFor="ec">
                  <select id="ec" name="category" className="input">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {titleCase(c)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (Rs.)" htmlFor="ea">
                  <input id="ea" name="amount" type="number" min={1} required className="input" />
                </Field>
              </div>
              <Field label="Date" htmlFor="ed">
                <input id="ed" name="date" type="date" defaultValue={toDateInput(now)} required className="input" />
              </Field>
              <Field label="Note" htmlFor="en">
                <input id="en" name="note" className="input" />
              </Field>
              <SubmitButton variant="emerald" className="w-full">
                Add expense
              </SubmitButton>
            </ActionForm>
          </Card>
        </div>
        <Card>
          {expenses.length === 0 ? (
            <EmptyState icon="₨" title="No expenses in this range" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Category</th>
                  <th className={th}>Note</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(e.date)}</td>
                    <td className={td}>
                      <Badge tone={CAT_TONE[e.category] ?? "gray"}>{titleCase(e.category)}</Badge>
                    </td>
                    <td className={`${td} text-muted`}>{e.note}</td>
                    <td className={`${td} text-right font-medium`}>{formatRs(e.amount)}</td>
                    <td className={td}>
                      <ActionButton action={deleteExpenseAction} fields={{ id: e.id }} variant="ghost" confirm="Delete this expense?">
                        <span className="text-rose-600">Delete</span>
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
