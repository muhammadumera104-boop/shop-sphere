// Digital Khata: a ledger that is completely separate from marketplace payments.
// Balance = credit given ("you gave") - payments received ("you got").
import { prisma } from "../db";
import { AuthError, type Actor } from "../permissions";
import { UserError } from "../actions";

export type EntryLike = { id?: string; type: string; amount: number; date: Date; deletedAt?: Date | null; note?: string };

export function partyBalance(entries: EntryLike[]): number {
  return entries.reduce((sum, e) => (e.deletedAt ? sum : sum + (e.type === "CREDIT" ? e.amount : -e.amount)), 0);
}

/** Entries in date order with the running balance after each one. */
export function statement<T extends EntryLike>(entries: T[]): (T & { running: number })[] {
  let running = 0;
  return [...entries]
    .filter((e) => !e.deletedAt)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => {
      running += e.type === "CREDIT" ? e.amount : -e.amount;
      return { ...e, running };
    });
}

function shopOf(actor: Actor): string {
  if (!actor.shop) throw new AuthError("Open a shop first to use Digital Khata.");
  return actor.shop.id;
}

export async function ownParty(actor: Actor, partyId: string) {
  const party = await prisma.khataParty.findUnique({ where: { id: partyId } });
  if (!party || party.shopId !== shopOf(actor)) throw new AuthError("Customer not found.", "NOT_FOUND");
  return party;
}

async function ownEntry(actor: Actor, entryId: string) {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: entryId }, include: { party: true } });
  if (!entry || entry.party.shopId !== shopOf(actor) || entry.deletedAt) throw new AuthError("Entry not found.", "NOT_FOUND");
  return entry;
}

export async function addLedgerEntry(actor: Actor, input: { partyId: string; type: "CREDIT" | "PAYMENT"; amount: number; date: Date; note: string }) {
  await ownParty(actor, input.partyId);
  return prisma.ledgerEntry.create({ data: { ...input, createdById: actor.id } });
}

const snap = (e: { amount: number; date: Date; note: string; type: string }) =>
  JSON.stringify({ type: e.type, amount: e.amount, date: e.date.toISOString().slice(0, 10), note: e.note });

/** Edits are allowed but always leave a revision behind. */
export async function editLedgerEntry(actor: Actor, input: { entryId: string; amount: number; date: Date; note: string }) {
  const entry = await ownEntry(actor, input.entryId);
  if (entry.amount === input.amount && entry.note === input.note && entry.date.toISOString().slice(0, 10) === input.date.toISOString().slice(0, 10)) {
    throw new UserError("Nothing changed.");
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.ledgerEntry.update({ where: { id: entry.id }, data: { amount: input.amount, date: input.date, note: input.note } });
    await tx.ledgerEntryRevision.create({ data: { entryId: entry.id, editorId: actor.id, action: "EDIT", before: snap(entry), after: snap(updated) } });
    return updated;
  });
}

/** Soft delete so the history is never lost. */
export async function deleteLedgerEntry(actor: Actor, entryId: string) {
  const entry = await ownEntry(actor, entryId);
  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.update({ where: { id: entry.id }, data: { deletedAt: new Date() } });
    await tx.ledgerEntryRevision.create({ data: { entryId: entry.id, editorId: actor.id, action: "DELETE", before: snap(entry), after: "{}" } });
  });
}

export async function partiesWithBalances(shopId: string, type?: "CUSTOMER" | "SUPPLIER", q?: string) {
  const parties = await prisma.khataParty.findMany({
    where: { shopId, ...(type ? { type } : {}), ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}) },
    include: { entries: { where: { deletedAt: null }, select: { type: true, amount: true, date: true } } },
    orderBy: { name: "asc" },
  });
  return parties.map(({ entries, ...p }) => ({
    ...p,
    balance: partyBalance(entries),
    lastEntry: entries.reduce<Date | null>((d, e) => (!d || e.date > d ? e.date : d), null),
  }));
}

export async function khataSummary(shopId: string) {
  const all = await partiesWithBalances(shopId);
  const customers = all.filter((p) => p.type === "CUSTOMER");
  const suppliers = all.filter((p) => p.type === "SUPPLIER");
  return {
    receivable: customers.reduce((s, p) => s + Math.max(0, p.balance), 0),
    payable: suppliers.reduce((s, p) => s + Math.max(0, p.balance), 0),
    customers: customers.length,
    suppliers: suppliers.length,
  };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          let s = String(c);
          // Neutralise spreadsheet formula injection.
          if (/^[=+\-@]/.test(s) && typeof c === "string") s = `'${s}`;
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
