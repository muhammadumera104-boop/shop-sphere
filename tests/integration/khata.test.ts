import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addLedgerEntry, deleteLedgerEntry, editLedgerEntry, khataSummary, partiesWithBalances, statement } from "@/lib/services/khata";
import { makeShop, makeUser, resetDb } from "../helpers";

beforeEach(resetDb);
const d = (s: string) => new Date(`2026-10-${s}T12:00:00`);

describe("Digital Khata", () => {
  it("credit, payment and balance for a customer", async () => {
    const { owner, shop } = await makeShop();
    const party = await prisma.khataParty.create({ data: { shopId: shop.id, name: "Ali Raza", type: "CUSTOMER" } });
    await addLedgerEntry(owner, { partyId: party.id, type: "CREDIT", amount: 2500, date: d("12"), note: "Goods on credit" });
    await addLedgerEntry(owner, { partyId: party.id, type: "PAYMENT", amount: 1000, date: d("15"), note: "Payment received" });
    await addLedgerEntry(owner, { partyId: party.id, type: "CREDIT", amount: 2700, date: d("20"), note: "Goods on credit" });

    const [row] = await partiesWithBalances(shop.id, "CUSTOMER");
    expect(row.balance).toBe(4200);
    const entries = await prisma.ledgerEntry.findMany({ where: { partyId: party.id } });
    expect(statement(entries).map((e) => e.running)).toEqual([2500, 1500, 4200]);
  });

  it("edits and deletes keep an audit history and update the balance", async () => {
    const { owner, shop } = await makeShop();
    const party = await prisma.khataParty.create({ data: { shopId: shop.id, name: "Sara", type: "CUSTOMER" } });
    const e = await addLedgerEntry(owner, { partyId: party.id, type: "CREDIT", amount: 1000, date: d("01"), note: "" });
    await editLedgerEntry(owner, { entryId: e.id, amount: 1500, date: d("02"), note: "corrected" });
    await addLedgerEntry(owner, { partyId: party.id, type: "PAYMENT", amount: 500, date: d("03"), note: "" });
    expect((await partiesWithBalances(shop.id))[0].balance).toBe(1000);

    await deleteLedgerEntry(owner, e.id);
    expect((await partiesWithBalances(shop.id))[0].balance).toBe(-500);
    const revs = await prisma.ledgerEntryRevision.findMany({ where: { entryId: e.id }, orderBy: { createdAt: "asc" } });
    expect(revs.map((r) => r.action)).toEqual(["EDIT", "DELETE"]);
    expect(JSON.parse(revs[0].before).amount).toBe(1000);
    expect(JSON.parse(revs[0].after).amount).toBe(1500);
    // The row still exists (soft delete) so history is never lost.
    expect(await prisma.ledgerEntry.count({ where: { id: e.id } })).toBe(1);
  });

  it("summary separates receivables (customers) from payables (suppliers)", async () => {
    const { owner, shop } = await makeShop();
    const c = await prisma.khataParty.create({ data: { shopId: shop.id, name: "C", type: "CUSTOMER" } });
    const paid = await prisma.khataParty.create({ data: { shopId: shop.id, name: "P", type: "CUSTOMER" } });
    const s = await prisma.khataParty.create({ data: { shopId: shop.id, name: "S", type: "SUPPLIER" } });
    await addLedgerEntry(owner, { partyId: c.id, type: "CREDIT", amount: 3000, date: d("01"), note: "" });
    await addLedgerEntry(owner, { partyId: paid.id, type: "CREDIT", amount: 800, date: d("01"), note: "" });
    await addLedgerEntry(owner, { partyId: paid.id, type: "PAYMENT", amount: 800, date: d("02"), note: "" });
    await addLedgerEntry(owner, { partyId: s.id, type: "CREDIT", amount: 15000, date: d("01"), note: "" });
    await addLedgerEntry(owner, { partyId: s.id, type: "PAYMENT", amount: 6800, date: d("05"), note: "" });
    expect(await khataSummary(shop.id)).toEqual({ receivable: 3000, payable: 8200, customers: 2, suppliers: 1 });
  });

  it("a seller cannot read or write another shop's ledger", async () => {
    const a = await makeShop();
    const b = await makeShop();
    const party = await prisma.khataParty.create({ data: { shopId: a.shop.id, name: "Ali", type: "CUSTOMER" } });
    const entry = await addLedgerEntry(a.owner, { partyId: party.id, type: "CREDIT", amount: 100, date: d("01"), note: "" });
    await expect(addLedgerEntry(b.owner, { partyId: party.id, type: "CREDIT", amount: 1, date: d("01"), note: "" })).rejects.toThrow(/not found/i);
    await expect(editLedgerEntry(b.owner, { entryId: entry.id, amount: 1, date: d("01"), note: "" })).rejects.toThrow(/not found/i);
    await expect(deleteLedgerEntry(b.owner, entry.id)).rejects.toThrow(/not found/i);
    const buyer = await makeUser();
    await expect(addLedgerEntry(buyer, { partyId: party.id, type: "CREDIT", amount: 1, date: d("01"), note: "" })).rejects.toThrow(/open a shop/i);
    expect((await partiesWithBalances(a.shop.id))[0].balance).toBe(100);
  });
});
