import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { placeOrder, changeOrderStatus } from "@/lib/services/orders";
import { addToCart, getCartView } from "@/lib/services/cart";
import { confirmDelivery, updateShipment } from "@/lib/services/delivery";
import { makeBuyerWithCart, makeProduct, makeShop, makeUser, resetDb } from "../helpers";

beforeEach(resetDb);

describe("checkout", () => {
  it("computes totals on the server from DB prices and snapshots them", async () => {
    const { shop, category } = await makeShop();
    const p = await makeProduct(shop.id, category.id, { price: 4999, salePrice: 3499, stock: 5 });
    const { buyer, address } = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 2 }]);

    const [order] = await placeOrder(buyer.id, { addressId: address.id, deliveryOption: "STANDARD" });
    expect(order.subtotal).toBe(6998);
    expect(order.deliveryFee).toBe(0); // 6998 >= free threshold 5000
    expect(order.total).toBe(6998);
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    expect(items[0]).toMatchObject({ unitPrice: 3499, quantity: 2, lineTotal: 6998 });

    // Later price changes do not change the order (price snapshot).
    await prisma.product.update({ where: { id: p.id }, data: { salePrice: 100 } });
    expect((await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).unitPrice).toBe(3499);

    // Event + COD payment recorded, cart emptied.
    expect(await prisma.orderStatusEvent.count({ where: { orderId: order.id, status: "PENDING" } })).toBe(1);
    expect(await prisma.payment.findUnique({ where: { orderId: order.id } })).toMatchObject({ method: "COD", status: "PENDING", amount: 6998 });
    expect(await prisma.cartItem.count({ where: { cart: { userId: buyer.id } } })).toBe(0);
  });

  it("creates one order per shop with delivery per shop and applies the coupon to its shop only", async () => {
    const a = await makeShop();
    const b = await makeShop();
    const pa = await makeProduct(a.shop.id, a.category.id, { price: 2000 });
    const pb = await makeProduct(b.shop.id, b.category.id, { price: 1500 });
    await prisma.coupon.create({
      data: { shopId: a.shop.id, code: "A10", type: "PERCENT", value: 10, startsAt: new Date(Date.now() - 1e6), endsAt: new Date(Date.now() + 1e9), usageLimit: 5 },
    });
    const { buyer, address } = await makeBuyerWithCart(
      [
        { variantId: pa.variants[0].id, quantity: 1 },
        { variantId: pb.variants[0].id, quantity: 1 },
      ],
      "A10",
    );
    const orders = await placeOrder(buyer.id, { addressId: address.id, deliveryOption: "EXPRESS" });
    expect(orders).toHaveLength(2);
    const oa = orders.find((o) => o.shopId === a.shop.id)!;
    const ob = orders.find((o) => o.shopId === b.shop.id)!;
    expect(oa).toMatchObject({ subtotal: 2000, discount: 200, deliveryFee: 300, total: 2100, couponCode: "A10" });
    expect(ob).toMatchObject({ subtotal: 1500, discount: 0, deliveryFee: 300, total: 1800, couponCode: null });
    expect(oa.checkoutGroup).toBe(ob.checkoutGroup);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: "A10" } })).usedCount).toBe(1);
  });

  it("reserves stock and refuses to oversell", async () => {
    const { shop, category } = await makeShop();
    const p = await makeProduct(shop.id, category.id, { stock: 3 });
    const v = p.variants[0];
    const first = await makeBuyerWithCart([{ variantId: v.id, quantity: 2 }]);
    await placeOrder(first.buyer.id, { addressId: first.address.id, deliveryOption: "STANDARD" });
    expect(await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).toMatchObject({ stockQuantity: 3, reservedQuantity: 2 });

    const second = await makeBuyerWithCart([{ variantId: v.id, quantity: 2 }]);
    await expect(placeOrder(second.buyer.id, { addressId: second.address.id, deliveryOption: "STANDARD" })).rejects.toThrow(/Not enough stock/);
    // Failed checkout rolled back completely.
    expect(await prisma.order.count({ where: { buyerId: second.buyer.id } })).toBe(0);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).reservedQuantity).toBe(2);
    expect(await prisma.cartItem.count({ where: { cart: { userId: second.buyer.id } } })).toBe(1);
  });

  it("concurrent checkouts for the last unit: at most one succeeds", async () => {
    const { shop, category } = await makeShop();
    const p = await makeProduct(shop.id, category.id, { stock: 1 });
    const buyers = await Promise.all([1, 2, 3].map(() => makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 1 }])));
    const results = await Promise.allSettled(buyers.map((b) => placeOrder(b.buyer.id, { addressId: b.address.id, deliveryOption: "STANDARD" })));
    expect(results.filter((r) => r.status === "fulfilled").length).toBeLessThanOrEqual(1);
    const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } });
    expect(v.reservedQuantity).toBeLessThanOrEqual(v.stockQuantity);
    expect(await prisma.order.count()).toBe(v.reservedQuantity);
  });

  it("rejects products from unapproved shops and the buyer's own shop", async () => {
    const pending = await makeShop("PENDING");
    const p = await makeProduct(pending.shop.id, pending.category.id);
    const { buyer, address } = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 1 }]);
    await expect(placeOrder(buyer.id, { addressId: address.id, deliveryOption: "STANDARD" })).rejects.toThrow(/no longer available/);

    const own = await makeShop();
    const op = await makeProduct(own.shop.id, own.category.id);
    await expect(addToCart(own.owner.id, op.variants[0].id, 1)).rejects.toThrow(/own shop/);
  });

  it("will not use another user's address", async () => {
    const { shop, category } = await makeShop();
    const p = await makeProduct(shop.id, category.id);
    const a = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 1 }]);
    const b = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 1 }]);
    await expect(placeOrder(a.buyer.id, { addressId: b.address.id, deliveryOption: "STANDARD" })).rejects.toThrow(/address/);
  });

  it("cart view prices come from the database", async () => {
    const { shop, category } = await makeShop();
    const p = await makeProduct(shop.id, category.id, { price: 1200, salePrice: 999 });
    const { buyer } = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 3 }]);
    const view = await getCartView(buyer.id);
    expect(view.totals).toMatchObject({ subtotal: 2997, deliveryFee: 150, total: 3147 });
  });
});

