import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { canTransition, type OrderActor, type OrderStatus } from "../constants";
import { computeTotals, effectivePrice, type DeliveryOption, type PricedLine } from "../pricing";
import { isPubliclyVisible, type Actor, AuthError } from "../permissions";
import { getFeeConfig } from "../settings";
import { notify } from "../notify";
import { UserError } from "../actions";
import { formatRs } from "../format";
import { toCouponRule } from "./cart";

type Tx = Prisma.TransactionClient;

/** Atomically reserve stock: succeeds only if enough unreserved stock remains (no overselling). */
export async function reserveStock(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "ProductVariant" SET "reservedQuantity" = "reservedQuantity" + ${qty}
    WHERE "id" = ${variantId} AND "stockQuantity" - "reservedQuantity" >= ${qty}`;
  return n === 1;
}

async function nextOrderNumber(tx: Tx): Promise<number> {
  const r = await tx.order.aggregate({ _max: { number: true } });
  return (r._max.number ?? 1000) + 1;
}

/**
 * Checkout. Runs in one transaction: re-reads cart and prices from the DB, validates coupon,
 * reserves stock, creates one order per shop with price-snapshot items, COD payment and a status event.
 */
export async function placeOrder(userId: string, input: { addressId: string; deliveryOption: DeliveryOption }) {
  const fees = await getFeeConfig();
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { variant: { include: { product: { include: { shop: true } } } } } } },
      });
      if (!cart || cart.items.length === 0) throw new UserError("Your cart is empty.");
      const address = await tx.address.findFirst({ where: { id: input.addressId, userId } });
      if (!address) throw new UserError("Choose a delivery address.");

      for (const i of cart.items) {
        if (!isPubliclyVisible(i.variant.product)) throw new UserError(`"${i.variant.product.title}" is no longer available. Remove it to continue.`);
        if (i.variant.product.shop.ownerId === userId) throw new UserError("You cannot buy from your own shop.");
      }
      const lines: PricedLine[] = cart.items.map((i) => ({
        shopId: i.variant.product.shopId,
        productId: i.variant.productId,
        variantId: i.variantId,
        unitPrice: effectivePrice(i.variant.product),
        quantity: i.quantity,
      }));
      const coupon = cart.couponCode ? await tx.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
      const totals = computeTotals(lines, { coupon: coupon ? toCouponRule(coupon) : null, option: input.deliveryOption, fees });
      if (totals.couponError) throw new UserError(`${totals.couponError} Remove the coupon to continue.`);

      for (const i of cart.items) {
        const ok = await reserveStock(tx, i.variantId, i.quantity);
        if (!ok) throw new UserError(`Not enough stock for "${i.variant.product.title}" (${i.variant.name}).`);
      }
      if (coupon && totals.discount > 0) {
        const n = await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${coupon.id} AND "usedCount" < "usageLimit"`;
        if (n !== 1) throw new UserError("This coupon has reached its usage limit.");
      }

      const group = crypto.randomUUID();
      let number = await nextOrderNumber(tx);
      const addressText = `${address.line1}, ${address.city}${address.province ? `, ${address.province}` : ""}`;
      const orders = [];
      for (const st of totals.shops) {
        const shopItems = cart.items.filter((i) => i.variant.product.shopId === st.shopId);
        const order = await tx.order.create({
          data: {
            number: number++,
            checkoutGroup: group,
            buyerId: userId,
            shopId: st.shopId,
            addressText,
            addressName: address.fullName,
            addressPhone: address.phone,
            subtotal: st.subtotal,
            discount: st.discount,
            deliveryFee: st.deliveryFee,
            total: st.total,
            couponCode: st.discount > 0 ? coupon?.code : null,
            deliveryOption: input.deliveryOption,
            paymentMethod: "COD",
            deliveryCode: String(crypto.randomInt(1000, 10000)),
            items: {
              create: shopItems.map((i) => {
                const unitPrice = effectivePrice(i.variant.product);
                return {
                  productId: i.variant.productId,
                  variantId: i.variantId,
                  titleSnapshot: i.variant.product.title,
                  variantName: i.variant.name,
                  unitPrice,
                  quantity: i.quantity,
                  lineTotal: unitPrice * i.quantity,
                };
              }),
            },
            events: { create: { status: "PENDING", note: "Order placed (Cash on Delivery)", actorId: userId } },
            payment: { create: { method: "COD", status: "PENDING", amount: st.total } },
          },
          include: { shop: true },
        });
        orders.push(order);
        await notify(order.shop.ownerId, { title: `New order #${order.number}`, body: `${formatRs(order.total)}, Cash on Delivery`, link: "/seller/orders" }, tx);
        await notify(userId, { title: `Order #${order.number} placed`, body: `We sent it to ${order.shop.name}.`, link: `/account/orders/${order.number}` }, tx);
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      return orders;
    },
    { timeout: 20000 },
  );
}

