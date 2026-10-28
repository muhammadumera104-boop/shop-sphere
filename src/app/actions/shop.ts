"use server";
// Buyer-side actions: cart, wishlist, checkout, addresses, profile, reviews, returns, notifications.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, requestMeta, requireUser } from "@/lib/auth";
import { actionError, formObject, type ActionState, UserError } from "@/lib/actions";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/session";
import { saveUpload } from "@/lib/uploads";
import { addToCart, applyCoupon, removeCoupon, updateCartItem } from "@/lib/services/cart";
import { changeOrderStatus, placeOrder } from "@/lib/services/orders";
import { RETURN_WINDOW_DAYS } from "@/lib/constants";
import {
  addressSchema,
  cartAddSchema,
  cartUpdateSchema,
  checkoutSchema,
  couponApplySchema,
  passwordSchema,
  profileSchema,
  reportListingSchema,
  returnSchema,
  reviewSchema,
  ticketSchema,
} from "@/lib/validation";

async function buyerOrLogin(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.role !== "BUYER") throw new UserError("Only buyer accounts can shop. Log in with a buyer account.");
  return user;
}

export async function addToCartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await buyerOrLogin(String(fd.get("returnTo") ?? "/"));
    const input = cartAddSchema.parse(formObject(fd));
    await addToCart(user.id, input.variantId, input.quantity);
    if (fd.get("buyNow") === "1") redirect("/checkout");
    return { ok: true, message: "Added to cart." };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateCartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = cartUpdateSchema.parse(formObject(fd));
    await updateCartItem(user.id, input.itemId, input.quantity);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function applyCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const { ip } = await requestMeta();
    if (!rateLimit(`coupon:${user.id}:${ip}`, 10, 60_000).ok) throw new UserError("Too many attempts. Wait a minute.");
    const { code } = couponApplySchema.parse(formObject(fd));
    const discount = await applyCoupon(user.id, code);
    return { ok: true, message: `Coupon applied: you save Rs. ${discount.toLocaleString("en-PK")}.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function removeCouponAction(): Promise<ActionState> {
  try {
    const user = await requireUser();
    await removeCoupon(user.id);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function placeOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let first: number;
  try {
    const user = await requireUser();
    if (user.role !== "BUYER") throw new UserError("Only buyer accounts can place orders.");
    if (!rateLimit(`checkout:${user.id}`, 5, 60_000).ok) throw new UserError("Please wait a moment before placing another order.");
    const input = checkoutSchema.parse(formObject(fd));
    const orders = await placeOrder(user.id, input);
    first = orders[0].number;
  } catch (e) {
    return actionError(e);
  }
  redirect(`/account/orders/${first}?placed=1`);
}

export async function toggleWishlistAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await buyerOrLogin(String(fd.get("returnTo") ?? "/"));
    const productId = String(fd.get("productId") ?? "");
    const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
    if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
    else {
      const p = await prisma.product.findUnique({ where: { id: productId } });
      if (!p) throw new UserError("Product not found.");
      await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
    }
    return { ok: true, message: existing ? "Removed from wishlist." : "Saved to wishlist." };
  } catch (e) {
    return actionError(e);
  }
}

export async function moveToCartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const productId = String(fd.get("productId") ?? "");
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
    const variant = product?.variants.find((v) => v.stockQuantity - v.reservedQuantity > 0);
    if (!product || !variant) throw new UserError("This item is out of stock.");
    await addToCart(user.id, variant.id, 1);
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
    return { ok: true, message: "Moved to cart." };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Account ----------
export async function saveProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = profileSchema.parse(formObject(fd));
    await prisma.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone || null } });
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return actionError(e);
  }
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000).ok) throw new UserError("Too many attempts. Try again later.");
    const input = passwordSchema.parse(formObject(fd));
    if (!(await verifyPassword(input.current, user.passwordHash))) throw new UserError("Current password is incorrect.");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.password) } });
    return { ok: true, message: "Password changed." };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const { id, ...data } = addressSchema.parse(formObject(fd));
    await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: user.id } });
      const isDefault = data.isDefault || count === 0;
      if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      if (id) {
        const own = await tx.address.findFirst({ where: { id, userId: user.id } });
        if (!own) throw new UserError("Address not found.");
        await tx.address.update({ where: { id }, data: { ...data, isDefault: isDefault || own.isDefault } });
      } else {
        if (count >= 10) throw new UserError("You can save up to 10 addresses.");
        await tx.address.create({ data: { ...data, isDefault, userId: user.id } });
      }
    });
    return { ok: true, message: "Address saved." };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const id = String(fd.get("id") ?? "");
    const r = await prisma.address.deleteMany({ where: { id, userId: user.id } });
    if (r.count === 0) throw new UserError("Address not found.");
    const remaining = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } });
    if (remaining && !remaining.isDefault) await prisma.address.update({ where: { id: remaining.id }, data: { isDefault: true } });
    return { ok: true, message: "Address deleted." };
  } catch (e) {
    return actionError(e);
  }
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const orderId = String(fd.get("orderId") ?? "");
    const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: user.id } });
    if (!order) throw new UserError("Order not found.");
    await changeOrderStatus(user, orderId, "CANCELLED", "Cancelled by buyer");
    return { ok: true, message: "Order cancelled." };
  } catch (e) {
    return actionError(e);
  }
}

export async function submitReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = reviewSchema.parse(formObject(fd));
    const item = await prisma.orderItem.findFirst({ where: { id: input.orderItemId, order: { buyerId: user.id, status: "DELIVERED" } } });
    if (!item) throw new UserError("You can review only items that were delivered to you.");
    if (item.reviewed) throw new UserError("You already reviewed this item.");
    const photo = await saveUpload(fd.get("photo") as File | null, "reviews");
    await prisma.$transaction(async (tx) => {
      await tx.review.create({ data: { productId: item.productId, userId: user.id, orderItemId: item.id, rating: input.rating, comment: input.comment, photoUrl: photo, verified: true } });
      await tx.orderItem.update({ where: { id: item.id }, data: { reviewed: true } });
      const agg = await tx.review.aggregate({ where: { productId: item.productId }, _avg: { rating: true }, _count: true });
      await tx.product.update({ where: { id: item.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
    });
    return { ok: true, message: "Thanks! Your review is live." };
  } catch (e) {
    return actionError(e);
  }
}

export async function requestReturnAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = returnSchema.parse(formObject(fd));
    const item = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId, order: { buyerId: user.id, status: "DELIVERED" } },
      include: { order: { include: { events: true, shop: true } } },
    });
    if (!item) throw new UserError("Only delivered items can be returned.");
    const deliveredAt = item.order.events.find((e) => e.status === "DELIVERED")?.createdAt ?? item.order.updatedAt;
    if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_DAYS * 86400_000) throw new UserError(`Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery.`);
    const open = await prisma.returnRequest.findFirst({ where: { orderItemId: item.id, status: { in: ["REQUESTED", "APPROVED"] } } });
    if (open) throw new UserError("A return for this item is already in progress.");
    const evidence = await saveUpload(fd.get("evidence") as File | null, "returns");
    await prisma.returnRequest.create({
      data: {
        orderId: item.orderId,
        userId: user.id,
        orderItemId: item.id,
        reason: input.reason,
        description: input.description,
        evidenceUrl: evidence,
        history: JSON.stringify([{ status: "REQUESTED", at: new Date().toISOString() }]),
      },
    });
    await prisma.notification.create({ data: { userId: item.order.shop.ownerId, title: `Return requested for #${item.order.number}`, body: input.reason, link: "/seller/orders?tab=RETURNS" } });
    return { ok: true, message: "Return requested. The seller will respond soon." };
  } catch (e) {
    return actionError(e);
  }
}

export async function openTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const input = ticketSchema.parse(formObject(fd));
    const order = await prisma.order.findFirst({ where: { id: input.orderId, buyerId: user.id } });
    if (!order) throw new UserError("Order not found.");
    await prisma.supportTicket.create({
      data: { userId: user.id, orderId: order.id, type: "DISPUTE", issue: input.issue, messages: { create: { authorId: user.id, body: input.message } } },
    });
    return { ok: true, message: "Our support team has your request. We will reply in your notifications." };
  } catch (e) {
    return actionError(e);
  }
}

export async function reportListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!rateLimit(`report:${user.id}`, 5, 60 * 60_000).ok) throw new UserError("You have sent many reports. Try again later.");
    const input = reportListingSchema.parse(formObject(fd));
    await prisma.listingReport.create({ data: { productId: input.productId, reporterId: user.id, reason: input.reason } });
    return { ok: true, message: "Thanks, our team will review this listing." };
  } catch (e) {
    return actionError(e);
  }
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
