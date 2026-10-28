import { prisma } from "../db";
import { SHIPMENT_NEXT, type ShipmentStatus } from "../constants";
import { AuthError, type Actor } from "../permissions";
import { UserError } from "../actions";
import { applyOrderStatus } from "./orders";
import { notify } from "../notify";

async function ownShipment(actor: Actor, shipmentId: string) {
  if (actor.role !== "DELIVERY" && actor.role !== "ADMIN") throw new AuthError("Delivery partners only.");
  const s = await prisma.shipment.findUnique({ where: { id: shipmentId }, include: { order: true } });
  if (!s || (actor.role === "DELIVERY" && s.deliveryPartnerId !== actor.id)) throw new AuthError("Shipment not found.", "NOT_FOUND");
  return s;
}

const LABEL: Record<ShipmentStatus, string> = {
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery problem reported",
};

/** Progress a shipment (picked up / out for delivery / problem). Delivery itself goes through confirmDelivery. */
export async function updateShipment(actor: Actor, shipmentId: string, to: ShipmentStatus, note = "") {
  const s = await ownShipment(actor, shipmentId);
  if (to === "DELIVERED") throw new UserError("Use the delivery confirmation screen to mark delivered.");
  if (!SHIPMENT_NEXT[s.status as ShipmentStatus].includes(to)) throw new UserError(`Cannot move from ${LABEL[s.status as ShipmentStatus]} to ${LABEL[to]}.`);
  if (to === "FAILED" && note.trim().length < 3) throw new UserError("Describe the problem.");
  await prisma.$transaction(async (tx) => {
    const moved = await tx.shipment.updateMany({ where: { id: s.id, status: s.status }, data: { status: to, notes: note || s.notes } });
    if (moved.count !== 1) throw new UserError("This shipment was updated elsewhere. Refresh and try again.");
    await tx.shipmentEvent.create({ data: { shipmentId: s.id, status: to, note } });
    await notify(s.order.buyerId, { title: `Order #${s.order.number}: ${LABEL[to]}`, body: note || "Your parcel status changed.", link: `/account/orders/${s.order.number}` }, tx);
  });
}

/** Confirm delivery with the buyer's 4-digit code; for COD the cash must be marked collected. */
export async function confirmDelivery(
  actor: Actor,
  input: { shipmentId: string; code: string; cashCollected: boolean; notes: string; photoUrl?: string | null },
) {
  const s = await ownShipment(actor, input.shipmentId);
  if (s.status !== "OUT_FOR_DELIVERY") throw new UserError("Mark the parcel out for delivery first.");
  if (input.code !== s.order.deliveryCode) throw new UserError("The customer code is not correct.");
  if (s.order.paymentMethod === "COD" && !input.cashCollected) throw new UserError("Confirm that you collected the cash.");
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: s.id },
      data: { status: "DELIVERED", deliveredAt: new Date(), notes: input.notes, proofPhotoUrl: input.photoUrl ?? null },
    });
    await tx.shipmentEvent.create({ data: { shipmentId: s.id, status: "DELIVERED", note: input.notes } });
    await applyOrderStatus(tx, s.orderId, "DELIVERED", actor.id, "Delivered and cash collected");
  });
}

/** A shipment by order number, only if assigned to this delivery partner. */
export async function loadShipment(userId: string, number: string) {
  const n = Number(number);
  if (!Number.isInteger(n)) return null;
  const s = await prisma.shipment.findFirst({
    where: { order: { number: n }, deliveryPartnerId: userId },
    include: { order: { include: { items: true, shop: { select: { name: true, pickupAddress: true, phone: true } } } }, events: { orderBy: { createdAt: "asc" } } },
  });
  return s;
}
