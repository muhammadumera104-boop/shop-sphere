"use server";
// Seller Mode actions. Every action calls requireSeller() and checks that records belong to the seller's shop.
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSeller, requireUser } from "@/lib/auth";
import { actionError, formObject, type ActionState, UserError } from "@/lib/actions";
import { slugify, parseJson } from "@/lib/format";
import { saveUpload } from "@/lib/uploads";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { changeOrderStatus, applyOrderStatus } from "@/lib/services/orders";
import { bulkStockSchema, couponSchema, orderStatusSchema, productSchema, productStatusSchema, shopSchema, shopSettingsSchema, stockAdjustSchema } from "@/lib/validation";
import type { OrderStatus } from "@/lib/constants";

async function uniqueSlug(base: string, model: "product" | "shop", excludeId?: string) {
  let slug = slugify(base) || "item";
  for (let i = 0; i < 5; i++) {
    const hit = model === "product" ? await prisma.product.findUnique({ where: { slug } }) : await prisma.shop.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${slugify(base)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  return `${slugify(base)}-${crypto.randomBytes(4).toString("hex")}`;
}

async function ownProduct(shopId: string, productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true, images: true } });
  if (!p || p.shopId !== shopId) throw new UserError("Product not found.");
  return p;
}

// ---------- Shop ----------
export async function openShopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (user.role !== "BUYER") throw new UserError("Admin and delivery accounts cannot open shops.");
    if (user.shop) throw new UserError("You already have a shop.");
    const input = shopSchema.parse(formObject(fd));
    if (!input.cnic) throw new UserError("Enter your CNIC for verification.");
    const shop = await prisma.shop.create({ data: { ...input, cnic: input.cnic, ownerId: user.id, slug: await uniqueSlug(input.name, "shop"), status: "PENDING" } });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) await notify(a.id, { kind: "ACCOUNT", title: "New seller application", body: shop.name, link: "/admin/sellers" });
  } catch (e) {
    return actionError(e);
  }
  redirect("/seller?welcome=1");
}

export async function saveShopSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = shopSettingsSchema.parse(formObject(fd));
    const logoUrl = await saveUpload(fd.get("logo") as File | null, "shops");
    const bannerUrl = await saveUpload(fd.get("banner") as File | null, "shops");
    const featured = fd.getAll("featured").map(String);
    await prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id: user.shop.id }, data: { ...input, ...(logoUrl ? { logoUrl } : {}), ...(bannerUrl ? { bannerUrl } : {}) } });
      await tx.product.updateMany({ where: { shopId: user.shop.id }, data: { featured: false } });
      if (featured.length) await tx.product.updateMany({ where: { shopId: user.shop.id, id: { in: featured.slice(0, 8) } }, data: { featured: true } });
    });
    return { ok: true, message: "Shop settings saved." };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Products ----------
