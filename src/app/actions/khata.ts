"use server";
// Digital Khata actions: separate from marketplace payments. Every action is limited to the seller's own shop.
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { actionError, formObject, type ActionState, UserError } from "@/lib/actions";
import { addLedgerEntry, deleteLedgerEntry, editLedgerEntry, ownParty, partyBalance } from "@/lib/services/khata";
import { EXTERNAL_CHANNELS } from "@/lib/notify";
import { formatRs } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { expenseSchema, ledgerEditSchema, ledgerEntrySchema, partySchema } from "@/lib/validation";

export async function savePartyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const { id, ...data } = partySchema.parse(formObject(fd));
    if (id) {
      await ownParty(user, id);
      await prisma.khataParty.update({ where: { id }, data });
    } else {
      await prisma.khataParty.create({ data: { ...data, shopId: user.shop.id } });
    }
    return { ok: true, message: `${data.type === "SUPPLIER" ? "Supplier" : "Customer"} saved.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function addEntryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = ledgerEntrySchema.parse(formObject(fd));
    await addLedgerEntry(user, input);
    return { ok: true, message: input.type === "CREDIT" ? `Recorded: you gave ${formatRs(input.amount)}.` : `Recorded: you got ${formatRs(input.amount)}.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function editEntryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    await editLedgerEntry(user, ledgerEditSchema.parse(formObject(fd)));
    return { ok: true, message: "Entry updated. The previous values are kept in the history." };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteEntryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    await deleteLedgerEntry(user, String(fd.get("entryId") ?? ""));
    return { ok: true, message: "Entry removed (kept in history)." };
  } catch (e) {
    return actionError(e);
  }
}

/** Payment reminders need the customer's consent, and SMS is not configured: we only prepare the text. */
export async function reminderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const party = await ownParty(user, String(fd.get("partyId") ?? ""));
    if (!party.reminderConsent) throw new UserError("This customer has not agreed to receive reminders.");
    if (!rateLimit(`reminder:${party.id}`, 3, 24 * 3600_000).ok) throw new UserError("You already prepared reminders for this customer today.");
    const entries = await prisma.ledgerEntry.findMany({ where: { partyId: party.id, deletedAt: null } });
    const due = partyBalance(entries);
    if (due <= 0) throw new UserError("Nothing is due from this customer.");
    const text = `Assalam o Alaikum ${party.name}, your balance at ${user.shop.name} is ${formatRs(due)}. Thank you!`;
    return {
      ok: true,
      message: EXTERNAL_CHANNELS.sms.configured ? "Reminder sent." : `SMS gateway is not configured, so nothing was sent. Message to share yourself: "${text}"`,
    };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = expenseSchema.parse(formObject(fd));
    await prisma.expense.create({ data: { ...input, shopId: user.shop.id } });
    return { ok: true, message: "Expense added." };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const r = await prisma.expense.deleteMany({ where: { id: String(fd.get("id") ?? ""), shopId: user.shop.id } });
    if (r.count === 0) throw new UserError("Expense not found.");
    return { ok: true, message: "Expense deleted." };
  } catch (e) {
    return actionError(e);
  }
}
