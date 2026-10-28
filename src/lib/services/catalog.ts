import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { effectivePrice } from "../pricing";
import { getFeeConfig } from "../settings";

/** Only approved shops' active, non-removed products are public. */
export const publicProductWhere: Prisma.ProductWhereInput = {
  status: "ACTIVE",
  moderation: "OK",
  shop: { status: "APPROVED" },
};

export const cardInclude = {
  shop: { select: { name: true, slug: true, status: true } },
  variants: { select: { id: true, name: true, stockQuantity: true, reservedQuantity: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function availableStock(p: { variants: { stockQuantity: number; reservedQuantity: number }[] }): number {
  return p.variants.reduce((s, v) => s + Math.max(0, v.stockQuantity - v.reservedQuantity), 0);
}

export type SearchParams = {
  q?: string;
  categorySlug?: string;
  min?: number;
  max?: number;
  rating?: number;
  brands?: string[];
  inStock?: boolean;
  onSale?: boolean;
  freeDelivery?: boolean;
  discount?: number;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  perPage?: number;
  shopId?: string;
};

/**
 * Search with filters. Price filters use the effective (sale) price, so they are applied in memory
 * after a DB pre-filter; the catalogue is small enough for this. Swap for SQL/full-text search at scale.
 */
export async function searchProducts(params: SearchParams) {
  const perPage = params.perPage ?? 12;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ProductWhereInput = { ...publicProductWhere };
  const and: Prisma.ProductWhereInput[] = [];
  if (params.q) {
    const words = params.q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      and.push({
        OR: [
          { title: { contains: w } },
          { brand: { contains: w } },
          { description: { contains: w } },
          { shop: { name: { contains: w } } },
          { category: { name: { contains: w } } },
        ],
      });
    }
  }
  let category = null;
  if (params.categorySlug) {
    category = await prisma.category.findUnique({ where: { slug: params.categorySlug }, include: { children: true } });
    if (category) and.push({ categoryId: { in: [category.id, ...category.children.map((c) => c.id)] } });
  }
  if (params.shopId) and.push({ shopId: params.shopId });
  if (params.rating) and.push({ ratingAvg: { gte: params.rating } });
  if (params.brands?.length) and.push({ brand: { in: params.brands } });
  if (and.length) where.AND = and;

  const all = await prisma.product.findMany({ where, include: cardInclude, orderBy: { createdAt: "desc" } });
  const fees = params.freeDelivery ? await getFeeConfig() : null;

  let rows = all.filter((p) => {
    const price = effectivePrice(p);
    if (params.min != null && price < params.min) return false;
    if (params.max != null && params.max > 0 && price > params.max) return false;
    if (params.inStock && availableStock(p) <= 0) return false;
    if (params.onSale && price >= p.price) return false;
    if (params.discount && Math.round(((p.price - price) / p.price) * 100) < params.discount) return false;
    if (fees && fees.freeThreshold > 0 && price < fees.freeThreshold) return false;
    return true;
  });

  switch (params.sort) {
    case "price_asc":
      rows = rows.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price_desc":
      rows = rows.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case "rating":
      rows = rows.sort((a, b) => b.ratingAvg - a.ratingAvg);
      break;
    case "newest":
      break;
    default:
      // relevance: featured and better rated first
      rows = rows.sort((a, b) => Number(b.featured) - Number(a.featured) || b.ratingAvg - a.ratingAvg);
  }

  const total = rows.length;
  const brands = [...new Set(all.map((p) => p.brand).filter(Boolean))].sort();
  return {
    category,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    items: rows.slice((page - 1) * perPage, page * perPage),
    brands,
  };
}

export async function getCategoriesForNav() {
  return prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } });
}