function readProductForm(fd: FormData) {
  const o = formObject(fd);
  const variants: { id?: string; name: string; stockQuantity: string }[] = [];
  const specs: { key: string; value: string }[] = [];
  for (let i = 0; i < 20; i++) {
    if (o[`v${i}.name`] !== undefined) variants.push({ id: o[`v${i}.id`] || undefined, name: o[`v${i}.name`], stockQuantity: o[`v${i}.stock`] || "0" });
    if (o[`s${i}.key`]?.trim() && o[`s${i}.value`]?.trim()) specs.push({ key: o[`s${i}.key`], value: o[`s${i}.value`] });
  }
  return productSchema.parse({ ...o, variants, specs });
}

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireSeller();
    const input = readProductForm(fd);
    const intent = String(fd.get("intent") ?? "");
    const status = intent === "draft" ? "DRAFT" : input.status;
    const productId = String(fd.get("productId") ?? "") || undefined;
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !category.isActive) throw new UserError("Choose a valid category.");
    const dupSku = await prisma.product.findFirst({ where: { shopId: user.shop.id, sku: input.sku, NOT: productId ? { id: productId } : undefined } });
    if (dupSku) throw new UserError("Another product in your shop already uses this SKU.");
    const files = fd.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0).slice(0, 4);
    const uploaded: string[] = [];
    for (const f of files) {
      const url = await saveUpload(f, "products");
      if (url) uploaded.push(url);
    }
    const removeImages = fd.getAll("removeImage").map(String);
    const data = {
      title: input.title,
      categoryId: input.categoryId,
      brand: input.brand,
      condition: input.condition,
      description: input.description,
      price: input.price,
      salePrice: input.salePrice,
      sku: input.sku,
      status,
      lowStockThreshold: input.lowStockThreshold,
      gradient: input.gradient,
      featured: input.featured,
      specs: JSON.stringify(input.specs),
    };
    if (productId) {
      const existing = await ownProduct(user.shop.id, productId);
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: productId }, data: { ...data, slug: existing.title === input.title ? existing.slug : await uniqueSlug(input.title, "product", productId) } });
        const keep = new Set(input.variants.filter((v) => v.id).map((v) => v.id!));
        for (const v of existing.variants) {
          if (keep.has(v.id)) continue;
          const used = await tx.orderItem.count({ where: { variantId: v.id } });
          if (used > 0 || v.reservedQuantity > 0) throw new UserError(`Variant "${v.name}" has orders and cannot be removed. Set its stock to 0 instead.`);
          await tx.productVariant.delete({ where: { id: v.id } });
        }
        for (const v of input.variants) {
          if (v.id) {
            const ev = existing.variants.find((x) => x.id === v.id);
            if (!ev) throw new UserError("Variant not found.");
            if (v.stockQuantity < ev.reservedQuantity) throw new UserError(`Stock for "${v.name}" cannot be below the ${ev.reservedQuantity} units reserved by open orders.`);
            await tx.productVariant.update({ where: { id: v.id }, data: { name: v.name, stockQuantity: v.stockQuantity } });
          } else {
            await tx.productVariant.create({ data: { productId, name: v.name, stockQuantity: v.stockQuantity } });
          }
        }
        if (removeImages.length) await tx.productImage.deleteMany({ where: { productId, id: { in: removeImages } } });
        const count = await tx.productImage.count({ where: { productId } });
        if (count + uploaded.length > 6) throw new UserError("A product can have up to 6 images.");
        for (const [i, url] of uploaded.entries()) await tx.productImage.create({ data: { productId, url, sortOrder: count + i } });
      });
      id = productId;
    } else {
      const created = await prisma.product.create({
        data: {
          ...data,
          shopId: user.shop.id,
          slug: await uniqueSlug(input.title, "product"),
          variants: { create: input.variants.map((v) => ({ name: v.name, stockQuantity: v.stockQuantity })) },
          images: { create: uploaded.map((url, i) => ({ url, sortOrder: i })) },
        },
      });
      id = created.id;
    }
  } catch (e) {
    return actionError(e);
  }
  redirect(`/seller/products/${id}?saved=1`);
}

