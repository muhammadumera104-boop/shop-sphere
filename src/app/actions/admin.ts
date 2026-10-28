"use server";
// Admin actions. Every action requires the ADMIN role and writes an audit log entry.
import { prisma } from "@/lib/db";
import { requestMeta, requireRole } from "@/lib/auth";
import { actionError, formObject, type ActionState, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { applyOrderStatus } from "@/lib/services/orders";
import { campaignSchema, categorySchema, settingsSchema } from "@/lib/validation";
import { formatRs } from "@/lib/format";

async function admin() {
  const user = await requireRole(["ADMIN"]);
  return { user, meta: await requestMeta() };
}

export async function sellerDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const shopId = String(fd.get("shopId") ?? "");
    const decision = String(fd.get("decision") ?? "");
    const note = String(fd.get("note") ?? "").slice(0, 300);
    const map: Record<string, { to: string; from: string[]; action: string }> = {
      approve: { to: "APPROVED", from: ["PENDING", "REJECTED"], action: "SELLER_APPROVED" },
      reject: { to: "REJECTED", from: ["PENDING"], action: "SELLER_REJECTED" },
      suspend: { to: "SUSPENDED", from: ["APPROVED"], action: "SELLER_SUSPENDED" },
      reinstate: { to: "APPROVED", from: ["SUSPENDED"], action: "SELLER_REINSTATED" },
    };
    const d = map[decision];
    if (!d) throw new UserError("Unknown decision.");
    if ((decision === "reject" || decision === "suspend") && note.trim().length < 3) throw new UserError("Add a short reason for the seller.");
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new UserError("Shop not found.");
    if (!d.from.includes(shop.status)) throw new UserError(`A ${shop.status.toLowerCase()} shop cannot be ${d.to.toLowerCase()}.`);
    await prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id: shopId }, data: { status: d.to, statusNote: note } });
      await audit(user.id, d.action, `Shop: ${shop.name}`, note, meta, tx);
      await notify(shop.ownerId, { kind: "ACCOUNT", title: `Your shop is ${d.to.toLowerCase()}`, body: note || (d.to === "APPROVED" ? "Your active products are now public." : ""), link: "/seller" }, tx);
    });
    return { ok: true, message: `${shop.name} ${d.to.toLowerCase()}.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function listingDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const productId = String(fd.get("productId") ?? "");
    const decision = String(fd.get("decision") ?? "");
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { shop: true } });
    if (!product) throw new UserError("Listing not found.");
    const reason = String(fd.get("reason") ?? "Policy review").slice(0, 200);
    await prisma.$transaction(async (tx) => {
      if (decision === "remove") {
        await tx.product.update({ where: { id: productId }, data: { moderation: "REMOVED" } });
        await tx.listingReport.updateMany({ where: { productId, status: "OPEN" }, data: { status: "REMOVED" } });
        await audit(user.id, "LISTING_REMOVED", `Product: ${product.title}`, reason, meta, tx);
        await notify(product.shop.ownerId, { kind: "ACCOUNT", title: "A listing was removed", body: `${product.title}: ${reason}`, link: "/seller/products" }, tx);
      } else if (decision === "keep") {
        await tx.listingReport.updateMany({ where: { productId, status: "OPEN" }, data: { status: "KEPT" } });
        await audit(user.id, "LISTING_KEPT", `Product: ${product.title}`, "", meta, tx);
      } else if (decision === "warn") {
        await tx.listingReport.updateMany({ where: { productId, status: "OPEN" }, data: { status: "WARNED" } });
        await audit(user.id, "SELLER_WARNED", `Product: ${product.title}`, reason, meta, tx);
        await notify(product.shop.ownerId, { kind: "ACCOUNT", title: "Listing warning", body: `${product.title}: ${reason}. Please fix it to avoid removal.`, link: `/seller/products/${product.id}` }, tx);
      } else if (decision === "restore") {
        await tx.product.update({ where: { id: productId }, data: { moderation: "OK" } });
        await audit(user.id, "LISTING_RESTORED", `Product: ${product.title}`, "", meta, tx);
      } else throw new UserError("Unknown decision.");
    });
    return { ok: true, message: "Done." };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const { id, ...data } = categorySchema.parse(formObject(fd));
    const dup = await prisma.category.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } });
    if (dup) throw new UserError("Another category uses this slug.");
    if (id && data.parentId) {
      // Prevent cycles: walk up from the new parent.
      let cur: string | null = data.parentId;
      while (cur) {
        if (cur === id) throw new UserError("A category cannot be inside itself.");
        cur = (await prisma.category.findUnique({ where: { id: cur }, select: { parentId: true } }))?.parentId ?? null;
      }
    }
    if (id) {
      await prisma.category.update({ where: { id }, data });
      await audit(user.id, "CATEGORY_UPDATED", `Category: ${data.name}`, data.isActive ? "" : "inactive", meta);
    } else {
      await prisma.category.create({ data });
      await audit(user.id, "CATEGORY_CREATED", `Category: ${data.name}`, "", meta);
    }
    return { ok: true, message: "Category saved." };
  } catch (e) {
    return actionError(e);
  }
}

export async function disputeDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const ticketId = String(fd.get("ticketId") ?? "");
    const decision = String(fd.get("decision") ?? "");
    const message = String(fd.get("message") ?? "").trim().slice(0, 1000);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { order: { include: { shop: true } } } });
    if (!ticket || !ticket.order) throw new UserError("Case not found.");
    if (ticket.status !== "OPEN") throw new UserError("This case is already closed.");
    const order = ticket.order;
    await prisma.$transaction(async (tx) => {
      if (decision === "reply") {
        if (message.length < 2) throw new UserError("Write a message.");
        await tx.ticketMessage.create({ data: { ticketId, authorId: user.id, body: message } });
        await notify(ticket.userId, { kind: "ORDER", title: `Support replied about #${order.number}`, body: message.slice(0, 120), link: `/account/orders/${order.number}` }, tx);
        return;
      }
      if (decision === "refund") {
        if (order.status === "DELIVERED") await applyOrderStatus(tx, order.id, "RETURNED", user.id, `Dispute: ${ticket.issue}`);
        else if (["PENDING", "CONFIRMED", "PACKED"].includes(order.status)) await applyOrderStatus(tx, order.id, "CANCELLED", user.id, `Dispute: ${ticket.issue}`);
        else if (order.status === "SHIPPED") await tx.refund.create({ data: { orderId: order.id, amount: order.total, reason: `Dispute: ${ticket.issue}`, status: "PENDING" } });
        await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "RESOLVED_BUYER" } });
        await audit(user.id, "DISPUTE_REFUNDED", `Order #${order.number}`, `${ticket.issue}; ${formatRs(order.total)}`, meta, tx);
      } else if (decision === "seller") {
        await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "RESOLVED_SELLER" } });
        await audit(user.id, "DISPUTE_SELLER", `Order #${order.number}`, ticket.issue, meta, tx);
      } else throw new UserError("Unknown decision.");
      if (message) await tx.ticketMessage.create({ data: { ticketId, authorId: user.id, body: message } });
      const outcome = decision === "refund" ? "resolved in your favour; a refund is recorded" : "closed in favour of the seller";
      await notify(ticket.userId, { kind: "ORDER", title: `Case for #${order.number} ${outcome}`, body: message || ticket.issue, link: `/account/orders/${order.number}` }, tx);
      await notify(order.shop.ownerId, { kind: "ORDER", title: `Dispute for #${order.number} closed`, body: decision === "refund" ? "Buyer refunded." : "Decided in your favour.", link: "/seller/orders" }, tx);
    });
    return { ok: true, message: decision === "reply" ? "Reply sent." : "Case closed." };
  } catch (e) {
    return actionError(e);
  }
}