/** Which roles the actor plays for this order. */
export function actorKinds(actor: Actor, order: { buyerId: string; shopId: string; shipment?: { deliveryPartnerId: string | null } | null }): OrderActor[] {
  const kinds: OrderActor[] = [];
  if (actor.role === "ADMIN") kinds.push("ADMIN");
  if (order.buyerId === actor.id) kinds.push("BUYER");
  if (actor.shop && actor.shop.id === order.shopId) kinds.push("SELLER");
  if (actor.role === "DELIVERY" && order.shipment?.deliveryPartnerId === actor.id) kinds.push("DELIVERY");
  return kinds;
}

async function pickDeliveryPartner(tx: Tx): Promise<string | null> {
  const partners = await tx.user.findMany({
    where: { role: "DELIVERY", status: "ACTIVE" },
    select: { id: true, _count: { select: { shipments: { where: { status: { notIn: ["DELIVERED"] } } } } } },
  });
  partners.sort((a, b) => a._count.shipments - b._count.shipments);
  return partners[0]?.id ?? null;
}

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "has been confirmed by the seller",
  PACKED: "has been packed",
  SHIPPED: "is on its way",
  DELIVERED: "has been delivered",
  CANCELLED: "has been cancelled",
  RETURNED: "has been returned and refunded",
};

/** Apply a status change and its side effects (stock, payment, shipment). Caller checks permission. */
export async function applyOrderStatus(tx: Tx, orderId: string, to: OrderStatus, actorId: string | null, note = "") {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shipment: true } });
  const from = order.status as OrderStatus;
  // Guard against concurrent updates: only move if still in the status we read.
  const moved = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (moved.count !== 1) throw new UserError("This order was updated by someone else. Refresh and try again.");

  if (to === "CANCELLED") {
    for (const i of order.items) {
      await tx.$executeRaw`UPDATE "ProductVariant" SET "reservedQuantity" = CASE WHEN "reservedQuantity" > ${i.quantity} THEN "reservedQuantity" - ${i.quantity} ELSE 0 END WHERE "id" = ${i.variantId}`;
    }
    await tx.payment.updateMany({ where: { orderId }, data: { status: "FAILED" } });
  }
  if (to === "SHIPPED") {
    // Stock leaves the shelf: commit the reservation.
    for (const i of order.items) {
      await tx.$executeRaw`UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" - ${i.quantity},
        "reservedQuantity" = CASE WHEN "reservedQuantity" > ${i.quantity} THEN "reservedQuantity" - ${i.quantity} ELSE 0 END WHERE "id" = ${i.variantId}`;
    }
    const partnerId = await pickDeliveryPartner(tx);
    await tx.shipment.create({
      data: {
        orderId,
        deliveryPartnerId: partnerId,
        status: "ASSIGNED",
        events: { create: { status: "ASSIGNED", note: partnerId ? "Handed to delivery partner" : "Waiting for a delivery partner" } },
      },
    });
    if (partnerId) await notify(partnerId, { title: `New shipment #${order.number}`, body: `Collect ${formatRs(order.total)} on delivery.`, link: `/delivery/${order.number}` }, tx);
  }
  if (to === "DELIVERED") {
    await tx.payment.updateMany({ where: { orderId }, data: { status: "PAID", collectedAt: new Date() } });
  }
  if (to === "RETURNED") {
    for (const i of order.items) {
      await tx.productVariant.update({ where: { id: i.variantId }, data: { stockQuantity: { increment: i.quantity } } });
    }
    await tx.payment.updateMany({ where: { orderId }, data: { status: "REFUNDED" } });
    await tx.refund.create({ data: { orderId, amount: order.total, reason: note || "Order returned", status: "COMPLETED" } });
  }
  await tx.orderStatusEvent.create({ data: { orderId, status: to, note, actorId } });
  const msg = STATUS_MESSAGES[to];
  if (msg) await notify(order.buyerId, { title: `Order #${order.number} ${msg}`, body: note || `Status: ${to.toLowerCase()}`, link: `/account/orders/${order.number}` }, tx);
}

/** Permission-checked status change (seller / buyer / admin). */
export async function changeOrderStatus(actor: Actor, orderId: string, to: OrderStatus, note = "") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
    if (!order) throw new AuthError("Order not found.", "NOT_FOUND");
    const kinds = actorKinds(actor, order);
    if (kinds.length === 0) throw new AuthError("Order not found.", "NOT_FOUND");
    const from = order.status as OrderStatus;
    if (!kinds.some((k) => canTransition(from, to, k))) {
      throw new UserError(`An order that is ${from.toLowerCase()} cannot be moved to ${to.toLowerCase()} by you.`);
    }
    await applyOrderStatus(tx, orderId, to, actor.id, note);
  });
}
