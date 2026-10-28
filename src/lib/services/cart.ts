import { prisma } from "../db";
import { parseJson } from "../format";
import { computeTotals, effectivePrice, type CouponRule, type DeliveryOption, type PricedLine } from "../pricing";
import { isPubliclyVisible } from "../permissions";
import { getFeeConfig } from "../settings";
import { UserError } from "../actions";

export function toCouponRule(c: {
  code: string;
  shopId: string;
  type: string;
  value: number;
  minSpend: number;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  productIds: string;
}): CouponRule {
  return { ...c, productIds: parseJson<string[]>(c.productIds, []) };
}

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            include: { shop: { select: { id: true, name: true, slug: true, status: true } }, images: { take: 1 } },
          },
        },
      },
    },
  },
};

/** Server-priced view of the user's cart. Prices always come from the database. */
export async function getCartView(userId: string, option: DeliveryOption = "STANDARD") {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  const items = (cart?.items ?? []).map((i) => {
    const p = i.variant.product;
    const available = Math.max(0, i.variant.stockQuantity - i.variant.reservedQuantity);
    return {
      id: i.id,
      quantity: i.quantity,
      variantId: i.variantId,
      variantName: i.variant.name,
      product: p,
      unitPrice: effectivePrice(p),
      available,
      purchasable: isPubliclyVisible(p) && available >= i.quantity,
    };
  });
  const lines: PricedLine[] = items
    .filter((i) => i.purchasable)
    .map((i) => ({ shopId: i.product.shopId, productId: i.product.id, variantId: i.variantId, unitPrice: i.unitPrice, quantity: i.quantity }));
  const coupon = cart?.couponCode ? await prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
  const totals = computeTotals(lines, { coupon: coupon ? toCouponRule(coupon) : null, option, fees: await getFeeConfig() });
  return { cartId: cart?.id ?? null, couponCode: cart?.couponCode ?? null, items, totals, count: items.reduce((s, i) => s + i.quantity, 0) };
}

export async function cartCount(userId: string): Promise<number> {
  const r = await prisma.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return r._sum.quantity ?? 0;
}

export async function addToCart(userId: string, variantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { include: { shop: true } } } });
  if (!variant || !isPubliclyVisible(variant.product)) throw new UserError("This product is not available.");
  if (variant.product.shop.ownerId === userId) throw new UserError("You cannot buy from your own shop.");
  const cart = await prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const next = Math.min(20, (existing?.quantity ?? 0) + quantity);
  const available = variant.stockQuantity - variant.reservedQuantity;
  if (next > available) throw new UserError(available > 0 ? `Only ${available} left in stock.` : "This item is out of stock.");
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: next },
    update: { quantity: next },
  });
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } }, include: { variant: true } });
  if (!item) throw new UserError("Item not found in your cart.");
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const available = item.variant.stockQuantity - item.variant.reservedQuantity;
  if (quantity > available) throw new UserError(`Only ${available} left in stock.`);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function applyCoupon(userId: string, code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new UserError("Coupon code not found.");
  const view = await getCartView(userId);
  const lines = view.items
    .filter((i) => i.purchasable)
    .map((i) => ({ shopId: i.product.shopId, productId: i.product.id, variantId: i.variantId, unitPrice: i.unitPrice, quantity: i.quantity }));
  const t = computeTotals(lines, { coupon: toCouponRule(coupon), option: "STANDARD", fees: await getFeeConfig() });
  if (t.couponError) throw new UserError(t.couponError);
  await prisma.cart.update({ where: { userId }, data: { couponCode: code } });
  return t.discount;
}

export async function removeCoupon(userId: string) {
  await prisma.cart.updateMany({ where: { userId }, data: { couponCode: null } });
}