export async function productStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = productStatusSchema.parse(formObject(fd));
    const p = await ownProduct(user.shop.id, input.productId);
    if (input.status === "ACTIVE" && p.moderation === "REMOVED") throw new UserError("This listing was removed by moderation and cannot be activated.");
    await prisma.product.update({ where: { id: p.id }, data: { status: input.status } });
    return { ok: true, message: `Product ${input.status.toLowerCase()}.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function duplicateProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const p = await ownProduct(user.shop.id, String(fd.get("productId") ?? ""));
    const sku = `${p.sku}-COPY-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    await prisma.product.create({
      data: {
        shopId: p.shopId,
        categoryId: p.categoryId,
        title: `${p.title} (copy)`,
        slug: await uniqueSlug(`${p.title} copy`, "product"),
        description: p.description,
        brand: p.brand,
        condition: p.condition,
        price: p.price,
        salePrice: p.salePrice,
        sku,
        status: "DRAFT",
        gradient: p.gradient,
        specs: p.specs,
        lowStockThreshold: p.lowStockThreshold,
        variants: { create: p.variants.map((v) => ({ name: v.name, stockQuantity: 0 })) },
      },
    });
    return { ok: true, message: "Draft copy created." };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Inventory ----------
export async function adjustStockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = stockAdjustSchema.parse(formObject(fd));
    const v = await prisma.productVariant.findUnique({ where: { id: input.variantId }, include: { product: true } });
    if (!v || v.product.shopId !== user.shop.id) throw new UserError("Variant not found.");
    const next = v.stockQuantity + input.delta;
    if (next < v.reservedQuantity) throw new UserError(`Stock cannot go below ${v.reservedQuantity} (reserved by open orders).`);
    // Conditional update so concurrent checkouts cannot push available stock negative.
    const n = await prisma.$executeRaw`UPDATE "ProductVariant" SET "stockQuantity" = "stockQuantity" + ${input.delta}
      WHERE "id" = ${v.id} AND "stockQuantity" + ${input.delta} >= "reservedQuantity"`;
    if (n !== 1) throw new UserError("Stock changed meanwhile. Refresh and try again.");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function bulkStockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const rows = [...fd.entries()].filter(([k]) => k.startsWith("stock:")).map(([k, v]) => ({ variantId: k.slice(6), stockQuantity: String(v) }));
    const input = bulkStockSchema.parse({ rows });
    let changed = 0;
    await prisma.$transaction(async (tx) => {
      for (const r of input.rows) {
        const v = await tx.productVariant.findUnique({ where: { id: r.variantId }, include: { product: true } });
        if (!v || v.product.shopId !== user.shop.id) throw new UserError("Variant not found.");
        if (v.stockQuantity === r.stockQuantity) continue;
        if (r.stockQuantity < v.reservedQuantity) throw new UserError(`"${v.product.title} (${v.name})" cannot go below ${v.reservedQuantity} reserved units.`);
        await tx.productVariant.update({ where: { id: v.id }, data: { stockQuantity: r.stockQuantity } });
        changed++;
      }
    });
    return { ok: true, message: changed ? `Updated ${changed} item${changed > 1 ? "s" : ""}.` : "No changes." };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Orders ----------
export async function sellerOrderStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = orderStatusSchema.parse(formObject(fd));
    const order = await prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order || order.shopId !== user.shop.id) throw new UserError("Order not found.");
    await changeOrderStatus(user, input.orderId, input.status as OrderStatus, input.note);
    return { ok: true, message: `Order #${order.number} updated.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function returnDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const id = String(fd.get("returnId") ?? "");
    const decision = String(fd.get("decision") ?? "");
    const r = await prisma.returnRequest.findUnique({ where: { id }, include: { order: true } });
    if (!r || r.order.shopId !== user.shop.id) throw new UserError("Return request not found.");
    const next = decision === "approve" ? "APPROVED" : decision === "reject" ? "REJECTED" : decision === "refund" ? "REFUNDED" : null;
    if (!next) throw new UserError("Unknown decision.");
    const allowed: Record<string, string[]> = { REQUESTED: ["APPROVED", "REJECTED"], APPROVED: ["REFUNDED"] };
    if (!allowed[r.status]?.includes(next)) throw new UserError(`A ${r.status.toLowerCase()} request cannot be ${next.toLowerCase()}.`);
    const history = [...parseJson<{ status: string; at: string }[]>(r.history, []), { status: next, at: new Date().toISOString() }];
    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({ where: { id }, data: { status: next, history: JSON.stringify(history) } });
      if (next === "REFUNDED" && r.order.status === "DELIVERED") await applyOrderStatus(tx, r.orderId, "RETURNED", user.id, `Return refunded: ${r.reason}`);
      await notify(r.userId, { title: `Return for #${r.order.number}: ${next.toLowerCase()}`, body: r.reason, link: "/account/returns" }, tx);
    });
    return { ok: true, message: `Return ${next.toLowerCase()}.` };
  } catch (e) {
    return actionError(e);
  }
}

// ---------- Promotions ----------
export async function createCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const input = couponSchema.parse({ ...formObject(fd), productIds: fd.getAll("productIds").map(String) });
    const settings = await getSettings();
    const maxPct = Number(settings.maxDiscountPercent);
    if (input.type === "PERCENT" && input.value > maxPct) throw new UserError(`Platform rules allow at most ${maxPct}% off.`);
    if (await prisma.coupon.findUnique({ where: { code: input.code } })) throw new UserError("This coupon code is already taken.");
    if (input.productIds.length) {
      const own = await prisma.product.count({ where: { id: { in: input.productIds }, shopId: user.shop.id } });
      if (own !== input.productIds.length) throw new UserError("Choose only your own products.");
    }
    await prisma.coupon.create({
      data: { ...input, startsAt: new Date(input.startsAt.getTime() - 12 * 3600_000), endsAt: new Date(input.endsAt.getTime() + 12 * 3600_000 - 1000), productIds: JSON.stringify(input.productIds), shopId: user.shop.id },
    });
    return { ok: true, message: `Coupon ${input.code} created.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function toggleCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireSeller();
    const c = await prisma.coupon.findUnique({ where: { id: String(fd.get("couponId") ?? "") } });
    if (!c || c.shopId !== user.shop.id) throw new UserError("Coupon not found.");
    await prisma.coupon.update({ where: { id: c.id }, data: { isActive: !c.isActive } });
    return { ok: true, message: c.isActive ? "Coupon paused." : "Coupon activated." };
  } catch (e) {
    return actionError(e);
  }
}
