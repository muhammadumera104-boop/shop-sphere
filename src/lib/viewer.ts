import { prisma } from "./db";
import { getCurrentUser } from "./auth";

/** Product ids in the current viewer's wishlist (empty for guests). */
export async function wishedIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const rows = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