export async function createCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const input = campaignSchema.parse(formObject(fd));
    await prisma.campaign.create({ data: input });
    await audit(user.id, "CAMPAIGN_CREATED", `Campaign: ${input.name}`, `max ${input.maxDiscount}%`, meta);
    return { ok: true, message: "Campaign created." };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const input = settingsSchema.parse(formObject(fd));
    const rows = Object.entries(input).map(([key, value]) => ({ key, value: String(value) }));
    const before = await prisma.platformSetting.findMany();
    await prisma.$transaction(async (tx) => {
      for (const r of rows) await tx.platformSetting.upsert({ where: { key: r.key }, create: r, update: { value: r.value } });
      const changed = rows.filter((r) => before.find((b) => b.key === r.key)?.value !== r.value).map((r) => `${r.key}=${r.value}`);
      await audit(user.id, "SETTINGS_UPDATED", "Platform settings", changed.join(", ").slice(0, 500), meta, tx);
    });
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return actionError(e);
  }
}

export async function reassignShipmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, meta } = await admin();
    const shipmentId = String(fd.get("shipmentId") ?? "");
    const partnerId = String(fd.get("partnerId") ?? "");
    const [s, partner] = await Promise.all([
      prisma.shipment.findUnique({ where: { id: shipmentId }, include: { order: true } }),
      prisma.user.findFirst({ where: { id: partnerId, role: "DELIVERY", status: "ACTIVE" } }),
    ]);
    if (!s || s.status === "DELIVERED") throw new UserError("Shipment not found or already delivered.");
    if (!partner) throw new UserError("Choose an active delivery partner.");
    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({ where: { id: s.id }, data: { deliveryPartnerId: partner.id, status: "ASSIGNED" } });
      await tx.shipmentEvent.create({ data: { shipmentId: s.id, status: "ASSIGNED", note: `Reassigned to ${partner.name} by admin` } });
      await audit(user.id, "SHIPMENT_REASSIGNED", `Order #${s.order.number}`, partner.name, meta, tx);
      await notify(partner.id, { title: `New shipment #${s.order.number}`, body: `Collect ${formatRs(s.order.total)} on delivery.`, link: `/delivery/${s.order.number}` }, tx);
    });
    return { ok: true, message: `Assigned to ${partner.name}.` };
  } catch (e) {
    return actionError(e);
  }
}