describe("order lifecycle and role checks", () => {
  async function placed() {
    const { shop, category, owner } = await makeShop();
    const p = await makeProduct(shop.id, category.id, { stock: 5, price: 1000 });
    const { buyer, address } = await makeBuyerWithCart([{ variantId: p.variants[0].id, quantity: 2 }]);
    const [order] = await placeOrder(buyer.id, { addressId: address.id, deliveryOption: "STANDARD" });
    return { order, seller: owner, buyer: { ...buyer, shop: null }, variantId: p.variants[0].id };
  }

  it("seller moves an order to shipped; stock is committed and a rider assigned", async () => {
    const rider = await makeUser("DELIVERY", "Rider");
    const { order, seller, variantId } = await placed();
    await changeOrderStatus(seller, order.id, "CONFIRMED");
    await changeOrderStatus(seller, order.id, "PACKED");
    await changeOrderStatus(seller, order.id, "SHIPPED");
    expect(await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockQuantity: 3, reservedQuantity: 0 });
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(shipment.deliveryPartnerId).toBe(rider.id);
    const events = await prisma.orderStatusEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.status)).toEqual(["PENDING", "CONFIRMED", "PACKED", "SHIPPED"]);
    expect(events.every((e) => e.createdAt instanceof Date)).toBe(true);
  });

  it("other sellers, buyers and riders cannot move the order", async () => {
    const { order, buyer } = await placed();
    const other = await makeShop();
    await expect(changeOrderStatus(other.owner, order.id, "CONFIRMED")).rejects.toThrow(/not found/i);
    await expect(changeOrderStatus(buyer, order.id, "CONFIRMED")).rejects.toThrow(/cannot be moved/);
    const rider = await makeUser("DELIVERY");
    await expect(changeOrderStatus({ ...rider, shop: null }, order.id, "DELIVERED")).rejects.toThrow(/not found/i);
  });

  it("buyer cancellation releases reserved stock", async () => {
    const { order, buyer, variantId } = await placed();
    await changeOrderStatus(buyer, order.id, "CANCELLED", "changed mind");
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reservedQuantity).toBe(0);
    await expect(changeOrderStatus(buyer, order.id, "CONFIRMED")).rejects.toThrow();
  });

  it("delivery partner confirms with the customer code and COD is marked paid", async () => {
    const rider = await makeUser("DELIVERY", "Rider");
    const riderActor = { ...rider, shop: null };
    const { order, seller } = await placed();
    for (const s of ["CONFIRMED", "PACKED", "SHIPPED"] as const) await changeOrderStatus(seller, order.id, s);
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });

    const intruder = await makeUser("DELIVERY");
    await expect(updateShipment({ ...intruder, shop: null }, shipment.id, "PICKED_UP")).rejects.toThrow(/not found/i);
    await expect(confirmDelivery(riderActor, { shipmentId: shipment.id, code: order.deliveryCode, cashCollected: true, notes: "" })).rejects.toThrow(/out for delivery first/);

    await updateShipment(riderActor, shipment.id, "PICKED_UP");
    await updateShipment(riderActor, shipment.id, "OUT_FOR_DELIVERY");
    const wrong = order.deliveryCode === "1234" ? "4321" : "1234";
    await expect(confirmDelivery(riderActor, { shipmentId: shipment.id, code: wrong, cashCollected: true, notes: "" })).rejects.toThrow(/code/);
    await expect(confirmDelivery(riderActor, { shipmentId: shipment.id, code: order.deliveryCode, cashCollected: false, notes: "" })).rejects.toThrow(/cash/);
    await confirmDelivery(riderActor, { shipmentId: shipment.id, code: order.deliveryCode, cashCollected: true, notes: "Left with guard" });

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("DELIVERED");
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } })).status).toBe("PAID");
  });
});
